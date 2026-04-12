#!/usr/bin/env python3
"""
Batch PDF → Markdown for RAG using Chandra OCR 2 (HuggingFace `datalab-to/chandra-ocr-2`
by default) with per-page filtering and post-processing.

Exercise extraction
-------------------
* Blacklist pages (intros / front matter): drop any page whose OCR text contains one of
  Lời nói đầu, Bạn đọc thân mến, Nhóm tác giả, Mục lục, Table of Contents (case-folded
  where appropriate).
* Dynamic start (only when PDF_EXPORT_MODE=exercises): walk pages in order; skip pages until
  exam cues (Mark the letter…, Question 1:, Câu 1:, …) or dense A./B./C./D. lines; then keep
  subsequent non-blacklisted pages.

Export scope
-------------
* PDF_EXPORT_MODE=full (default): every page is OCR’d → one complete `.md` per PDF (matches
  all files in data_input with counterparts in data_output).
* PDF_EXPORT_MODE=exercises: apply blacklist + dynamic start (smaller files, not “full book”).

Memory / VRAM
--------------
* Pages are rendered and OCR’d one at a time (no giant list of all page images in RAM).
* Kept page Markdown is streamed to disk as each page finishes (no full-book `per_page` list
  during OCR). The output `.md` is created only when the first kept page is ready — page 1
  OCR on GPU can take many minutes; watch the log line “Raster + Chandra OCR starting page”.
  After each PDF, the file is read once for highlights + MCQ post-process.
* Throughput: on ~8 GiB GPUs, Chandra HF is often **~1–5+ minutes per page** (first page
  slower). A “few lines” in the file usually means **only one short page** finished, not a bug.
  Lower `CHANDRA_IMAGE_DPI` (e.g. 96) or keep `PDF_CONSERVE_VRAM=1` to bias toward speed.
* Default raster caps (before any `chandra` import): MIN_PDF_IMAGE_DIM=896, IMAGE_DPI=144 —
  override with env for sharper scans if you have VRAM headroom.
* PDF_CONSERVE_VRAM=1: if you did not set CHANDRA_* raster vars, defaults become 768 / 120
  (less GPU memory per page, often faster — good on ~8 GiB cards).
* PDF_GC_EVERY=8 (default): run Python gc.collect() every N OCR pages — avoids calling gc
  after every page (which can freeze Windows). Set 0 to disable periodic gc (still runs
  lightly at end of each PDF / file).
* PDF_TQDM_MININTERVAL=0.35: minimum seconds between progress-bar redraws (less console I/O).
* PDF_MAX_PRIORITY=1 (Windows): skip BELOW_NORMAL process priority and BLAS/torch CPU caps
  (max throughput, may make the PC feel stuck).

Output cleanup
---------------
* All Markdown image syntax `![](…)` / `![alt](url)` is removed with regex before save.
* Optional `post_process_markdown` keeps THPT-style MCQ/passage layout without touching
  `<mark>` wrappers when highlight mode is on.

Install (Windows + GPU, Python 3.12 venv): use requirements-pdf.txt — it pins
`torch==2.7.0+cu128` via the official CUDA 12.8 wheel index so Chandra runs on the GPU.

Environment (common)
--------------------
  TORCH_DEVICE=cuda|cuda:0|cpu   default cuda → normalized to cuda:0 for Chandra’s HF
                                   `device_map` (single GPU, ~8 GiB: keep batch 1)
  ALLOW_CPU=1                    if CUDA is unavailable, allow CPU fallback instead of exiting
  MODEL_CHECKPOINT=…             default `datalab-to/chandra-ocr-2`
  CHANDRA_METHOD=hf|vllm         default hf
  CHANDRA_BATCH_SIZE=1           pages per `generate()` call; use 1 on 8 GB VRAM
  GPU_CACHE_CLEAR=1              default on: empty CUDA cache between batches / PDFs
  APPLY_HIGHLIGHTS=1             PyMuPDF <mark> pass (default on)
  PDF_EXPORT_MODE=full|exercises default full = complete book per PDF
  CHANDRA_IMAGE_DPI / CHANDRA_MIN_PDF_IMAGE_DIM  optional overrides (mapped to IMAGE_DPI /
                              MIN_PDF_IMAGE_DIM before Chandra loads)
  PDF_CONSERVE_VRAM=1         optional lower default DPI/min dim when CHANDRA_* unset (speed / VRAM)
  PDF_GC_EVERY / PDF_TQDM_MININTERVAL / PDF_MAX_PRIORITY  see “Memory / VRAM” above
  STRICT_OUTPUT=1             exit code 1 if any expected .md is missing or zero bytes
"""

from __future__ import annotations

import gc
import logging
import os
import time
from pathlib import Path
from typing import Any, List

from config import PipelineConfig, truthy_env
from ocr_engine import (
    build_chandra_manager,
    chandra_ocr_images,
    clear_cuda_memory,
    configure_torch_env,
    iter_pdf_pages_rgb,
    log_runtime_device,
    pdf_page_count,
)
from text_cleaner import (
    StreamingFilterState,
    apply_highlight_marks,
    extract_highlight_segments,
    nfc,
    post_process_markdown,
    streaming_should_keep_page,
    strip_markdown_images,
)

LOG = logging.getLogger("process_pdfs")


def _set_windows_background_priority() -> None:
    """Keep the desktop usable while OCR runs (Windows)."""
    if os.name != "nt" or truthy_env("PDF_MAX_PRIORITY"):
        return
    try:
        import ctypes

        below = 0x00004000  # BELOW_NORMAL_PRIORITY_CLASS
        k32 = ctypes.windll.kernel32
        k32.SetPriorityClass(k32.GetCurrentProcess(), below)
        LOG.info("Windows process priority: BELOW_NORMAL (use PDF_MAX_PRIORITY=1 to disable).")
    except Exception as exc:  # noqa: BLE001
        LOG.debug("SetPriorityClass skipped: %s", exc)


def collect_pdfs(input_dir: Path) -> List[Path]:
    paths: List[Path] = []
    for ext in ("*.pdf", "*.PDF"):
        paths.extend(sorted(input_dir.glob(ext)))
    return sorted(set(paths), key=lambda p: p.name.lower())


def log_export_summary(
    pdfs: List[Path],
    output_dir: Path,
    *,
    export_mode: str,
    strict_output: bool,
) -> int:
    """
    Compare data_input PDFs to data_output/*.md. Returns 1 if STRICT_OUTPUT and any
    expected file is missing or empty; otherwise 0.
    """
    missing: list[str] = []
    empty: list[str] = []
    ok: list[str] = []
    for p in pdfs:
        md = output_dir / f"{p.stem}.md"
        if not md.is_file():
            missing.append(p.name)
        elif md.stat().st_size == 0:
            empty.append(p.name)
        else:
            ok.append(p.name)
    LOG.info(
        "Summary: PDF_EXPORT_MODE=%s — %d/%d markdown files OK in %s (missing=%d, empty=%d).",
        export_mode,
        len(ok),
        len(pdfs),
        output_dir,
        len(missing),
        len(empty),
    )
    if missing:
        LOG.warning(
            "Missing .md for: %s",
            "; ".join(missing[:20]) + (" …" if len(missing) > 20 else ""),
        )
    if empty:
        LOG.warning(
            "Zero-byte .md: %s",
            "; ".join(empty[:20]) + (" …" if len(empty) > 20 else ""),
        )
    if strict_output and (missing or empty):
        LOG.error("STRICT_OUTPUT=1: failing because some outputs are missing or empty.")
        return 1
    return 0


def process_one_pdf(
    pdf_path: Path,
    output_dir: Path,
    manager: Any,
    config: PipelineConfig,
    *,
    apply_highlights: bool = True,
) -> None:
    from tqdm import tqdm

    stem = pdf_path.stem
    out_path = output_dir / f"{stem}.md"
    export_mode = config.export_mode

    n_pages = pdf_page_count(pdf_path)
    if n_pages == 0:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text("", encoding="utf-8")
        clear_cuda_memory(sync=True, config=config)
        return

    filter_state = StreamingFilterState()
    ocr_page_count = 0

    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        if out_path.exists():
            out_path.unlink()
    except OSError:
        pass
    # Open out_path only when the first kept page is ready — avoids a 0-byte file sitting
    # in Explorer for many minutes while Chandra runs on page 1 (often 5–15+ min on 8 GB).
    out_f: Any = None
    wrote_kept = False
    kept_write_count = 0
    try:
        page_iter = iter_pdf_pages_rgb(pdf_path)
        with tqdm(
            page_iter,
            total=n_pages,
            desc=f"pages:{stem[:28]}",
            unit="pg",
            leave=False,
            mininterval=config.pdf_tqdm_mininterval,
        ) as pbar:
            for pno, pil in pbar:
                pbar.set_postfix_str(f"page {pno + 1}/{n_pages}")
                LOG.info(
                    "Raster + Chandra OCR starting page %d/%d — %s",
                    pno + 1,
                    n_pages,
                    stem[:60] + ("…" if len(stem) > 60 else ""),
                )
                outs = chandra_ocr_images(
                    manager,
                    [pil],
                    batch_size=config.chandra_batch_size,
                    config=config,
                )
                raw_md = outs[0] if outs else ""
                del outs
                ocr_page_count += 1
                ge = config.pdf_gc_every
                if ge > 0 and ocr_page_count % ge == 0:
                    gc.collect()

                keep, _ = streaming_should_keep_page(
                    raw_md,
                    export_mode=export_mode,
                    state=filter_state,
                )
                if not keep:
                    del raw_md, pil
                    clear_cuda_memory(sync=False, config=config)
                    time.sleep(0)
                    continue

                page_src = raw_md.strip() if export_mode == "full" else raw_md
                del raw_md
                chunk = strip_markdown_images(page_src)
                del page_src
                if out_f is None:
                    out_f = open(out_path, "w", encoding="utf-8")
                else:
                    out_f.write("\n\n---\n\n")
                out_f.write(chunk)
                out_f.flush()
                wrote_kept = True
                kept_write_count += 1
                try:
                    nbytes = out_path.stat().st_size
                except OSError:
                    nbytes = -1
                nlines = len(chunk.splitlines())
                LOG.info(
                    "Kept page flush: OCR pass %d/%d, kept #%d — %s ~%d lines this slice, file %d bytes",
                    ocr_page_count,
                    n_pages,
                    kept_write_count,
                    out_path.name,
                    nlines,
                    nbytes,
                )
                del chunk, pil
                clear_cuda_memory(sync=False, config=config)
                time.sleep(0)
    finally:
        if out_f is not None:
            try:
                out_f.close()
            except Exception:  # noqa: BLE001
                pass
        clear_cuda_memory(sync=True, config=config)
        gc.collect()

    if not wrote_kept:
        out_path.write_text("", encoding="utf-8")

    md = nfc(out_path.read_text(encoding="utf-8"))

    if export_mode == "exercises" and not md.strip():
        LOG.warning(
            "%s: no pages kept after blacklist / exam-start filter (%d OCR pages).",
            pdf_path.name,
            ocr_page_count,
        )

    if apply_highlights:
        try:
            segs = extract_highlight_segments(pdf_path)
            md = apply_highlight_marks(md, segs)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Highlight pass failed for %s: %s", pdf_path.name, exc)

    md = post_process_markdown(md)
    out_path.write_text(md, encoding="utf-8")
    del md
    clear_cuda_memory(sync=True, config=config)
    gc.collect()


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    _set_windows_background_priority()
    root = Path(__file__).resolve().parent
    config = PipelineConfig.from_env(root)

    try:
        torch_device = configure_torch_env(config)
    except RuntimeError as e:
        LOG.error("%s", e)
        return 1

    input_dir = config.input_dir
    output_dir = config.output_dir

    if not input_dir.is_dir():
        LOG.error("Input directory missing: %s", input_dir)
        return 1

    output_dir.mkdir(parents=True, exist_ok=True)
    pdfs = collect_pdfs(input_dir)
    if not pdfs:
        LOG.warning("No PDF files found in %s", input_dir)
        return 0

    try:
        from tqdm import tqdm
    except ImportError:
        LOG.error("Please install tqdm: pip install tqdm")
        return 1

    os.environ["MODEL_CHECKPOINT"] = config.model_checkpoint
    os.environ["CHANDRA_METHOD"] = config.chandra_method

    try:
        manager = build_chandra_manager(config)
    except Exception as exc:  # noqa: BLE001
        LOG.exception("Could not initialize Chandra: %s", exc)
        return 1

    log_runtime_device(manager, torch_device)

    LOG.info(
        "Chandra method=%s batch_size=%s TORCH_DEVICE=%s MODEL_CHECKPOINT=%s "
        "PDF_EXPORT_MODE=%s APPLY_HIGHLIGHTS=%s GPU_CACHE_CLEAR=%s ALLOW_CPU=%s "
        "PDF_CONSERVE_VRAM=%s CHANDRA_IMAGE_DPI=%s CHANDRA_MIN_PDF_IMAGE_DIM=%s "
        "PDF_GC_EVERY=%s PDF_TQDM_MININTERVAL=%s",
        config.chandra_method,
        config.chandra_batch_size,
        torch_device,
        config.model_checkpoint,
        config.export_mode,
        config.apply_highlights,
        config.gpu_cache_clear,
        config.allow_cpu,
        config.conserve_vram,
        config.chandra_image_dpi,
        config.chandra_min_pdf_image_dim,
        config.pdf_gc_every,
        config.pdf_tqdm_mininterval,
    )
    if config.conserve_vram and config.chandra_batch_size > 1:
        LOG.warning(
            "PDF_CONSERVE_VRAM=1 but CHANDRA_BATCH_SIZE=%s — batch>1 raises OOM risk on many GPUs.",
            config.chandra_batch_size,
        )

    outer_min = max(1.0, float(config.pdf_tqdm_mininterval) * 2.0)
    for pdf_path in tqdm(
        pdfs,
        desc="PDFs",
        unit="file",
        mininterval=outer_min,
    ):
        try:
            process_one_pdf(
                pdf_path,
                output_dir,
                manager,
                config,
                apply_highlights=config.apply_highlights,
            )
        except Exception as exc:  # noqa: BLE001
            LOG.exception("Failed on %s: %s", pdf_path.name, exc)
        finally:
            gc.collect()

    rc = log_export_summary(
        pdfs,
        output_dir,
        export_mode=config.export_mode,
        strict_output=config.strict_output,
    )
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

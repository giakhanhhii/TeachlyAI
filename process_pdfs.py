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
* Pages are streamed through a small prefetch queue (no giant list of all page images in RAM).
* Kept page Markdown is streamed to disk as each page finishes (no full-book `per_page` list
  during OCR). The output `.md` is created only when the first kept page is ready — page 1
  OCR on GPU can take many minutes; watch the log line “Raster + Chandra OCR starting page”.
  After each PDF, the file is read once for highlights + MCQ post-process.
* Throughput: on ~8 GiB GPUs, Chandra HF is often **~1–5+ minutes per page** (first page
  slower). A “few lines” in the file usually means **only one short page** finished, not a bug.
  Lower `CHANDRA_IMAGE_DPI` (e.g. 96) or keep `PDF_CONSERVE_VRAM=1` to bias toward speed.
* Default raster caps are auto-tuned when CHANDRA_* is unset: large CUDA cards use a
  faster aggressive preset, while smaller GPUs stay on conservative values.
* PDF_CONSERVE_VRAM=1: if you did not set CHANDRA_* raster vars, the runtime keeps the
  lower-VRAM preset unless a larger-GPU auto-tune overrides it.
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
  CHANDRA_BATCH_SIZE=1           pages per `generate()` call; auto-tuned upward on large GPUs when unset
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
import json
import logging
import os
from dataclasses import replace
from queue import Queue
from pathlib import Path
from threading import Thread
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


def _env_is_unset(name: str) -> bool:
    v = os.environ.get(name)
    return v is None or str(v).strip() == ""


def _recommended_batch_size(total_gib: float) -> int:
    """
    Pick a batch size that favors throughput on large VRAM cards.

    A100 40GB comfortably lands in the 8-page bucket; smaller GPUs fall back
    to more conservative values.
    """
    if total_gib >= 36:
        return 8
    if total_gib >= 24:
        return 6
    if total_gib >= 16:
        return 4
    if total_gib >= 10:
        return 2
    return 1


def _tune_runtime_config(config: PipelineConfig, torch_device: str) -> PipelineConfig:
    """
    Auto-tune only when the user did not explicitly set the relevant env vars.

    The goal is to increase batch throughput on GPUs with ample VRAM while
    keeping the old conservative defaults for smaller cards or CPU runs.
    """
    if not torch_device.startswith("cuda"):
        return config

    try:
        import torch

        idx = torch.device(torch_device).index or 0
        props = torch.cuda.get_device_properties(idx)
        total_gib = props.total_memory / (1024**3)
    except Exception:  # noqa: BLE001
        return config

    updates: dict[str, Any] = {}

    if _env_is_unset("CHANDRA_BATCH_SIZE"):
        updates["chandra_batch_size"] = _recommended_batch_size(total_gib)

    if _env_is_unset("GPU_CACHE_CLEAR") and total_gib >= 24:
        updates["gpu_cache_clear"] = False

    if _env_is_unset("PDF_GC_EVERY") and total_gib >= 24:
        updates["pdf_gc_every"] = 0

    if _env_is_unset("CHANDRA_IMAGE_DPI") and _env_is_unset("CHANDRA_MIN_PDF_IMAGE_DIM"):
        if total_gib >= 36:
            updates["chandra_image_dpi"] = "96"
            updates["chandra_min_pdf_image_dim"] = "640"
        elif total_gib >= 24:
            updates["chandra_image_dpi"] = "108"
            updates["chandra_min_pdf_image_dim"] = "768"

    if not updates:
        return config
    return replace(config, **updates)


def _apply_runtime_env(config: PipelineConfig) -> None:
    """
    Push the final raster settings into the environment before Chandra imports.
    """
    if _env_is_unset("IMAGE_DPI"):
        os.environ["IMAGE_DPI"] = config.chandra_image_dpi
    if _env_is_unset("MIN_PDF_IMAGE_DIM"):
        os.environ["MIN_PDF_IMAGE_DIM"] = config.chandra_min_pdf_image_dim


# ---------------------------------------------------------------------------
# Checkpoint helpers — enable resume across Ctrl+C / crashes
# ---------------------------------------------------------------------------

def _checkpoint_path(out_path: Path) -> Path:
    """Sidecar file stored next to the .md output."""
    return out_path.with_suffix(".progress.json")


def _load_checkpoint(out_path: Path) -> tuple[int, int]:
    """
    Return (resume_from_page, kept_count) from a .progress.json sidecar.
    Returns (0, 0) if no valid checkpoint exists.

    The file_bytes field is cross-checked against the actual .md size so a
    truncated / corrupted output file is always detected and the run restarts
    cleanly from page 0.
    """
    cp = _checkpoint_path(out_path)
    if not cp.is_file():
        return 0, 0
    try:
        data = json.loads(cp.read_text(encoding="utf-8"))
        ocr_page = int(data.get("ocr_page", 0))
        kept_count = int(data.get("kept_count", 0))
        expected_bytes = int(data.get("file_bytes", -1))
        if ocr_page <= 0:
            return 0, 0
        # Verify .md integrity
        if out_path.is_file():
            actual = out_path.stat().st_size
            if expected_bytes >= 0 and actual != expected_bytes:
                LOG.warning(
                    "Checkpoint mismatch for %s: expected %d bytes, found %d — restarting.",
                    out_path.name, expected_bytes, actual,
                )
                cp.unlink(missing_ok=True)
                return 0, 0
        elif kept_count > 0:
            # Kept pages recorded but .md is missing — restart
            LOG.warning(
                "Checkpoint for %s references %d kept pages but .md is missing — restarting.",
                out_path.name, kept_count,
            )
            cp.unlink(missing_ok=True)
            return 0, 0
        LOG.info(
            "Resuming %s from OCR page %d (kept so far: %d, file: %d bytes).",
            out_path.name, ocr_page, kept_count, expected_bytes,
        )
        return ocr_page, kept_count
    except Exception as exc:  # noqa: BLE001
        LOG.warning("Could not read checkpoint for %s: %s — restarting.", out_path.name, exc)
        return 0, 0


def _save_checkpoint(out_path: Path, ocr_page: int, kept_count: int) -> None:
    """Atomically write progress sidecar so a crash cannot leave a half-written JSON."""
    try:
        file_bytes = out_path.stat().st_size if out_path.is_file() else 0
        data = {"ocr_page": ocr_page, "kept_count": kept_count, "file_bytes": file_bytes}
        tmp = _checkpoint_path(out_path).with_suffix(".progress.tmp")
        tmp.write_text(json.dumps(data), encoding="utf-8")
        tmp.replace(_checkpoint_path(out_path))
    except Exception as exc:  # noqa: BLE001
        LOG.debug("Could not save checkpoint for %s: %s", out_path.name, exc)


def _clear_checkpoint(out_path: Path) -> None:
    """Remove sidecar when a PDF finishes successfully."""
    try:
        _checkpoint_path(out_path).unlink(missing_ok=True)
    except Exception:  # noqa: BLE001
        pass


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
    batch_size = max(1, config.chandra_batch_size)
    checkpoint_enabled = config.checkpoint_enabled

    n_pages = pdf_page_count(pdf_path)
    if n_pages == 0:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text("", encoding="utf-8")
        clear_cuda_memory(sync=True, config=config)
        return

    # ------------------------------------------------------------------ resume
    resume_from_page = 0
    kept_write_count = 0
    if checkpoint_enabled:
        resume_from_page, kept_write_count = _load_checkpoint(out_path)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    if resume_from_page == 0:
        try:
            if out_path.exists():
                out_path.unlink()
        except OSError:
            pass

    # When resuming with existing kept pages → open in append mode and add a
    # separator before the first new chunk so the output remains well-formed.
    file_mode = "a" if (resume_from_page > 0 and kept_write_count > 0) else "w"
    add_separator_on_first = resume_from_page > 0 and kept_write_count > 0

    filter_state = StreamingFilterState()
    ocr_page_count = resume_from_page  # absolute page counter (0-based pages processed)
    out_f: Any = None
    wrote_kept = kept_write_count > 0
    wrote_in_session = False  # True after ≥1 chunk written in this run

    # ----------------------------------------------------------------- batching
    # True batching: collect batch_size PIL images, call generate() once.
    # A small renderer thread prefetches pages so CPU raster work overlaps GPU OCR.
    batch_imgs: list[Any] = []
    batch_pnos: list[int] = []
    page_queue: Queue[Any] = Queue(maxsize=max(4, batch_size * 2))
    queue_sentinel = object()
    renderer_error: list[BaseException] = []

    def _render_pages() -> None:
        try:
            for pno, pil in iter_pdf_pages_rgb(pdf_path, start_page=resume_from_page):
                # Copy immediately so the pdfium generator can close the original
                # page image while the main thread processes the buffered batch.
                page_queue.put((pno, pil.copy()))
        except BaseException as exc:  # noqa: BLE001
            renderer_error.append(exc)
        finally:
            page_queue.put(queue_sentinel)

    renderer = Thread(target=_render_pages, name=f"pdf-raster:{stem}", daemon=True)
    renderer.start()

    def _flush_batch() -> None:
        """OCR the accumulated batch, filter, write kept pages, save checkpoint."""
        nonlocal ocr_page_count, kept_write_count, wrote_kept, wrote_in_session, out_f
        if not batch_imgs:
            return

        LOG.info(
            "Raster + Chandra OCR batch pages %d-%d/%d — %s",
            batch_pnos[0] + 1,
            batch_pnos[-1] + 1,
            n_pages,
            stem[:60] + ("\u2026" if len(stem) > 60 else ""),
        )

        outs = chandra_ocr_images(
            manager,
            batch_imgs,
            batch_size=len(batch_imgs),  # pass full batch to generate() in one call
            config=config,
        )

        kept_chunks: list[str] = []
        batch_start_pno = batch_pnos[0]
        batch_end_pno = batch_pnos[-1]
        for raw_md in outs:
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
                del raw_md
                continue

            page_src = raw_md.strip() if export_mode == "full" else raw_md
            del raw_md
            chunk = strip_markdown_images(page_src)
            del page_src
            kept_chunks.append(chunk)
            del chunk

        del outs

        # Free copied images
        for img in batch_imgs:
            try:
                img.close()
            except Exception:  # noqa: BLE001
                pass
        batch_imgs.clear()
        batch_pnos.clear()

        clear_cuda_memory(sync=False, config=config)

        if kept_chunks:
            if out_f is None:
                out_f = open(out_path, file_mode, encoding="utf-8", buffering=1024 * 1024)  # noqa: WPS515

            separator = "\n\n---\n\n"
            payload = separator.join(kept_chunks)
            if wrote_in_session or add_separator_on_first:
                out_f.write(separator)
            out_f.write(payload)
            out_f.flush()

            kept_count = len(kept_chunks)
            kept_write_count += kept_count
            wrote_kept = True
            wrote_in_session = True

            try:
                nbytes = out_path.stat().st_size
            except OSError:
                nbytes = -1
            LOG.info(
                "Kept %d pages from OCR batch %d-%d/%d — %s, file %d bytes",
                kept_count,
                batch_start_pno + 1,
                batch_end_pno + 1,
                n_pages,
                out_path.name,
                nbytes,
            )

        # Persist checkpoint after every batch flush
        if checkpoint_enabled:
            if out_f is not None:
                out_f.flush()
            _save_checkpoint(out_path, ocr_page_count, kept_write_count)

    # ----------------------------------------------------------------- main loop
    try:
        remaining = n_pages - resume_from_page
        with tqdm(
            total=remaining,
            desc=f"pages:{stem[:28]}",
            unit="pg",
            leave=False,
            mininterval=config.pdf_tqdm_mininterval,
        ) as pbar:
            if resume_from_page > 0:
                pbar.set_description(f"resume:{stem[:24]}")
            while True:
                item = page_queue.get()
                if item is queue_sentinel:
                    break
                pno, pil = item
                pbar.update(1)

                batch_imgs.append(pil)
                batch_pnos.append(pno)

                if len(batch_imgs) < batch_size:
                    continue  # accumulate more pages

                _flush_batch()

            # Flush any remaining pages (last partial batch)
            _flush_batch()
            if renderer_error:
                raise renderer_error[0]

    finally:
        try:
            renderer.join(timeout=1.0)
        except Exception:  # noqa: BLE001
            pass
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

    # PDF completed successfully — remove checkpoint sidecar
    _clear_checkpoint(out_path)
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

    config = _tune_runtime_config(config, torch_device)
    _apply_runtime_env(config)

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

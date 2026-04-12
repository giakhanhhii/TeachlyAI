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
* Default raster caps (before any `chandra` import): MIN_PDF_IMAGE_DIM=896, IMAGE_DPI=144 —
  override with env for sharper scans if you have VRAM headroom.

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
  MODEL_CHECKPOINT=…             default `datalab-to/chandra-ocr-2`
  CHANDRA_METHOD=hf|vllm         default hf
  CHANDRA_BATCH_SIZE=1           pages per `generate()` call; use 1 on 8 GB VRAM
  GPU_CACHE_CLEAR=1              default on: empty CUDA cache between batches / PDFs
  APPLY_HIGHLIGHTS=1             PyMuPDF <mark> pass (default on)
  PDF_EXPORT_MODE=full|exercises default full = complete book per PDF
  CHANDRA_IMAGE_DPI / CHANDRA_MIN_PDF_IMAGE_DIM  optional overrides (mapped to IMAGE_DPI /
                              MIN_PDF_IMAGE_DIM before Chandra loads)
  STRICT_OUTPUT=1             exit code 1 if any expected .md is missing or zero bytes
"""

from __future__ import annotations

import gc
import logging
import os
import re
import unicodedata
from pathlib import Path
from typing import Any, Iterable, List, Optional, Sequence, Tuple

LOG = logging.getLogger("process_pdfs")


def _nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def _truthy_env(name: str) -> bool:
    return os.environ.get(name, "").lower() in ("1", "true", "yes")


def _export_mode() -> str:
    """
    full: one complete Markdown per PDF (all pages). exercises: blacklist + exam-start filter.
    """
    m = os.environ.get("PDF_EXPORT_MODE", "full").strip().lower()
    if m in ("exercises", "exercise", "filtered"):
        return "exercises"
    return "full"


def _gpu_cache_clear_enabled() -> bool:
    """Default on; set GPU_CACHE_CLEAR=0 to skip empty_cache (not recommended on 8 GB)."""
    if os.environ.get("GPU_CACHE_CLEAR") is None:
        return True
    return _truthy_env("GPU_CACHE_CLEAR")


def clear_cuda_memory(*, sync: bool = False) -> None:
    """
    Free fragmented VRAM between page batches / after a large PDF.
    `sync=True` waits for GPU work to finish (slightly slower; use after each file).
    """
    gc.collect()
    if not _gpu_cache_clear_enabled():
        return
    try:
        import torch

        if not torch.cuda.is_available():
            return
        if sync:
            torch.cuda.synchronize()
        torch.cuda.empty_cache()
    except Exception:  # noqa: BLE001
        pass


def _normalize_torch_device(want: str) -> str:
    """
    Chandra HF uses `device_map={'': TORCH_DEVICE}`. Use an explicit cuda:N id so the
    whole model sits on one GPU (not split / ambiguous 'cuda' on some stacks).
    """
    w = want.strip().lower()
    if w in ("cuda", "gpu"):
        return "cuda:0"
    if w == "cpu":
        return "cpu"
    if w.startswith("cuda:"):
        return want.strip()
    if w.startswith("cuda"):
        return "cuda:0"
    return want.strip()


# -----------------------------------------------------------------------------
# Intros / TOC blacklist (normalized NFC substring match, case-insensitive ASCII)
# -----------------------------------------------------------------------------

_INTRO_BLACKLIST = (
    "Lời nói đầu",
    "Bạn đọc thân mến",
    "Nhóm tác giả",
    "Mục lục",
    "Table of Contents",
)


def _page_is_blacklisted(page_text: str) -> bool:
    t = _nfc(page_text).casefold()
    for phrase in _INTRO_BLACKLIST:
        if _nfc(phrase).casefold() in t:
            return True
    return False


# -----------------------------------------------------------------------------
# Exam-start heuristics (regex + option-line density)
# -----------------------------------------------------------------------------

_RE_MARK_LETTER = re.compile(
    r"Mark\s+(?:the\s+)?letter\b",
    re.IGNORECASE,
)
_RE_QUESTION_EN = re.compile(
    r"(?:^|\n)\s*Question\s*\d+\s*[.:]\s*",
    re.IGNORECASE | re.MULTILINE,
)
_RE_QUESTION_VI = re.compile(
    r"(?:^|\n)\s*(?:Câu|Cau)\s*\d+\s*[.:]\s*",
    re.IGNORECASE | re.MULTILINE,
)
# Lines that look like MCQ options: "A. text", "B) text"
_RE_OPTION_LINE = re.compile(r"^\s*[A-Da-d](?:[\.)])\s+\S", re.MULTILINE)


def _option_stats(page_text: str) -> tuple[int, int]:
    """Return (option_like_lines, non_empty_lines)."""
    lines = [ln.strip() for ln in page_text.splitlines()]
    nonempty = [ln for ln in lines if ln]
    if not nonempty:
        return 0, 0
    opts = sum(1 for ln in nonempty if _RE_OPTION_LINE.match(ln))
    return opts, len(nonempty)


def _page_triggers_exam_start(page_text: str) -> bool:
    if _RE_MARK_LETTER.search(page_text):
        return True
    if _RE_QUESTION_EN.search(page_text) or _RE_QUESTION_VI.search(page_text):
        return True
    opts, n = _option_stats(page_text)
    if opts >= 4:
        return True
    if n and opts >= 3 and (opts / n) >= 0.25:
        return True
    return False


def filter_pages_markdown(page_mds: Sequence[str]) -> list[str]:
    """
    Apply blacklist + dynamic exam start. Returns kept pages in order (each string is
    one page’s markdown from Chandra).
    """
    kept: list[str] = []
    exercise_started = False
    for md in page_mds:
        text = _nfc(md or "")
        if _page_is_blacklisted(text):
            continue
        if not exercise_started:
            if _page_triggers_exam_start(text):
                exercise_started = True
                kept.append(md)
            continue
        kept.append(md)
    return kept


# -----------------------------------------------------------------------------
# Markdown image stripping (strict regex)
# -----------------------------------------------------------------------------

_RE_MD_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")


def strip_markdown_images(md: str) -> str:
    out = _RE_MD_IMAGE.sub("", md)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.rstrip() + ("\n" if out and not out.endswith("\n") else "")


# -----------------------------------------------------------------------------
# Torch / device (before Chandra imports in build_manager)
# -----------------------------------------------------------------------------


def configure_torch_env() -> str:
    """
    Set env before any `chandra` import so Settings picks up TORCH_DEVICE.

    * Default GPU path: `TORCH_DEVICE=cuda:0` (explicit) for Chandra’s
      `AutoModelForImageTextToText.from_pretrained(..., device_map={'': ...})`.
    * Optional allocator hint for fragmentation on long runs (safe no-op if unsupported).
    """
    raw = os.environ.get("TORCH_DEVICE", "cuda")
    want = raw.strip().lower()
    if want in ("cpu", "none", ""):
        os.environ.pop("TORCH_DEVICE", None)
        return "cpu"

    normalized = _normalize_torch_device(raw.strip())
    os.environ["TORCH_DEVICE"] = normalized

    if os.environ.get("PYTORCH_CUDA_ALLOC_CONF", "").strip() == "":
        # Reduces VRAM fragmentation on long page-by-page jobs (PyTorch 2.x+).
        os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

    # Chandra reads these via pydantic on first `import chandra.*` — set before that.
    def _env_blank(name: str) -> bool:
        v = os.environ.get(name)
        return v is None or str(v).strip() == ""

    if _env_blank("IMAGE_DPI"):
        os.environ["IMAGE_DPI"] = os.environ.get("CHANDRA_IMAGE_DPI", "144").strip() or "144"
    if _env_blank("MIN_PDF_IMAGE_DIM"):
        os.environ["MIN_PDF_IMAGE_DIM"] = (
            os.environ.get("CHANDRA_MIN_PDF_IMAGE_DIM", "896").strip() or "896"
        )

    try:
        import torch

        if normalized.startswith("cuda") and not torch.cuda.is_available():
            raise RuntimeError(
                "TORCH_DEVICE requests CUDA but torch.cuda.is_available() is False. "
                "Reinstall torch with CUDA (see requirements-pdf.txt) or set TORCH_DEVICE=cpu."
            )
        if normalized.startswith("cuda") and torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            try:
                idx = torch.device(normalized).index or 0
                name = torch.cuda.get_device_name(idx)
                props = torch.cuda.get_device_properties(idx)
                gib = props.total_memory / (1024**3)
                free_b, total_b = torch.cuda.mem_get_info()
                LOG.info(
                    "CUDA %s: %s (~%.1f GiB total, ~%.1f GiB free before model load)",
                    normalized,
                    name,
                    gib,
                    free_b / (1024**3),
                )
                if gib <= 9 and _chandra_batch_size() > 1:
                    LOG.warning(
                        "CHANDRA_BATCH_SIZE=%s on ~%.0f GiB VRAM may OOM; try 1.",
                        _chandra_batch_size(),
                        gib,
                    )
            except Exception:  # noqa: BLE001
                LOG.info("CUDA device: %s", normalized)
    except ImportError:
        LOG.warning("torch not installed; skipping CUDA probe")
    return normalized


def log_runtime_device(manager: Any, torch_device: str) -> None:
    """
    Make GPU vs CPU obvious in logs. Cursor’s “background shell” title is just the
    command description from when the task was started — it is not proof of device.
    """
    if torch_device == "cpu":
        LOG.warning(
            "Chandra is configured for CPU (TORCH_DEVICE=cpu). For GPU: install CUDA torch "
            "(requirements-pdf.txt), then run without setting TORCH_DEVICE or set TORCH_DEVICE=cuda:0."
        )
        return
    try:
        import torch

        if not torch.cuda.is_available():
            LOG.error(
                "TORCH_DEVICE=%s but torch.cuda.is_available() is False — inference will not use the GPU.",
                torch_device,
            )
            return
        probe = torch.zeros(1, device=torch_device)
        LOG.info(
            "PyTorch GPU probe: tensor lives on %s (this process is using CUDA).",
            probe.device,
        )
        del probe
        model = getattr(manager, "model", None)
        if model is not None:
            sample = next((p for p in model.parameters() if p.numel() > 0), None)
            if sample is not None:
                LOG.info(
                    "Chandra HF model sample weight device: %s "
                    "(if you see 'cpu' here too, VRAM is tight and Transformers may offload some layers).",
                    sample.device,
                )
    except Exception as exc:  # noqa: BLE001
        LOG.warning("Could not log runtime device: %s", exc)


# -----------------------------------------------------------------------------
# Highlight extraction (PyMuPDF) — optional
# -----------------------------------------------------------------------------

HighlightSegment = Tuple[str, str]


def _rgb01_to_class(rgb: Optional[Sequence[float]]) -> str:
    if not rgb or len(rgb) < 3:
        return "highlight"
    r, g, b = float(rgb[0]), float(rgb[1]), float(rgb[2])
    if r > 0.65 and g > 0.65 and b < 0.45:
        return "yellow"
    if g > max(r, b) + 0.15 and g > 0.45:
        return "green"
    if r > 0.55 and b > 0.45 and g < 0.55:
        return "pink"
    if b > max(r, g) + 0.15 and b > 0.45:
        return "blue"
    return "highlight"


def _iter_annots(page: Any) -> Iterable[Any]:
    fn = getattr(page, "annots", None)
    if callable(fn):
        try:
            for a in fn() or []:
                yield a
            return
        except TypeError:
            pass
    annot = page.first_annot
    while annot is not None:
        yield annot
        annot = annot.next


def extract_highlight_segments(pdf_path: Path) -> List[HighlightSegment]:
    import fitz  # pymupdf

    doc = fitz.open(pdf_path)
    try:
        ordered: List[Tuple[int, float, str, str]] = []
        for pno in range(len(doc)):
            page = doc[pno]
            for annot in _iter_annots(page):
                atype = getattr(annot, "type", (None, ""))
                if len(atype) <= 1 or str(atype[1]).lower() != "highlight":
                    continue
                colors = getattr(annot, "colors", None) or {}
                stroke = colors.get("stroke")
                cls = _rgb01_to_class(stroke)
                rect = annot.rect
                text = _nfc(page.get_text("text", clip=rect).strip())
                if not text:
                    continue
                y_top = float(rect.y0)
                ordered.append((pno, y_top, cls, text))
        ordered.sort(key=lambda t: (t[0], t[1]))
        return [(t[2], t[3]) for t in ordered]
    finally:
        doc.close()


def _flexible_wrap_first_occurrence(md: str, css_class: str, needle: str) -> str:
    parts = needle.split()
    if not parts:
        return md
    pattern = r"\s+".join(re.escape(p) for p in parts)
    m = re.search(pattern, md, flags=re.DOTALL)
    if not m:
        return md
    wrapped = f'<mark class="{css_class}">{m.group(0)}</mark>'
    return md[: m.start()] + wrapped + md[m.end() :]


def apply_highlight_marks(md: str, segments: Sequence[HighlightSegment]) -> str:
    out = md
    for css_class, text in segments:
        out = _flexible_wrap_first_occurrence(out, css_class, text)
    return out


# -----------------------------------------------------------------------------
# Chandra OCR 2 — per-page images → markdown
# -----------------------------------------------------------------------------


def _chandra_batch_size() -> int:
    raw = os.environ.get("CHANDRA_BATCH_SIZE", "1").strip()
    try:
        n = int(raw)
    except ValueError:
        return 1
    return max(1, n)


def build_chandra_manager(method: str | None = None):
    """Import Chandra after TORCH_DEVICE / MODEL_CHECKPOINT env is set."""
    from chandra.model import InferenceManager

    m = (method or os.environ.get("CHANDRA_METHOD", "hf")).lower()
    if m not in ("hf", "vllm"):
        raise ValueError("CHANDRA_METHOD must be hf or vllm")
    return InferenceManager(method=m)


def pdf_page_count(pdf_path: Path) -> int:
    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(str(pdf_path))
    try:
        return len(doc)
    finally:
        doc.close()


def iter_pdf_pages_rgb(pdf_path: Path) -> Iterable[Tuple[int, Any]]:
    """
    Yield (page_index, RGB PIL) one page at a time — same raster policy as `chandra.input.load_pdf_images`
    but avoids holding every page in memory (fixes MemoryError on long PDFs).
    """
    from chandra.input import flatten
    from chandra.settings import settings

    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(str(pdf_path))
    doc.init_forms()
    image_dpi = settings.IMAGE_DPI
    min_pdf_image_dim = settings.MIN_PDF_IMAGE_DIM
    try:
        for page in range(len(doc)):
            page_obj = doc[page]
            min_page_dim = min(page_obj.get_width(), page_obj.get_height())
            scale_dpi = (min_pdf_image_dim / min_page_dim) * 72
            scale_dpi = max(scale_dpi, float(image_dpi))
            flatten(page_obj)
            pil_image = page_obj.render(scale=scale_dpi / 72).to_pil().convert("RGB")
            yield page, pil_image
    finally:
        doc.close()


def chandra_ocr_images(manager: Any, images: list[Any]) -> list[str]:
    from chandra.model.schema import BatchInputItem

    batch_size = _chandra_batch_size()
    page_mds: list[str] = []
    try:
        import torch
    except ImportError:
        torch = None  # type: ignore[assignment]

    for i in range(0, len(images), batch_size):
        chunk = images[i : i + batch_size]
        batch = [
            BatchInputItem(image=img, prompt_type="ocr_layout") for img in chunk
        ]
        if torch is not None:
            with torch.inference_mode():
                outputs = manager.generate(batch)
        else:
            outputs = manager.generate(batch)
        for out in outputs:
            if getattr(out, "error", False):
                LOG.warning("Chandra reported error on a page batch slice; using empty.")
                page_mds.append("")
            else:
                page_mds.append(getattr(out, "markdown", "") or "")
        clear_cuda_memory(sync=False)
    return page_mds


def pdf_to_filtered_markdown(pdf_path: Path, manager: Any) -> str:
    from tqdm import tqdm

    n_pages = pdf_page_count(pdf_path)
    if n_pages == 0:
        return ""

    export = _export_mode()
    per_page: list[str] = []

    try:
        for _pno, pil in tqdm(
            iter_pdf_pages_rgb(pdf_path),
            total=n_pages,
            desc=f"pages:{pdf_path.stem[:28]}",
            unit="pg",
            leave=False,
        ):
            out = chandra_ocr_images(manager, [pil])
            per_page.append(out[0] if out else "")
            del pil
            clear_cuda_memory(sync=False)
    finally:
        clear_cuda_memory(sync=True)

    if export == "full":
        kept = [s.strip() for s in per_page if s.strip()]
    else:
        kept = filter_pages_markdown(per_page)
        if not kept:
            LOG.warning(
                "%s: no pages kept after blacklist / exam-start filter (%d OCR pages).",
                pdf_path.name,
                len(per_page),
            )
    body = "\n\n---\n\n".join(s for s in kept if s)
    return strip_markdown_images(body)


# -----------------------------------------------------------------------------
# Post-process (MCQ / passages; preserves <mark>…</mark>)
# -----------------------------------------------------------------------------


def post_process_markdown(md: str) -> str:
    _MARK_HTML = re.compile(r"<mark\b[^>]*>.*?</mark>", re.IGNORECASE | re.DOTALL)
    _PH_OPEN, _PH_CLOSE = "\uE000", "\uE001"

    def _shield_marks(s: str) -> tuple[str, list[str]]:
        parts: list[str] = []

        def _sub(m: re.Match[str]) -> str:
            parts.append(m.group(0))
            return f"{_PH_OPEN}{len(parts) - 1:05d}{_PH_CLOSE}"

        return _MARK_HTML.sub(_sub, s), parts

    def _unshield(s: str, parts: list[str]) -> str:
        out = s
        for i, frag in enumerate(parts):
            out = out.replace(f"{_PH_OPEN}{i:05d}{_PH_CLOSE}", frag)
        return out

    _Q_VI = re.compile(
        r"^\s*(?:Câu|Cau|CAU)\s*\d+\s*[.:]\s*",
        re.IGNORECASE,
    )
    _Q_EN = re.compile(r"^\s*Question\s*\d+\s*[.:]\s*", re.IGNORECASE)
    _OPT = re.compile(r"^(\s*)([A-Da-d])([\.)])\s+(.*)$")

    def _is_question_line(line: str) -> bool:
        t = line.strip()
        return bool(_Q_VI.match(t) or _Q_EN.match(t))

    def _is_option_line(line: str) -> bool:
        return _OPT.match(line) is not None

    def _is_hard_boundary(line: str) -> bool:
        t = line.strip()
        if not t:
            return False
        if t.startswith("|"):
            return True
        if re.match(r"^#{1,6}\s+", t):
            return True
        if re.match(r"^[-*+]\s+", t):
            return True
        if re.match(r"^>{1,}\s+", t):
            return True
        if re.match(r"^\s*```", t):
            return True
        if re.match(
            r"^\s*(?:Mã\s+đề|Mã\s+de|Mã\s+DE|Ma\s+de)\b",
            t,
            re.IGNORECASE,
        ):
            return True
        if re.match(
            r"^\s*(?:Part|PART|Phần|Phan|PHAN)\s+[IVXLC0-9]+",
            t,
            re.IGNORECASE,
        ):
            return True
        if re.match(
            r"^\s*(?:Đọc\s+hiểu|Doc\s+hieu|READING|Reading\s+passage)\b",
            t,
            re.IGNORECASE,
        ):
            return True
        if re.match(r"^\s*(?:HẾT|HET)\b", t, re.IGNORECASE):
            return True
        if re.match(r"^\s*\(\d{1,2}\)\s+\S", t):
            return True
        return _is_question_line(line) or _is_option_line(line)

    def _collapse_blank_runs(s: str) -> str:
        return re.sub(r"\n{3,}", "\n\n", s)

    def _coalesce_soft_paragraph_breaks(text: str) -> str:
        lines = text.split("\n")
        out: list[str] = []
        i = 0
        while i < len(lines):
            cur = lines[i]
            if i + 1 < len(lines):
                nxt = lines[i + 1]
                cs, ns = cur.strip(), nxt.strip()
                if cs and ns and not _is_hard_boundary(nxt):
                    if not cur.strip().endswith((".", "?", "!", ":", ";")):
                        last = cur.rstrip()
                        if last and last[-1].islower() and ns[0].islower():
                            out.append(last + " " + ns)
                            i += 2
                            continue
            out.append(cur)
            i += 1
        return "\n".join(out)

    def _split_fused_options_on_line(line: str) -> str:
        opt_head = r"(?<![A-Za-z0-9])[A-D](?:[\.)])\s+"
        if len(re.findall(opt_head, line, flags=re.IGNORECASE)) < 2:
            return line
        chunks = re.split(rf"(?<=\S)\s+(?={opt_head})", line, flags=re.IGNORECASE)
        return "\n".join(chunks)

    def _heal_mcq_block(text: str) -> str:
        lines = text.split("\n")
        out: list[str] = []
        ctx: str = "none"

        for line in lines:
            raw = line
            stripped = raw.strip()
            if not stripped:
                out.append(raw)
                continue

            if _is_hard_boundary(raw) and not (
                ctx in ("question", "option") and _is_option_line(raw)
            ):
                if _is_question_line(raw):
                    ctx = "question"
                elif _is_option_line(raw):
                    ctx = "option"
                else:
                    ctx = "none"
                out.append(_split_fused_options_on_line(raw))
                continue

            if _is_option_line(raw):
                ctx = "option"
                out.append(_split_fused_options_on_line(raw))
                continue

            if ctx in ("question", "option") and out:
                j = len(out) - 1
                while j >= 0 and not out[j].strip():
                    j -= 1
                if j >= 0:
                    base = out[j].rstrip()
                    out[j] = base + (" " if base else "") + stripped
                    continue

            ctx = "other"
            out.append(raw)

        return "\n".join(out)

    s, stored = _shield_marks(md)
    s = _collapse_blank_runs(s)
    s = _coalesce_soft_paragraph_breaks(s)
    s = _heal_mcq_block(s)
    s = "\n".join(_split_fused_options_on_line(L) for L in s.split("\n"))
    s = _collapse_blank_runs(s)
    return _unshield(s, stored)


# -----------------------------------------------------------------------------
# Batch driver
# -----------------------------------------------------------------------------


def collect_pdfs(input_dir: Path) -> List[Path]:
    paths: List[Path] = []
    for ext in ("*.pdf", "*.PDF"):
        paths.extend(sorted(input_dir.glob(ext)))
    return sorted(set(paths), key=lambda p: p.name.lower())


def log_export_summary(pdfs: List[Path], output_dir: Path, *, export_mode: str) -> int:
    """
    Compare data_input PDFs to data_output/*.md. Returns 1 if STRICT_OUTPUT=1 and any
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
        LOG.warning("Missing .md for: %s", "; ".join(missing[:20]) + (" …" if len(missing) > 20 else ""))
    if empty:
        LOG.warning("Zero-byte .md: %s", "; ".join(empty[:20]) + (" …" if len(empty) > 20 else ""))
    if _truthy_env("STRICT_OUTPUT") and (missing or empty):
        LOG.error("STRICT_OUTPUT=1: failing because some outputs are missing or empty.")
        return 1
    return 0


def process_one_pdf(
    pdf_path: Path,
    output_dir: Path,
    manager: Any,
    *,
    apply_highlights: bool = True,
) -> None:
    stem = pdf_path.stem
    out_path = output_dir / f"{stem}.md"

    md = _nfc(pdf_to_filtered_markdown(pdf_path, manager))
    if apply_highlights:
        try:
            segs = extract_highlight_segments(pdf_path)
            md = apply_highlight_marks(md, segs)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Highlight pass failed for %s: %s", pdf_path.name, exc)

    md = post_process_markdown(md)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(md, encoding="utf-8")
    clear_cuda_memory(sync=True)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    root = Path(__file__).resolve().parent
    input_dir = root / "data_input"
    output_dir = root / "data_output"

    try:
        torch_device = configure_torch_env()
    except RuntimeError as e:
        LOG.error("%s", e)
        return 1

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

    try:
        manager = build_chandra_manager()
    except Exception as exc:  # noqa: BLE001
        LOG.exception("Could not initialize Chandra: %s", exc)
        return 1

    log_runtime_device(manager, torch_device)

    ckpt = os.environ.get("MODEL_CHECKPOINT", "datalab-to/chandra-ocr-2")
    apply_hl = (
        _truthy_env("APPLY_HIGHLIGHTS")
        if os.environ.get("APPLY_HIGHLIGHTS") is not None
        else True
    )
    export_mode = _export_mode()
    LOG.info(
        "Chandra method=%s batch_size=%s TORCH_DEVICE=%s MODEL_CHECKPOINT=%s "
        "PDF_EXPORT_MODE=%s APPLY_HIGHLIGHTS=%s GPU_CACHE_CLEAR=%s",
        os.environ.get("CHANDRA_METHOD", "hf"),
        _chandra_batch_size(),
        torch_device,
        ckpt,
        export_mode,
        apply_hl,
        _gpu_cache_clear_enabled(),
    )

    for pdf_path in tqdm(pdfs, desc="PDFs", unit="file"):
        try:
            process_one_pdf(
                pdf_path,
                output_dir,
                manager,
                apply_highlights=apply_hl,
            )
        except Exception as exc:  # noqa: BLE001
            LOG.exception("Failed on %s: %s", pdf_path.name, exc)

    rc = log_export_summary(pdfs, output_dir, export_mode=export_mode)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

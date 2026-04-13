"""Chandra OCR 2 + PDFium raster + torch/CUDA helpers. Import chandra only after torch env is set."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Iterable, Tuple

from config import PipelineConfig, gpu_cache_clear_from_env, truthy_env

LOG = logging.getLogger("process_pdfs")


def _apply_blas_thread_env_caps() -> None:
    """Cap BLAS/OpenMP threads before NumPy/torch heavy work (Windows desktop responsiveness)."""
    if truthy_env("PDF_MAX_PRIORITY"):
        return
    if os.name != "nt":
        return
    for key, val in (
        ("OMP_NUM_THREADS", "4"),
        ("MKL_NUM_THREADS", "4"),
        ("NUMEXPR_NUM_THREADS", "4"),
        ("OPENBLAS_NUM_THREADS", "4"),
    ):
        if os.environ.get(key, "").strip() == "":
            os.environ[key] = val


def _cap_torch_cpu_threads_for_responsive_os() -> None:
    """After torch is imported, cap intra-op threads so the UI does not freeze."""
    if truthy_env("PDF_MAX_PRIORITY"):
        return
    if os.name != "nt":
        return
    try:
        import torch

        nthr = min(4, max(2, (os.cpu_count() or 8) // 2))
        torch.set_num_threads(nthr)
        torch.set_num_interop_threads(1)
    except Exception:  # noqa: BLE001
        pass


def clear_cuda_memory(*, sync: bool = False, config: PipelineConfig | None = None) -> None:
    """
    Free fragmented VRAM between page batches / after a large PDF.
    `sync=True` waits for GPU work to finish (slightly slower; use after each file).

    Does not call gc.collect() here — doing that every page freezes the OS; use periodic
    gc in the orchestrator (PDF_GC_EVERY) instead.
    """
    use_clear = config.gpu_cache_clear if config else gpu_cache_clear_from_env()
    if not use_clear:
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


def configure_torch_env(config: PipelineConfig) -> str:
    """
    Set env before any `chandra` import so Settings picks up TORCH_DEVICE.

    Default GPU: cuda:0. If CUDA is unavailable, fails unless ALLOW_CPU=1 in config
    (set ALLOW_CPU=1 in the environment before loading config).
    """
    _apply_blas_thread_env_caps()
    raw = (config.torch_device_raw or "cuda").strip()
    want = raw.lower()
    if want in ("cpu", "none", ""):
        os.environ.pop("TORCH_DEVICE", None)
        return "cpu"

    normalized = _normalize_torch_device(raw)
    os.environ["TORCH_DEVICE"] = normalized

    if os.environ.get("PYTORCH_CUDA_ALLOC_CONF", "").strip() == "":
        os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

    try:
        import torch

        _cap_torch_cpu_threads_for_responsive_os()

        if normalized.startswith("cuda") and not torch.cuda.is_available():
            if config.allow_cpu:
                os.environ.pop("TORCH_DEVICE", None)
                LOG.warning(
                    "CUDA unavailable; continuing on CPU because ALLOW_CPU=1. "
                    "For GPU inference, install CUDA torch (see requirements-pdf.txt)."
                )
                return "cpu"
            raise RuntimeError(
                "TORCH_DEVICE requests CUDA but torch.cuda.is_available() is False. "
                "Reinstall torch with CUDA (see requirements-pdf.txt), set TORCH_DEVICE=cpu, "
                "or set ALLOW_CPU=1 to allow CPU fallback."
            )
        if normalized.startswith("cuda") and torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            try:
                torch.set_float32_matmul_precision("high")
            except Exception:  # noqa: BLE001
                pass
            try:
                idx = torch.device(normalized).index or 0
                name = torch.cuda.get_device_name(idx)
                props = torch.cuda.get_device_properties(idx)
                gib = props.total_memory / (1024**3)
                free_b, _total_b = torch.cuda.mem_get_info()
                LOG.info(
                    "CUDA %s: %s (~%.1f GiB total, ~%.1f GiB free before model load)",
                    normalized,
                    name,
                    gib,
                    free_b / (1024**3),
                )
                if gib <= 9 and config.chandra_batch_size > 1:
                    LOG.warning(
                        "CHANDRA_BATCH_SIZE=%s on ~%.0f GiB VRAM may OOM; try 1.",
                        config.chandra_batch_size,
                        gib,
                    )
            except Exception:  # noqa: BLE001
                LOG.info("CUDA device: %s", normalized)
    except ImportError:
        LOG.warning("torch not installed; skipping CUDA probe")
    return normalized


def log_runtime_device(manager: Any, torch_device: str) -> None:
    if torch_device == "cpu":
        LOG.warning(
            "Chandra is configured for CPU (TORCH_DEVICE=cpu or ALLOW_CPU fallback). "
            "For GPU: install CUDA torch (requirements-pdf.txt), unset ALLOW_CPU, "
            "and use TORCH_DEVICE=cuda or cuda:0."
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


def build_chandra_manager(config: PipelineConfig, method: str | None = None):
    """Import Chandra after TORCH_DEVICE / MODEL_CHECKPOINT env is set."""
    from chandra.model import InferenceManager

    m = (method or config.chandra_method).lower()
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


def iter_pdf_pages_rgb(pdf_path: Path, start_page: int = 0) -> Iterable[Tuple[int, Any]]:
    """
    Yield (page_index, RGB PIL) one page at a time — same raster policy as `chandra.input.load_pdf_images`
    but avoids holding every page in memory.

    Args:
        start_page: First page index to yield (0-based). Pages before this are skipped entirely
                    (not rendered), enabling fast resume without re-processing completed pages.
    """
    from chandra.input import flatten
    from chandra.settings import settings

    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(str(pdf_path))
    doc.init_forms()
    image_dpi = settings.IMAGE_DPI
    min_pdf_image_dim = settings.MIN_PDF_IMAGE_DIM
    try:
        for page in range(start_page, len(doc)):
            page_obj = doc[page]
            min_page_dim = min(page_obj.get_width(), page_obj.get_height())
            scale_dpi = (min_pdf_image_dim / min_page_dim) * 72
            scale_dpi = max(scale_dpi, float(image_dpi))
            flatten(page_obj)
            pil_image = page_obj.render(scale=scale_dpi / 72).to_pil().convert("RGB")
            try:
                yield page, pil_image
            finally:
                try:
                    pil_image.close()
                except Exception:  # noqa: BLE001
                    pass
                del pil_image
            try:
                page_obj.close()
            except Exception:  # noqa: BLE001
                pass
    finally:
        doc.close()


def chandra_ocr_images(
    manager: Any,
    images: list[Any],
    *,
    batch_size: int,
    config: PipelineConfig | None = None,
) -> list[str]:
    from chandra.model.schema import BatchInputItem

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
        del outputs
        del batch
        del chunk
        clear_cuda_memory(sync=False, config=config)
    return page_mds

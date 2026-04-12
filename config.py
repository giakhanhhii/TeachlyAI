"""PDF pipeline configuration: paths and env-backed settings (read once)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def truthy_env(name: str, *, default_when_unset: bool | None = None) -> bool:
    raw = os.environ.get(name)
    if raw is None and default_when_unset is not None:
        return default_when_unset
    return str(raw or "").lower() in ("1", "true", "yes")


def export_mode_from_env() -> str:
    """full | exercises — matches previous PDF_EXPORT_MODE handling."""
    m = os.environ.get("PDF_EXPORT_MODE", "full").strip().lower()
    if m in ("exercises", "exercise", "filtered"):
        return "exercises"
    return "full"


def gpu_cache_clear_from_env() -> bool:
    if os.environ.get("GPU_CACHE_CLEAR") is None:
        return True
    return truthy_env("GPU_CACHE_CLEAR")


def chandra_batch_size_from_env() -> int:
    raw = os.environ.get("CHANDRA_BATCH_SIZE", "1").strip()
    try:
        n = int(raw)
    except ValueError:
        return 1
    return max(1, n)


def allow_cpu_from_env() -> bool:
    """Explicit escape hatch when CUDA is unavailable (dev machines). Set ALLOW_CPU=1."""
    return truthy_env("ALLOW_CPU")


def speed_preset_from_env() -> str:
    """
    PDF_SPEED_PRESET=fast|aggressive — lower default raster when CHANDRA_IMAGE_DPI /
    CHANDRA_MIN_PDF_IMAGE_DIM are not set (much faster OCR, slightly rougher layout on small text).
    """
    p = os.environ.get("PDF_SPEED_PRESET", "").strip().lower()
    if p in ("fast", "aggressive"):
        return p
    return "none"


def _defaults_for_speed_preset(preset: str) -> tuple[str, str]:
    if preset == "aggressive":
        return "96", "640"
    if preset == "fast":
        return "108", "768"
    return "144", "896"


@dataclass(frozen=True)
class PipelineConfig:
    """Snapshot of paths and tunables for one run (from environment at load time)."""

    root_dir: Path
    input_dir: Path
    output_dir: Path
    torch_device_raw: str
    model_checkpoint: str
    chandra_method: str
    chandra_batch_size: int
    gpu_cache_clear: bool
    apply_highlights: bool
    export_mode: str
    strict_output: bool
    allow_cpu: bool
    chandra_speed_preset: str
    chandra_image_dpi: str
    chandra_min_pdf_image_dim: str

    @classmethod
    def from_env(cls, root_dir: Path) -> PipelineConfig:
        root = root_dir.resolve()
        preset = speed_preset_from_env()
        def_dpi, def_min = _defaults_for_speed_preset(preset)
        dpi_raw = os.environ.get("CHANDRA_IMAGE_DPI")
        min_raw = os.environ.get("CHANDRA_MIN_PDF_IMAGE_DIM")
        image_dpi = (dpi_raw.strip() if dpi_raw and str(dpi_raw).strip() else "") or def_dpi
        min_dim = (min_raw.strip() if min_raw and str(min_raw).strip() else "") or def_min
        return cls(
            root_dir=root,
            input_dir=root / "data_input",
            output_dir=root / "data_output",
            torch_device_raw=os.environ.get("TORCH_DEVICE", "cuda"),
            model_checkpoint=os.environ.get("MODEL_CHECKPOINT", "datalab-to/chandra-ocr-2"),
            chandra_method=os.environ.get("CHANDRA_METHOD", "hf").strip().lower() or "hf",
            chandra_batch_size=chandra_batch_size_from_env(),
            gpu_cache_clear=gpu_cache_clear_from_env(),
            apply_highlights=(
                truthy_env("APPLY_HIGHLIGHTS")
                if os.environ.get("APPLY_HIGHLIGHTS") is not None
                else True
            ),
            export_mode=export_mode_from_env(),
            strict_output=truthy_env("STRICT_OUTPUT"),
            allow_cpu=allow_cpu_from_env(),
            chandra_speed_preset=preset,
            chandra_image_dpi=image_dpi,
            chandra_min_pdf_image_dim=min_dim,
        )

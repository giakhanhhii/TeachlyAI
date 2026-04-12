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
    chandra_image_dpi: str
    chandra_min_pdf_image_dim: str

    @classmethod
    def from_env(cls, root_dir: Path) -> PipelineConfig:
        root = root_dir.resolve()
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
            chandra_image_dpi=os.environ.get("CHANDRA_IMAGE_DPI", "144").strip() or "144",
            chandra_min_pdf_image_dim=(
                os.environ.get("CHANDRA_MIN_PDF_IMAGE_DIM", "896").strip() or "896"
            ),
        )

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    """
    Centralized configuration loaded from environment variables.

    Security:
    - `OPENAI_API_KEY` is read from env (optionally via `.env` using python-dotenv).
    - Do not hardcode keys in code.
    """

    openai_api_key: str
    default_model: str
    log_level: str
    output_dir: Path

    enable_image_api: bool
    image_model: str

    @staticmethod
    def _to_bool(value: str | None, default: bool = False) -> bool:
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}

    @classmethod
    def load(cls) -> "Config":
        load_dotenv()

        output_dir = Path(os.getenv("OUTPUT_DIR", "output")).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        return cls(
            openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
            default_model=os.getenv("DEFAULT_MODEL", "gpt-4o-mini").strip(),
            log_level=os.getenv("LOG_LEVEL", "INFO").strip(),
            output_dir=output_dir,
            enable_image_api=cls._to_bool(os.getenv("ENABLE_IMAGE_API"), default=False),
            image_model=os.getenv("IMAGE_MODEL", "gpt-image-1").strip(),
        )


# Backwards-compatible module-level constants (older code imports these).
_CONFIG = Config.load()
OPENAI_API_KEY = _CONFIG.openai_api_key
DEFAULT_MODEL = _CONFIG.default_model
LOG_LEVEL = _CONFIG.log_level
OUTPUT_DIR = str(_CONFIG.output_dir)

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Luôn tìm .env cạnh thư mục gốc repo (cấp với frontend/), không phụ thuộc cwd khi chạy uvicorn/python.
_REPO_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Config:
    """
    Centralized configuration loaded from environment variables.

    Security:
    - API keys are read from env (optionally via `.env` using python-dotenv).
    - Do not hardcode keys in code.
    """

    anthropic_api_key: str
    openai_api_key: str
    database_url: str
    default_model: str
    log_level: str
    output_dir: Path

    enable_image_api: bool
    image_model: str

    # Dịch flashcard EN→VI (nhập từ trực tiếp): chỉ OpenAI + OPENAI_API_KEY.
    flash_translate_openai_model: str
    llm_provider: str

    @staticmethod
    def _to_bool(value: str | None, default: bool = False) -> bool:
        if value is None:
            return default
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}

    @classmethod
    def load(cls) -> "Config":
        for env_name in (".env", ".env.local"):
            path = _REPO_ROOT / env_name
            if path.is_file():
                load_dotenv(path)

        output_dir = Path(os.getenv("OUTPUT_DIR", "output")).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        return cls(
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", "").strip(),
            openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
            database_url=os.getenv("DATABASE_URL", "").strip(),
            default_model=os.getenv("DEFAULT_MODEL", "claude-sonnet-4-20250514").strip(),
            log_level=os.getenv("LOG_LEVEL", "INFO").strip(),
            output_dir=output_dir,
            enable_image_api=cls._to_bool(os.getenv("ENABLE_IMAGE_API"), default=False),
            image_model=os.getenv("IMAGE_MODEL", "gpt-image-1").strip(),
            flash_translate_openai_model=(
                (os.getenv("FLASH_TRANSLATE_OPENAI_MODEL") or "gpt-4o-mini").strip()
                or "gpt-4o-mini"
            ),
            llm_provider=os.getenv("LLM_PROVIDER", "anthropic").strip().lower(),
        )


# Backwards-compatible module-level constants (older code imports these).
_CONFIG = Config.load()
ANTHROPIC_API_KEY = _CONFIG.anthropic_api_key
OPENAI_API_KEY = _CONFIG.openai_api_key
DATABASE_URL = _CONFIG.database_url
DEFAULT_MODEL = _CONFIG.default_model
LOG_LEVEL = _CONFIG.log_level
OUTPUT_DIR = str(_CONFIG.output_dir)

FLASH_TRANSLATE_OPENAI_MODEL = _CONFIG.flash_translate_openai_model
LLM_PROVIDER = _CONFIG.llm_provider

# Mọi client OpenAI trong repo truyền base_url này — tránh SDK đọc OPENAI_BASE_URL từ môi trường và gọi nhầm host.
OPENAI_OFFICIAL_BASE_URL = "https://api.openai.com/v1"

"""HTTP client cho dịch flash EN→VI (OpenAI API tại api.openai.com)."""

from __future__ import annotations

import logging
from threading import Lock

import httpx
from openai import OpenAI

from .config import OPENAI_API_KEY, OPENAI_OFFICIAL_BASE_URL

logger = logging.getLogger(__name__)

_lock = Lock()
_openai_flash: OpenAI | None = None


def _build_flash_http_client() -> httpx.Client:
    # Bắt buộc trust_env=False: nếu không, HTTP(S)_PROXY trong Windows có thể
    # đẩy request tới gateway kiểu OpenRouter dù base_url đã là api.openai.com.
    return httpx.Client(trust_env=False, timeout=httpx.Timeout(60.0, connect=10.0))


def get_openai_flash_client() -> OpenAI:
    global _openai_flash
    if not (OPENAI_API_KEY or "").strip():
        raise ValueError("OPENAI_API_KEY chưa cấu hình trong .env")
    if _openai_flash is not None:
        return _openai_flash
    with _lock:
        if _openai_flash is None:
            http_client = _build_flash_http_client()
            _openai_flash = OpenAI(
                api_key=OPENAI_API_KEY,
                base_url=OPENAI_OFFICIAL_BASE_URL,
                http_client=http_client,
            )
            logger.info(
                "Flash translate OpenAI client: base_url=%s httpx.trust_env=%s",
                OPENAI_OFFICIAL_BASE_URL,
                getattr(http_client, "trust_env", None),
            )
    return _openai_flash


def flash_translate_client_public_info() -> dict[str, str | bool | None]:
    """Cho /api/health: xác nhận endpoint và tắt proxy từ biến môi trường."""
    if not (OPENAI_API_KEY or "").strip():
        return {"flash_openai_base_url": None, "flash_httpx_trust_env": None}
    c = get_openai_flash_client()
    inner = getattr(c, "_client", None)
    return {
        "flash_openai_base_url": str(getattr(c, "base_url", "") or "") or None,
        "flash_httpx_trust_env": getattr(inner, "trust_env", None),
    }

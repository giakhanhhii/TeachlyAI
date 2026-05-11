"""
Teachly local preview: API chat + static frontend on one port (default 8000).

Chạy từ thư mục gốc repo (cổng tùy chọn qua TEACHLY_PORT khi dùng run_teachly.py):
  python run_teachly.py
  hoặc: uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000

Mở trình duyệt: cùng host/cổng với lệnh trên (vd http://127.0.0.1:8000/ ).
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from anthropic import Anthropic
from openai import OpenAI
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from .config import (
    ANTHROPIC_API_KEY,
    DEFAULT_MODEL,
    FLASH_TRANSLATE_OPENAI_MODEL,
    LLM_PROVIDER,
    LOG_LEVEL,
    OPENAI_API_KEY,
    OPENAI_OFFICIAL_BASE_URL,
)
from .flash_translate_clients import flash_translate_client_public_info
from .flash_translate_service import flash_term_translate_en_to_vi, flash_terms_translate_batch
from .database import DatabaseManager
from .ai_content_generate import (
    generate_slide_content,
    generate_quiz_content,
    generate_flash_content,
    generate_fullset_content,
    generate_autofill_slide,
    generate_autofill_quiz,
    generate_autofill_flash,
    generate_autofill_fullset,
    TOPIC_POOL,
)

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
if not FRONTEND_DIR.is_dir():
    _alt = REPO_ROOT / "Frontend"
    if _alt.is_dir():
        FRONTEND_DIR = _alt

MOCK_DIR = REPO_ROOT / "backend" / "mock"
MOCK_FILES = {
    "quiz": "quiz_thpt_en.json",
    "flashcard": "flashcard_en.json",
    "slide": "slide_thpt_en.json",
    "thptqg_fulltest": "thptqg_fulltest.json",
}

TEACHLY_SYSTEM = """Bạn là Teachly AI, trợ lý hỗ trợ giáo viên và học sinh ôn Tiếng Anh THPT QG (Việt Nam).
Trả lời rõ ràng, thân thiện; ưu tiên tiếng Việt khi người dùng dùng tiếng Việt.
Khi người dùng cần **bộ slide** (hoặc bạn sinh nội dung slide), chỉ trả về **một JSON** dạng mảng các đối tượng nhỏ gọn:
[{"title":"...","bullets":["...","..."]}, ...]
Không bọc markdown, không HTML/CSS, không nhãn hiệu hay font — giao diện do ứng dụng áp mẫu có sẵn.
Nếu được hỏi về quiz, flashcard hoặc hình ảnh minh họa, gợi ý cấu trúc nội dung hữu ích (không cần tạo file thật trừ khi được mô tả rõ công cụ ngoài chat)."""

class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=32000)
    thread_id: str | None = None


class ChatOut(BaseModel):
    thread_id: str
    reply: str


class SessionSummary(BaseModel):
    thread_id: str
    created_at: str
    updated_at: str


class SessionListOut(BaseModel):
    sessions: list[SessionSummary]


class SessionMessage(BaseModel):
    id: int
    role: str
    text: str
    created_at: str


class SessionMessagesOut(BaseModel):
    thread_id: str
    limit: int
    offset: int
    total: int
    has_more: bool
    messages: list[SessionMessage]


class FlashTranslateIn(BaseModel):
    term: str = Field(..., min_length=1, max_length=240)


class FlashTranslateOut(BaseModel):
    translation: str


class FlashTranslateBatchIn(BaseModel):
    terms: list[str] = Field(..., min_length=1, max_length=200)


class FlashTranslateBatchOut(BaseModel):
    translations: dict[str, str]


class SlideExportIn(BaseModel):
    title: str = Field(default="teachly-slides", max_length=240)
    srcdoc: str = Field(..., min_length=1, max_length=2_000_000)


class AiGenerateIn(BaseModel):
    type: str = Field(..., pattern=r"^(slide|quiz|flashcard|fullset)$")


class AiAutofillIn(BaseModel):
    type: str = Field(..., pattern=r"^(slide|quiz|flash|fullset)$")


def _flash_translate_config_ok() -> bool:
    return bool(OPENAI_API_KEY)


def _flash_translate_missing_env_detail() -> str:
    return (
        "Chưa cấu hình OPENAI_API_KEY trong .env "
        f"(dịch tự động thẻ nhập từ vựng dùng OpenAI, model {FLASH_TRANSLATE_OPENAI_MODEL})."
    )


def _http_exc_from_flash_translate(exc: BaseException) -> HTTPException:
    """Chuẩn hoá lỗi SDK (429 quota, 401 key…) thành HTTPException có detail ngắn cho UI."""
    code = getattr(exc, "status_code", None)
    if code == 429:
        detail = (
            "OpenAI: hết hạn ngạch (429). Đợi vài phút, kiểm tra billing/plan, "
            "hoặc giảm song song (FLASH_TRANSLATE_PARALLEL_CHUNKS=1 trong .env)."
        )
        return HTTPException(status_code=503, detail=detail)
    if code in (401, 403):
        detail = "OpenAI từ chối API key (401/403). Kiểm tra OPENAI_API_KEY trong .env."
        return HTTPException(status_code=503, detail=detail)
    low = str(exc).lower()
    if "429" in str(exc) or "rate limit" in low:
        detail = (
            "OpenAI báo rate limit / quota. Thử lại sau hoặc kiểm tra usage tại platform.openai.com."
        )
        return HTTPException(status_code=503, detail=detail)
    return HTTPException(
        status_code=502,
        detail=(str(exc) or "Lỗi gọi API dịch flash.").strip()[:900],
    )


def _get_client() -> Anthropic | OpenAI:
    if LLM_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="Chưa cấu hình OPENAI_API_KEY. Tạo file .env từ .env.example và thêm key.",
            )
        return OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_OFFICIAL_BASE_URL)
    else:
        if not ANTHROPIC_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="Chưa cấu hình ANTHROPIC_API_KEY. Tạo file .env từ .env.example và thêm key.",
            )
        return Anthropic(api_key=ANTHROPIC_API_KEY)


def _run_reply(client: Anthropic | OpenAI, history: list[dict]) -> str:
    if isinstance(client, OpenAI):
        # OpenAI expects system prompt as a message
        messages = [{"role": "system", "content": TEACHLY_SYSTEM}] + history
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=messages,
            max_tokens=4096,
        )
        return response.choices[0].message.content or "(Không có nội dung phản hồi.)"
    else:
        # Anthropic SDK handles system prompt separately
        response = client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=4096,
            system=TEACHLY_SYSTEM,
            messages=history,
        )
        parts: list[str] = []
        for block in response.content:
            if getattr(block, "type", None) == "text":
                parts.append(block.text)
        return "".join(parts).strip() or "(Không có nội dung phản hồi.)"


def _cors_allow_origins() -> list[str]:
    """Dev: thêm dải cổng 8000–8030 + TEACHLY_CORS_EXTRA (phân tách bằng dấu phẩy)."""
    seen: set[str] = set()
    out: list[str] = []

    def add(origin: str) -> None:
        u = (origin or "").strip().rstrip("/")
        if not u or u in seen:
            return
        seen.add(u)
        out.append(u)

    for port in range(8000, 8031):
        add(f"http://127.0.0.1:{port}")
        add(f"http://localhost:{port}")
    for o in (
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ):
        add(o)
    extra = os.getenv("TEACHLY_CORS_EXTRA", "").strip()
    if extra:
        for part in extra.split(","):
            add(part.strip())
    return out


def _safe_export_filename(title: str, suffix: str) -> str:
    stem = re.sub(r"[^\w\- ]+", "", (title or "").strip(), flags=re.UNICODE).strip()
    stem = re.sub(r"\s+", " ", stem).strip().replace(" ", "-")
    if not stem:
        stem = "teachly-slides"
    return f"{stem}{suffix}"


def _cleanup_export_dir(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)


app = FastAPI(title="Teachly Local", version="0.1.0")
db = DatabaseManager(REPO_ROOT / "data" / "teachly.sqlite3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    """Phản hồi có `teachly_backend` + `health_schema_version` để không nhầm với API khác (vd. health có `openrouter_configured`)."""
    flash_info = flash_translate_client_public_info()
    return {
        "ok": True,
        "teachly_backend": True,
        "health_schema_version": 2,
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "openai_configured": bool(OPENAI_API_KEY),
        # Dịch flash EN→VI luôn gọi api.openai.com (xem flash_openai_base_url), không route qua OpenRouter.
        "openrouter_used_for_flash": False,
        "flash_translate_model": FLASH_TRANSLATE_OPENAI_MODEL,
        "flash_translate_ready": _flash_translate_config_ok(),
        "flash_openai_base_url": flash_info.get("flash_openai_base_url"),
        "flash_httpx_trust_env": flash_info.get("flash_httpx_trust_env"),
        "frontend_dir_exists": FRONTEND_DIR.is_dir(),
    }


@app.post("/api/flash/translate-term", response_model=FlashTranslateOut)
def flash_translate_term(body: FlashTranslateIn):
    """Dịch một từ/cụm EN→VI qua OpenAI (tối thiểu 2, tối đa 3 nghĩa Việt gần nhất)."""
    if not _flash_translate_config_ok():
        raise HTTPException(status_code=503, detail=_flash_translate_missing_env_detail())
    term = body.term.strip()
    try:
        out = flash_term_translate_en_to_vi(term)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Flash translate (single) failed")
        raise _http_exc_from_flash_translate(e) from e
    if not out:
        raise HTTPException(status_code=502, detail="Model trả về nghĩa rỗng.")
    return FlashTranslateOut(translation=out)


@app.post("/api/flash/translate-terms", response_model=FlashTranslateBatchOut)
def flash_translate_terms(body: FlashTranslateBatchIn):
    """Dịch nhiều từ/cụm EN→VI theo lô qua OpenAI (mỗi mục: tối thiểu 2, tối đa 3 nghĩa)."""
    if not _flash_translate_config_ok():
        raise HTTPException(status_code=503, detail=_flash_translate_missing_env_detail())
    cleaned: list[str] = []
    for t in body.terms:
        if not isinstance(t, str):
            continue
        s = t.strip()
        if not s:
            continue
        if len(s) > 240:
            raise HTTPException(
                status_code=400,
                detail=f"Mục quá dài (tối đa 240 ký tự): {s[:48]}…",
            )
        cleaned.append(s)
    if not cleaned:
        raise HTTPException(status_code=400, detail="Danh sách mục dịch rỗng.")
    try:
        out = flash_terms_translate_batch(cleaned)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Flash translate (batch) failed")
        raise _http_exc_from_flash_translate(e) from e
    if not out:
        raise HTTPException(status_code=502, detail="Model trả về bản dịch rỗng.")
    return FlashTranslateBatchOut(translations=out)


@app.get("/api/mock/{name}")
def mock_bundle(name: str):
    """JSON mẫu cho quiz / flashcard / slide — thay bằng API sinh nội dung khi có AI pipeline."""
    if name not in MOCK_FILES:
        raise HTTPException(status_code=404, detail="Unknown mock resource.")
    path = MOCK_DIR / MOCK_FILES[name]
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Mock file missing.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        logger.exception("Invalid mock JSON: %s", path)
        raise HTTPException(status_code=500, detail=f"Invalid JSON: {e}") from e


@app.post("/api/ai-generate")
def ai_generate(body: AiGenerateIn):
    """Generate slide / quiz / flashcard (or fullset) via GPT-4o Mini.

    For fullset, all three content types share the same random topic so the
    deck is internally consistent.  Individual types each pick a random topic.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Chưa cấu hình OPENAI_API_KEY trong .env — không thể sinh nội dung AI.",
        )
    import random as _random

    try:
        kind = body.type
        if kind == "fullset":
            return generate_fullset_content()
        topic = _random.choice(TOPIC_POOL)
        logger.info("AI generate: type=%s topic=%s", kind, topic)
        if kind == "slide":
            return generate_slide_content(topic)
        if kind == "quiz":
            return generate_quiz_content(topic)
        if kind == "flashcard":
            return generate_flash_content(topic)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("AI content generation failed (type=%s)", body.type)
        code = getattr(exc, "status_code", None)
        if code == 429:
            raise HTTPException(
                status_code=503,
                detail="OpenAI rate limit / quota. Vui lòng thử lại sau.",
            ) from exc
        if code in (401, 403):
            raise HTTPException(
                status_code=503,
                detail="OpenAI từ chối API key. Kiểm tra OPENAI_API_KEY trong .env.",
            ) from exc
        raise HTTPException(
            status_code=502,
            detail=(str(exc) or "Lỗi sinh nội dung AI.").strip()[:600],
        ) from exc


@app.get("/api/status")
def api_status():
    """Lightweight config status — returns which API keys are set (no secrets exposed)."""
    return {
        "openai_key_ok": bool(OPENAI_API_KEY),
        "anthropic_key_ok": bool(ANTHROPIC_API_KEY),
        "ai_content_model": "gpt-4o-mini",
        "ai_threshold_plays": 3,
    }


@app.post("/api/ai-autofill")
def ai_autofill(body: AiAutofillIn):
    """Return AI-generated form field values for autofill (slide/quiz/flash/fullset).

    Lightweight call — returns only topic + form fields, not full content.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Chưa cấu hình OPENAI_API_KEY trong .env — không thể sinh gợi ý AI.",
        )
    try:
        kind = body.type
        if kind == "slide":
            return generate_autofill_slide()
        if kind == "quiz":
            return generate_autofill_quiz()
        if kind == "flash":
            return generate_autofill_flash()
        return generate_autofill_fullset()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("AI autofill failed (type=%s)", body.type)
        code = getattr(exc, "status_code", None)
        if code == 429:
            raise HTTPException(status_code=503, detail="OpenAI rate limit. Thử lại sau.") from exc
        if code in (401, 403):
            raise HTTPException(status_code=503, detail="OpenAI từ chối API key.") from exc
        raise HTTPException(
            status_code=502,
            detail=(str(exc) or "Lỗi gợi ý AI autofill.").strip()[:400],
        ) from exc


@app.post("/api/slides/export-pdf")
def export_slide_pdf(body: SlideExportIn):
    srcdoc = body.srcdoc.strip()
    if not srcdoc:
        raise HTTPException(status_code=400, detail="Nội dung slide để export đang trống.")

    title = body.title.strip() or "teachly-slides"
    file_name = _safe_export_filename(title, ".pdf")
    temp_dir = Path(tempfile.mkdtemp(prefix="teachly-slide-pdf-"))
    payload_path = temp_dir / "payload.json"
    output_path = temp_dir / file_name
    script_path = REPO_ROOT / "scripts" / "export_slide_pdf.mjs"

    try:
        payload_path.write_text(
            json.dumps({"title": title, "srcdoc": srcdoc}, ensure_ascii=False),
            encoding="utf-8",
        )
        result = subprocess.run(
            ["node", str(script_path), str(payload_path), str(output_path)],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except FileNotFoundError as exc:
        _cleanup_export_dir(temp_dir)
        raise HTTPException(
            status_code=503,
            detail="Không tìm thấy Node.js để tạo PDF slide.",
        ) from exc
    except subprocess.TimeoutExpired as exc:
        _cleanup_export_dir(temp_dir)
        raise HTTPException(
            status_code=504,
            detail="Tạo PDF slide quá lâu, vui lòng thử lại với bộ slide nhỏ hơn.",
        ) from exc
    except Exception as exc:
        _cleanup_export_dir(temp_dir)
        logger.exception("Unexpected slide PDF export failure")
        raise HTTPException(status_code=500, detail="Không thể khởi chạy export PDF slide.") from exc

    if result.returncode != 0 or not output_path.is_file():
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        logger.error(
            "Slide PDF export failed (code=%s)\nstdout=%s\nstderr=%s",
            result.returncode,
            stdout[:2000],
            stderr[:2000],
        )
        _cleanup_export_dir(temp_dir)
        raise HTTPException(
            status_code=500,
            detail=stderr or stdout or "Không thể tạo PDF từ bộ slide hiện tại.",
        )

    return FileResponse(
        path=output_path,
        media_type="application/pdf",
        filename=file_name,
        background=BackgroundTask(_cleanup_export_dir, temp_dir),
    )


@app.post("/api/chat", response_model=ChatOut)
def chat(body: ChatIn):
    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Tin nhắn trống.")

    client = _get_client()

    tid, user_message_id = db.append_message(body.thread_id, "user", text)
    history = db.get_recent_history(tid, limit=20, through_message_id=user_message_id)

    try:
        reply = _run_reply(client, history)
    except Exception as e:
        logger.exception("Chat error")
        db.delete_message_by_id(user_message_id)
        raise HTTPException(status_code=502, detail=str(e) or "Lỗi gọi mô hình.") from e

    db.append_message(tid, "assistant", reply)

    return ChatOut(thread_id=tid, reply=reply)


@app.get("/api/sessions", response_model=SessionListOut)
def list_sessions(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    sessions = [SessionSummary(**s) for s in db.list_sessions(limit=limit, offset=offset)]
    return SessionListOut(sessions=sessions)


@app.get("/api/sessions/{thread_id}/messages", response_model=SessionMessagesOut)
def get_session_messages(
    thread_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    rows, total = db.get_messages_page(thread_id, limit=limit, offset=offset)
    messages = [
        SessionMessage(
            id=item["id"],
            role="bot" if item["role"] == "assistant" else item["role"],
            text=item["content"],
            created_at=item["created_at"],
        )
        for item in rows
    ]
    has_more = offset + len(messages) < total
    return SessionMessagesOut(
        thread_id=thread_id,
        limit=limit,
        offset=offset,
        total=total,
        has_more=has_more,
        messages=messages,
    )


@app.get("/")
def root():
    if not FRONTEND_DIR.is_dir():
        return {
            "error": "Không tìm thấy thư mục frontend/",
            "hint": "Chạy server từ thư mục gốc repo (cùng cấp với frontend/).",
        }
    return RedirectResponse(url="/main_hub.html", status_code=302)


SLIDE_HTML_DIR = REPO_ROOT / "frontend" / "slide_html_template"
if SLIDE_HTML_DIR.is_dir():
    app.mount(
        "/slide_html_template",
        StaticFiles(directory=str(SLIDE_HTML_DIR), html=True),
        name="slide_html",
    )

if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

"""
Teachly local preview: API chat + static frontend on one port (default 8000).

Chạy từ thư mục gốc repo:
  uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000

Mở trình duyệt: http://127.0.0.1:8000/
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path
from threading import Lock

from anthropic import Anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import ANTHROPIC_API_KEY, DEFAULT_MODEL, LOG_LEVEL

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"
if not FRONTEND_DIR.is_dir():
    _alt = REPO_ROOT / "Frontend"
    if _alt.is_dir():
        FRONTEND_DIR = _alt

TEACHLY_SYSTEM = """Bạn là Teachly AI, trợ lý hỗ trợ giáo viên và học sinh ôn Tiếng Anh THPT QG (Việt Nam).
Trả lời rõ ràng, thân thiện; ưu tiên tiếng Việt khi người dùng dùng tiếng Việt.
Nếu được hỏi về slide, quiz, flashcard hoặc hình ảnh minh họa, gợi ý cấu trúc nội dung hữu ích (không cần tạo file thật trừ khi được mô tả rõ công cụ ngoài chat)."""

_threads: dict[str, list[dict]] = {}
_threads_lock = Lock()


class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=32000)
    thread_id: str | None = None


class ChatOut(BaseModel):
    thread_id: str
    reply: str


def _get_client() -> Anthropic:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Chưa cấu hình ANTHROPIC_API_KEY. Tạo file .env từ .env.example và thêm key.",
        )
    return Anthropic(api_key=ANTHROPIC_API_KEY)


def _run_reply(client: Anthropic, history: list[dict]) -> str:
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


app = FastAPI(title="Teachly Local", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
        "frontend_dir_exists": FRONTEND_DIR.is_dir(),
    }


@app.post("/api/chat", response_model=ChatOut)
def chat(body: ChatIn):
    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Tin nhắn trống.")

    client = _get_client()

    with _threads_lock:
        tid = body.thread_id
        if not tid or tid not in _threads:
            tid = str(uuid.uuid4())
            _threads[tid] = []

        history = _threads[tid]
        history.append({"role": "user", "content": text})

    try:
        reply = _run_reply(client, history)
    except Exception as e:
        logger.exception("Chat error")
        with _threads_lock:
            if tid in _threads and _threads[tid] and _threads[tid][-1].get("role") == "user":
                _threads[tid].pop()
        raise HTTPException(status_code=502, detail=str(e) or "Lỗi gọi mô hình.") from e

    with _threads_lock:
        if tid in _threads:
            _threads[tid].append({"role": "assistant", "content": reply})

    return ChatOut(thread_id=tid, reply=reply)


@app.get("/")
def root():
    if not FRONTEND_DIR.is_dir():
        return {
            "error": "Không tìm thấy thư mục frontend/",
            "hint": "Chạy server từ thư mục gốc repo (cùng cấp với frontend/).",
        }
    return RedirectResponse(url="/main_hub.html", status_code=302)


if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

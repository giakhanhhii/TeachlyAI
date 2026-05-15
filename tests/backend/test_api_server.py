from __future__ import annotations

from types import SimpleNamespace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import src.api_server as api_server
from src.database import DatabaseManager


@pytest.fixture
def client_with_temp_db(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    db_path = tmp_path / "teachly.sqlite3"
    temp_db = DatabaseManager(db_path)

    monkeypatch.setattr(api_server, "db", temp_db)
    monkeypatch.setattr(api_server, "_get_client", lambda: object())
    monkeypatch.setattr(api_server, "_run_reply", lambda _client, _history: "Mocked assistant reply")

    try:
        with TestClient(api_server.app) as client:
            yield client, temp_db, monkeypatch
    finally:
        temp_db._conn.close()


def test_health_reports_expected_shape(client_with_temp_db):
    client, _, _ = client_with_temp_db

    response = client.get("/api/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["teachly_backend"] is True
    assert payload["health_schema_version"] == 2
    assert "flash_translate_ready" in payload


def test_chat_success_persists_user_and_assistant_messages(client_with_temp_db):
    client, temp_db, _ = client_with_temp_db

    response = client.post("/api/chat", json={"message": "Xin chao backend"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["reply"] == "Mocked assistant reply"
    assert payload["thread_id"]

    rows, total = temp_db.get_messages_page(payload["thread_id"], limit=10, offset=0)
    assert total == 2
    assert [row["role"] for row in rows] == ["user", "assistant"]
    assert [row["content"] for row in rows] == ["Xin chao backend", "Mocked assistant reply"]


def test_chat_whitespace_input_returns_400(client_with_temp_db):
    client, _, _ = client_with_temp_db

    response = client.post("/api/chat", json={"message": "   "})

    assert response.status_code == 400
    assert response.json()["detail"] == "Tin nhắn trống."


def test_chat_empty_string_payload_returns_422(client_with_temp_db):
    client, _, _ = client_with_temp_db

    response = client.post("/api/chat", json={"message": ""})

    assert response.status_code == 422


def test_chat_failure_removes_just_added_user_message(client_with_temp_db):
    client, temp_db, monkeypatch = client_with_temp_db

    def raise_error(_client, _history):
        raise RuntimeError("mock llm failure")

    monkeypatch.setattr(api_server, "_run_reply", raise_error)

    response = client.post("/api/chat", json={"message": "Trigger failure"})

    assert response.status_code == 502

    sessions = temp_db.list_sessions(limit=10, offset=0)
    assert len(sessions) == 1
    thread_id = sessions[0]["thread_id"]
    rows, total = temp_db.get_messages_page(thread_id, limit=10, offset=0)
    assert total == 0
    assert rows == []


def test_list_sessions_honors_limit_and_offset(client_with_temp_db):
    client, temp_db, _ = client_with_temp_db

    temp_db.append_message("thread-a", "user", "one")
    temp_db.append_message("thread-b", "user", "two")
    temp_db.append_message("thread-c", "user", "three")

    response = client.get("/api/sessions", params={"limit": 1, "offset": 1})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["sessions"]) == 1
    assert payload["sessions"][0]["thread_id"] in {"thread-a", "thread-b", "thread-c"}


def test_session_messages_returns_role_mapping_and_pagination(client_with_temp_db):
    client, temp_db, _ = client_with_temp_db

    temp_db.append_message("thread-role-map", "user", "hello")
    temp_db.append_message("thread-role-map", "assistant", "world")

    response = client.get("/api/sessions/thread-role-map/messages", params={"limit": 1, "offset": 0})

    assert response.status_code == 200
    payload = response.json()
    assert payload["thread_id"] == "thread-role-map"
    assert payload["limit"] == 1
    assert payload["offset"] == 0
    assert payload["total"] == 2
    assert payload["has_more"] is True
    assert payload["messages"] == [
        {
            "id": 2,
            "role": "bot",
            "text": "world",
            "created_at": payload["messages"][0]["created_at"],
        }
    ]


def test_export_slide_pdf_returns_file_response(client_with_temp_db, tmp_path: Path):
    client, _, monkeypatch = client_with_temp_db

    def fake_run(cmd, cwd, capture_output, text, timeout, check):
        del cmd, cwd, capture_output, text, timeout, check
        output_path = Path(fake_run.output_path)
        output_path.write_bytes(b"%PDF-1.4 mock pdf")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    fake_run.output_path = ""

    original_mkdtemp = api_server.tempfile.mkdtemp

    def fake_mkdtemp(prefix: str):
        return original_mkdtemp(prefix=prefix, dir=tmp_path)

    def run_with_output_path(cmd, cwd, capture_output, text, timeout, check):
        fake_run.output_path = cmd[-1]
        return fake_run(cmd, cwd, capture_output, text, timeout, check)

    monkeypatch.setattr(api_server.tempfile, "mkdtemp", fake_mkdtemp)
    monkeypatch.setattr(api_server.subprocess, "run", run_with_output_path)

    response = client.post(
        "/api/slides/export-pdf",
        json={"title": "Bo slide 2026", "srcdoc": "<!DOCTYPE html><html><body>deck</body></html>"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-1.4")


def test_export_slide_pdf_surfaces_script_failure(client_with_temp_db):
    client, _, monkeypatch = client_with_temp_db

    monkeypatch.setattr(
        api_server.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=1, stdout="", stderr="render failed"),
    )

    response = client.post(
        "/api/slides/export-pdf",
        json={"title": "Bo slide 2026", "srcdoc": "<!DOCTYPE html><html><body>deck</body></html>"},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "render failed"


def test_file_upload_blocks_explicit_nsfw_content(client_with_temp_db):
    client, _, monkeypatch = client_with_temp_db

    monkeypatch.setattr(api_server, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        api_server,
        "extract_text",
        lambda *_args, **_kwargs: "This upload contains porn and blowjob scenes.",
    )

    response = client.post(
        "/api/file-upload",
        data={"type": "slide", "count": "10", "notes": ""},
        files={"file": ("unsafe.txt", b"ignored", "text/plain")},
    )

    assert response.status_code == 403
    assert "nội dung người lớn" in response.json()["detail"]


def test_file_upload_blocks_illegal_instruction_content(client_with_temp_db):
    client, _, monkeypatch = client_with_temp_db

    monkeypatch.setattr(api_server, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        api_server,
        "extract_text",
        lambda *_args, **_kwargs: "Step by step tutorial on how to make a bomb at home.",
    )

    response = client.post(
        "/api/file-upload",
        data={"type": "quiz", "count": "8", "notes": ""},
        files={"file": ("unsafe.txt", b"ignored", "text/plain")},
    )

    assert response.status_code == 403
    assert "bất hợp pháp" in response.json()["detail"]


def test_file_upload_allows_normal_educational_content(client_with_temp_db):
    client, _, monkeypatch = client_with_temp_db

    monkeypatch.setattr(api_server, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        api_server,
        "extract_text",
        lambda *_args, **_kwargs: (
            "Illegal logging harms biodiversity in the Amazon rainforest. "
            "Students should discuss conservation and climate solutions."
        ),
    )
    monkeypatch.setattr(
        api_server,
        "generate_slide_from_document",
        lambda document_text, count, notes: {
            "slides": [{"title": "Climate", "bullets": [document_text[:20], str(count), notes]}]
        },
    )

    response = client.post(
        "/api/file-upload",
        data={"type": "slide", "count": "6", "notes": "Focus on reading skills"},
        files={"file": ("safe.txt", b"ignored", "text/plain")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["slides"][0]["title"] == "Climate"


def test_file_upload_rejects_document_without_readable_text(client_with_temp_db):
    client, _, monkeypatch = client_with_temp_db

    monkeypatch.setattr(api_server, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        api_server,
        "extract_text",
        lambda *_args, **_kwargs: "[NO_TEXT_DETECTED]",
    )

    response = client.post(
        "/api/file-upload",
        data={"type": "flashcard", "count": "12", "notes": ""},
        files={"file": ("space.jpg", b"ignored", "image/jpeg")},
    )

    assert response.status_code == 422
    assert "ít nhất 1 trang chứa văn bản rõ ràng" in response.json()["detail"]


def test_file_upload_rejects_dashboard_like_uploads(client_with_temp_db):
    client, _, monkeypatch = client_with_temp_db

    monkeypatch.setattr(api_server, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        api_server,
        "extract_text",
        lambda *_args, **_kwargs: (
            "Dashboard overview revenue active users conversion rate sessions retention "
            "search filter export settings."
        ),
    )

    response = client.post(
        "/api/file-upload",
        data={"type": "slide", "count": "8", "notes": "Focus on reading skills"},
        files={"file": ("dashboard.png", b"ignored", "image/png")},
    )

    assert response.status_code == 403
    assert "dashboard" in response.json()["detail"] or "giảng dạy Tiếng Anh" in response.json()["detail"]

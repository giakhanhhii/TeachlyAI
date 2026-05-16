from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import src.api_server as api_server
from src.database import DatabaseManager


@pytest.fixture
def client_with_temp_db(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    db_path = tmp_path / "teachly-auth.sqlite3"
    temp_db = DatabaseManager(db_path)

    monkeypatch.setattr(api_server, "db", temp_db)
    monkeypatch.setattr(api_server, "_get_client", lambda: object())
    monkeypatch.setattr(api_server, "_run_reply", lambda _client, _history: "Mocked assistant reply")

    try:
        with TestClient(api_server.app) as client:
            yield client, temp_db
    finally:
        temp_db.close()


def _register_and_login(client: TestClient, username: str, password: str = "secret123"):
    register_response = client.post(
        "/api/auth/register",
        json={"username": username, "password": password},
    )
    assert register_response.status_code == 200

    login_response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert login_response.status_code == 200
    token = login_response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_auth_register_login_and_me_roundtrip(client_with_temp_db):
    client, _ = client_with_temp_db

    headers = _register_and_login(client, "teacher01")
    response = client.get("/api/auth/me", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["username"] == "teacher01"
    assert payload["user"]["profileLabel"] == "Pro"


def test_chat_history_isolated_per_account(client_with_temp_db):
    client, temp_db = client_with_temp_db

    teacher_headers = _register_and_login(client, "teacher01")
    student_headers = _register_and_login(client, "student01")
    teacher_user_id = temp_db.get_user_by_username("teacher01")["id"]
    student_user_id = temp_db.get_user_by_username("student01")["id"]

    teacher_chat = client.post(
        "/api/chat",
        json={"message": "How do I improve English listening?"},
        headers=teacher_headers,
    )
    assert teacher_chat.status_code == 200
    teacher_thread = teacher_chat.json()["thread_id"]

    student_chat = client.post(
        "/api/chat",
        json={"message": "How do I learn English vocabulary?"},
        headers=student_headers,
    )
    assert student_chat.status_code == 200
    student_thread = student_chat.json()["thread_id"]

    teacher_rows, teacher_total = temp_db.get_messages_page(teacher_user_id, teacher_thread, limit=10, offset=0)
    student_rows, student_total = temp_db.get_messages_page(student_user_id, student_thread, limit=10, offset=0)

    assert teacher_total == 2
    assert student_total == 2
    assert teacher_rows[0]["content"] == "How do I improve English listening?"
    assert student_rows[0]["content"] == "How do I learn English vocabulary?"

    forbidden = client.get(
        f"/api/sessions/{teacher_thread}/messages",
        headers=student_headers,
        params={"limit": 20, "offset": 0},
    )
    assert forbidden.status_code == 200
    assert forbidden.json()["messages"] == []


def test_user_state_persists_sessions_for_login_restore(client_with_temp_db):
    client, _ = client_with_temp_db
    headers = _register_and_login(client, "teacher01")

    save_response = client.put(
        "/api/auth/state",
        headers=headers,
        json={
            "sessions": [
                {
                    "sessionId": "session-1",
                    "title": "Đoạn chat 1",
                    "thread_id": "thread-1",
                    "messages": [{"role": "user", "text": "hello"}],
                    "messagesLoaded": True,
                    "hasMoreRemote": False,
                    "remoteOffset": 1,
                    "pinned": False,
                    "experienceState": None,
                }
            ],
            "activeSessionIndex": 0,
        },
    )
    assert save_response.status_code == 200

    load_response = client.get("/api/auth/state", headers=headers)
    assert load_response.status_code == 200
    payload = load_response.json()
    assert payload["activeSessionIndex"] == 0
    assert payload["sessions"][0]["sessionId"] == "session-1"
    assert payload["sessions"][0]["thread_id"] == "thread-1"

from __future__ import annotations

import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
import psycopg2.pool


class DatabaseManager:
    def __init__(self, database_url: str | Path):
      self._driver = self._resolve_driver(database_url)
      self._sqlite_conn: sqlite3.Connection | None = None
      self._pool: psycopg2.pool.ThreadedConnectionPool | None = None
      if self._driver == "sqlite":
          sqlite_path = self._resolve_sqlite_path(database_url)
          self._sqlite_conn = sqlite3.connect(str(sqlite_path), check_same_thread=False)
          self._sqlite_conn.row_factory = sqlite3.Row
          self._sqlite_conn.execute("PRAGMA foreign_keys = ON;")
      else:
          self._pool = psycopg2.pool.ThreadedConnectionPool(
              minconn=1,
              maxconn=10,
              dsn=str(database_url),
          )
      self._initialize()

    @staticmethod
    def _resolve_driver(database_url: str | Path) -> str:
        raw = str(database_url or "").strip()
        if not raw:
            raise ValueError("DATABASE_URL is required.")
        if isinstance(database_url, Path):
            return "sqlite"
        if raw.startswith("postgres://") or raw.startswith("postgresql://"):
            return "postgres"
        if raw.startswith("sqlite:///"):
            return "sqlite"
        if "://" not in raw:
            return "sqlite"
        return "postgres"

    @staticmethod
    def _resolve_sqlite_path(database_url: str | Path) -> Path:
        if isinstance(database_url, Path):
            return database_url
        raw = str(database_url or "").strip()
        if raw.startswith("sqlite:///"):
            return Path(raw.replace("sqlite:///", "", 1))
        return Path(raw)

    def _conn(self):
        if self._driver == "sqlite":
            return self._sqlite_conn
        assert self._pool is not None
        return self._pool.getconn()

    def _release(self, conn):
        if self._driver == "sqlite":
            return
        assert self._pool is not None
        self._pool.putconn(conn)

    def close(self) -> None:
        if self._driver == "sqlite":
            if self._sqlite_conn is not None:
                self._sqlite_conn.close()
                self._sqlite_conn = None
            return
        if self._pool is not None:
            self._pool.closeall()
            self._pool = None

    def _initialize(self) -> None:
        conn = self._conn()
        try:
            cur = conn.cursor()
            try:
                self._initialize_users(cur)
                self._initialize_sessions(cur)
                self._initialize_messages(cur)
                self._initialize_shared_experiences(cur)
                self._initialize_user_client_states(cur)
            finally:
                cur.close()
            conn.commit()
        finally:
            self._release(conn)

    def _initialize_users(self, cur) -> None:
        if self._driver == "sqlite":
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS auth_tokens (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id
                ON auth_tokens(user_id);
                """
            )
            return
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id
            ON auth_tokens(user_id);
            """
        )

    def _initialize_sessions(self, cur) -> None:
        if self._driver == "sqlite":
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    thread_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sessions_user_updated
                ON sessions(user_id, updated_at DESC);
                """
            )
            return
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                thread_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        cur.execute(
            """
            ALTER TABLE sessions
            ADD COLUMN IF NOT EXISTS user_id TEXT;
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_sessions_user_updated
            ON sessions(user_id, updated_at DESC);
            """
        )

    def _initialize_messages(self, cur) -> None:
        if self._driver == "sqlite":
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    thread_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(thread_id) REFERENCES sessions(thread_id) ON DELETE CASCADE
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_messages_thread_id_id
                ON messages(thread_id, id DESC);
                """
            )
            return
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id BIGSERIAL PRIMARY KEY,
                thread_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                FOREIGN KEY(thread_id) REFERENCES sessions(thread_id) ON DELETE CASCADE
            );
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_messages_thread_id_id
            ON messages(thread_id, id DESC);
            """
        )

    def _initialize_shared_experiences(self, cur) -> None:
        if self._driver == "sqlite":
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS shared_experiences (
                    share_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_shared_experiences_created_at
                ON shared_experiences(created_at DESC);
                """
            )
            return
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS shared_experiences (
                share_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                payload JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_shared_experiences_created_at
            ON shared_experiences(created_at DESC);
            """
        )

    def _initialize_user_client_states(self, cur) -> None:
        if self._driver == "sqlite":
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_client_states (
                    user_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """
            )
            return
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS user_client_states (
                user_id TEXT PRIMARY KEY,
                payload JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

    def _fetchone_dict(self, cur) -> dict[str, Any] | None:
        row = cur.fetchone()
        if row is None:
            return None
        if isinstance(row, sqlite3.Row):
            return dict(row)
        if isinstance(row, dict):
            return row
        try:
            return dict(row)
        except Exception:
            return None

    def _fetchall_dicts(self, cur) -> list[dict[str, Any]]:
        rows = cur.fetchall()
        if self._driver == "sqlite":
            return [dict(row) for row in rows]
        return [dict(row) for row in rows]

    def _cursor(self, conn):
        if self._driver == "sqlite":
            return conn.cursor()
        return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    def create_user(self, username: str, password_hash: str) -> dict[str, str]:
        user_id = uuid.uuid4().hex
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?);"
                    if self._driver == "sqlite"
                    else "INSERT INTO users (id, username, password_hash) VALUES (%s, %s, %s);"
                )
                cur.execute(query, (user_id, username, password_hash))
            finally:
                cur.close()
            conn.commit()
            return {"id": user_id, "username": username}
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    "SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1;"
                    if self._driver == "sqlite"
                    else "SELECT id, username, password_hash, created_at FROM users WHERE username = %s LIMIT 1;"
                )
                cur.execute(query, (username,))
                row = self._fetchone_dict(cur)
            finally:
                cur.close()
        finally:
            self._release(conn)
        if not row:
            return None
        return {
            "id": str(row["id"]),
            "username": str(row["username"]),
            "password_hash": str(row["password_hash"]),
            "created_at": str(row["created_at"]),
        }

    def create_auth_token(self, user_id: str, token_hash: str) -> None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    "INSERT INTO auth_tokens (token_hash, user_id) VALUES (?, ?);"
                    if self._driver == "sqlite"
                    else "INSERT INTO auth_tokens (token_hash, user_id) VALUES (%s, %s);"
                )
                cur.execute(query, (token_hash, user_id))
            finally:
                cur.close()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def delete_auth_token(self, token_hash: str) -> None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    "DELETE FROM auth_tokens WHERE token_hash = ?;"
                    if self._driver == "sqlite"
                    else "DELETE FROM auth_tokens WHERE token_hash = %s;"
                )
                cur.execute(query, (token_hash,))
            finally:
                cur.close()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def get_user_by_token_hash(self, token_hash: str) -> dict[str, Any] | None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    """
                    SELECT users.id, users.username, users.created_at
                    FROM auth_tokens
                    JOIN users ON users.id = auth_tokens.user_id
                    WHERE auth_tokens.token_hash = ?
                    LIMIT 1;
                    """
                    if self._driver == "sqlite"
                    else
                    """
                    SELECT users.id, users.username, users.created_at
                    FROM auth_tokens
                    JOIN users ON users.id = auth_tokens.user_id
                    WHERE auth_tokens.token_hash = %s
                    LIMIT 1;
                    """
                )
                cur.execute(query, (token_hash,))
                row = self._fetchone_dict(cur)
            finally:
                cur.close()
        finally:
            self._release(conn)
        if not row:
            return None
        return {
            "id": str(row["id"]),
            "username": str(row["username"]),
            "created_at": str(row["created_at"]),
        }

    def save_user_client_state(self, user_id: str, payload: dict[str, Any]) -> None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                if self._driver == "sqlite":
                    cur.execute(
                        """
                        INSERT INTO user_client_states (user_id, payload, updated_at)
                        VALUES (?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(user_id) DO UPDATE SET
                            payload = excluded.payload,
                            updated_at = CURRENT_TIMESTAMP;
                        """,
                        (user_id, json.dumps(payload, ensure_ascii=False)),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO user_client_states (user_id, payload, updated_at)
                        VALUES (%s, %s, NOW())
                        ON CONFLICT(user_id) DO UPDATE SET
                            payload = EXCLUDED.payload,
                            updated_at = NOW();
                        """,
                        (user_id, psycopg2.extras.Json(payload)),
                    )
            finally:
                cur.close()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def get_user_client_state(self, user_id: str) -> dict[str, Any] | None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    "SELECT payload, updated_at FROM user_client_states WHERE user_id = ? LIMIT 1;"
                    if self._driver == "sqlite"
                    else "SELECT payload, updated_at FROM user_client_states WHERE user_id = %s LIMIT 1;"
                )
                cur.execute(query, (user_id,))
                row = self._fetchone_dict(cur)
            finally:
                cur.close()
        finally:
            self._release(conn)
        if not row:
            return None
        payload = row.get("payload")
        if self._driver == "sqlite":
            try:
                payload = json.loads(str(payload or "{}"))
            except json.JSONDecodeError:
                payload = {}
        if not isinstance(payload, dict):
            payload = {}
        payload["updated_at"] = str(row["updated_at"])
        return payload

    def _lookup_session_owner(self, cur, thread_id: str) -> str | None:
        query = (
            "SELECT user_id FROM sessions WHERE thread_id = ? LIMIT 1;"
            if self._driver == "sqlite"
            else "SELECT user_id FROM sessions WHERE thread_id = %s LIMIT 1;"
        )
        cur.execute(query, (thread_id,))
        row = self._fetchone_dict(cur)
        return str(row["user_id"]) if row and row.get("user_id") else None

    def _touch_session(self, cur, thread_id: str) -> None:
        query = (
            "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE thread_id = ?;"
            if self._driver == "sqlite"
            else "UPDATE sessions SET updated_at = NOW() WHERE thread_id = %s;"
        )
        cur.execute(query, (thread_id,))

    def _insert_session(self, cur, thread_id: str, user_id: str) -> None:
        query = (
            """
            INSERT INTO sessions (thread_id, user_id, created_at, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            """
            if self._driver == "sqlite"
            else
            """
            INSERT INTO sessions (thread_id, user_id, created_at, updated_at)
            VALUES (%s, %s, NOW(), NOW());
            """
        )
        cur.execute(query, (thread_id, user_id))

    def _ensure_session(self, cur, thread_id: str | None, user_id: str) -> str:
        tid = (thread_id or "").strip() or uuid.uuid4().hex
        existing_owner = self._lookup_session_owner(cur, tid)
        if existing_owner and existing_owner != user_id:
            raise PermissionError("Session does not belong to the authenticated user.")
        if not existing_owner:
            self._insert_session(cur, tid, user_id)
        else:
            self._touch_session(cur, tid)
        return tid

    def append_message(self, thread_id: str | None, user_id: str, role: str, content: str) -> tuple[str, int]:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                tid = self._ensure_session(cur, thread_id, user_id)
                insert_query = (
                    "INSERT INTO messages (thread_id, role, content) VALUES (?, ?, ?);"
                    if self._driver == "sqlite"
                    else "INSERT INTO messages (thread_id, role, content) VALUES (%s, %s, %s) RETURNING id;"
                )
                if self._driver == "sqlite":
                    cur.execute(insert_query, (tid, role, content))
                    msg_id = int(cur.lastrowid)
                else:
                    cur.execute(insert_query, (tid, role, content))
                    row = cur.fetchone()
                    msg_id = int(row["id"] if isinstance(row, dict) else row[0])
                self._touch_session(cur, tid)
            finally:
                cur.close()
            conn.commit()
            return tid, msg_id
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def delete_message_by_id(self, message_id: int) -> None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    "DELETE FROM messages WHERE id = ?;"
                    if self._driver == "sqlite"
                    else "DELETE FROM messages WHERE id = %s;"
                )
                cur.execute(query, (message_id,))
            finally:
                cur.close()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def get_recent_history(
        self,
        user_id: str,
        thread_id: str,
        limit: int = 20,
        through_message_id: int | None = None,
    ) -> list[dict[str, str]]:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                if self._lookup_session_owner(cur, thread_id) != user_id:
                    return []
                safe_limit = max(1, limit)
                if through_message_id is None:
                    query = (
                        """
                        SELECT role, content
                        FROM messages
                        WHERE thread_id = ?
                        ORDER BY id DESC
                        LIMIT ?;
                        """
                        if self._driver == "sqlite"
                        else
                        """
                        SELECT role, content
                        FROM messages
                        WHERE thread_id = %s
                        ORDER BY id DESC
                        LIMIT %s;
                        """
                    )
                    cur.execute(query, (thread_id, safe_limit))
                else:
                    query = (
                        """
                        SELECT role, content
                        FROM messages
                        WHERE thread_id = ? AND id <= ?
                        ORDER BY id DESC
                        LIMIT ?;
                        """
                        if self._driver == "sqlite"
                        else
                        """
                        SELECT role, content
                        FROM messages
                        WHERE thread_id = %s AND id <= %s
                        ORDER BY id DESC
                        LIMIT %s;
                        """
                    )
                    cur.execute(query, (thread_id, int(through_message_id), safe_limit))
                rows = self._fetchall_dicts(cur)
            finally:
                cur.close()
        finally:
            self._release(conn)
        rows.reverse()
        return [{"role": str(r["role"]), "content": str(r["content"])} for r in rows]

    def get_messages_page(
        self,
        user_id: str,
        thread_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        safe_limit = max(1, limit)
        safe_offset = max(0, offset)
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                if self._lookup_session_owner(cur, thread_id) != user_id:
                    return [], 0
                count_query = (
                    "SELECT COUNT(*) AS total FROM messages WHERE thread_id = ?;"
                    if self._driver == "sqlite"
                    else "SELECT COUNT(*) AS total FROM messages WHERE thread_id = %s;"
                )
                cur.execute(count_query, (thread_id,))
                total_row = self._fetchone_dict(cur)
                rows_query = (
                    """
                    SELECT id, role, content, created_at
                    FROM messages
                    WHERE thread_id = ?
                    ORDER BY id DESC
                    LIMIT ? OFFSET ?;
                    """
                    if self._driver == "sqlite"
                    else
                    """
                    SELECT id, role, content, created_at
                    FROM messages
                    WHERE thread_id = %s
                    ORDER BY id DESC
                    LIMIT %s OFFSET %s;
                    """
                )
                cur.execute(rows_query, (thread_id, safe_limit, safe_offset))
                rows = self._fetchall_dicts(cur)
            finally:
                cur.close()
        finally:
            self._release(conn)
        items = [
            {
                "id": int(r["id"]),
                "role": str(r["role"]),
                "content": str(r["content"]),
                "created_at": str(r["created_at"]),
            }
            for r in rows
        ]
        items.reverse()
        total = int(total_row["total"]) if total_row else 0
        return items, total

    def list_sessions(self, user_id: str, limit: int = 100, offset: int = 0) -> list[dict[str, str]]:
        safe_limit = max(1, limit)
        safe_offset = max(0, offset)
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    """
                    SELECT thread_id, created_at, updated_at
                    FROM sessions
                    WHERE user_id = ?
                    ORDER BY updated_at DESC
                    LIMIT ? OFFSET ?;
                    """
                    if self._driver == "sqlite"
                    else
                    """
                    SELECT thread_id, created_at, updated_at
                    FROM sessions
                    WHERE user_id = %s
                    ORDER BY updated_at DESC
                    LIMIT %s OFFSET %s;
                    """
                )
                cur.execute(query, (user_id, safe_limit, safe_offset))
                rows = self._fetchall_dicts(cur)
            finally:
                cur.close()
        finally:
            self._release(conn)
        return [
            {
                "thread_id": str(r["thread_id"]),
                "created_at": str(r["created_at"]),
                "updated_at": str(r["updated_at"]),
            }
            for r in rows
        ]

    def create_shared_experience(self, title: str, payload: dict) -> str:
        share_id = uuid.uuid4().hex
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                if self._driver == "sqlite":
                    cur.execute(
                        """
                        INSERT INTO shared_experiences (share_id, title, payload)
                        VALUES (?, ?, ?);
                        """,
                        (share_id, title, json.dumps(payload, ensure_ascii=False)),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO shared_experiences (share_id, title, payload)
                        VALUES (%s, %s, %s);
                        """,
                        (share_id, title, psycopg2.extras.Json(payload)),
                    )
            finally:
                cur.close()
            conn.commit()
            return share_id
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def get_shared_experience(self, share_id: str) -> dict | None:
        conn = self._conn()
        try:
            cur = self._cursor(conn)
            try:
                query = (
                    """
                    SELECT share_id, title, payload, created_at
                    FROM shared_experiences
                    WHERE share_id = ?
                    LIMIT 1;
                    """
                    if self._driver == "sqlite"
                    else
                    """
                    SELECT share_id, title, payload, created_at
                    FROM shared_experiences
                    WHERE share_id = %s
                    LIMIT 1;
                    """
                )
                cur.execute(query, (share_id,))
                row = self._fetchone_dict(cur)
            finally:
                cur.close()
        finally:
            self._release(conn)
        if not row:
            return None
        payload = row["payload"]
        if self._driver == "sqlite":
            try:
                payload = json.loads(str(payload or "{}"))
            except json.JSONDecodeError:
                payload = {}
        return {
            "share_id": str(row["share_id"]),
            "title": str(row["title"]),
            "payload": payload if isinstance(payload, dict) else {},
            "created_at": str(row["created_at"]),
        }

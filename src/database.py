from __future__ import annotations

import uuid

import psycopg2
import psycopg2.extras
import psycopg2.pool


class DatabaseManager:
    def __init__(self, database_url: str):
        self._pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1, maxconn=10, dsn=database_url
        )
        self._initialize()

    def _conn(self):
        return self._pool.getconn()

    def _release(self, conn):
        self._pool.putconn(conn)

    def _initialize(self) -> None:
        conn = self._conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        thread_id TEXT PRIMARY KEY,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id BIGSERIAL PRIMARY KEY,
                        thread_id TEXT NOT NULL,
                        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                        content TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        FOREIGN KEY(thread_id) REFERENCES sessions(thread_id) ON DELETE CASCADE
                    );
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_messages_thread_id_id
                    ON messages(thread_id, id DESC);
                """)
            conn.commit()
        finally:
            self._release(conn)

    def _ensure_session(self, cur, thread_id: str | None) -> str:
        tid = (thread_id or "").strip() or str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO sessions (thread_id, created_at, updated_at)
            VALUES (%s, NOW(), NOW())
            ON CONFLICT(thread_id) DO UPDATE SET updated_at = NOW();
            """,
            (tid,),
        )
        return tid

    def append_message(self, thread_id: str | None, role: str, content: str) -> tuple[str, int]:
        conn = self._conn()
        try:
            with conn.cursor() as cur:
                tid = self._ensure_session(cur, thread_id)
                cur.execute(
                    "INSERT INTO messages (thread_id, role, content) VALUES (%s, %s, %s) RETURNING id;",
                    (tid, role, content),
                )
                row = cur.fetchone()
                msg_id = int(row[0])
                cur.execute(
                    "UPDATE sessions SET updated_at = NOW() WHERE thread_id = %s;",
                    (tid,),
                )
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
            with conn.cursor() as cur:
                cur.execute("DELETE FROM messages WHERE id = %s;", (message_id,))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._release(conn)

    def get_recent_history(
        self,
        thread_id: str,
        limit: int = 20,
        through_message_id: int | None = None,
    ) -> list[dict[str, str]]:
        conn = self._conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if through_message_id is None:
                    cur.execute(
                        """
                        SELECT role, content
                        FROM messages
                        WHERE thread_id = %s
                        ORDER BY id DESC
                        LIMIT %s;
                        """,
                        (thread_id, max(1, limit)),
                    )
                else:
                    cur.execute(
                        """
                        SELECT role, content
                        FROM messages
                        WHERE thread_id = %s AND id <= %s
                        ORDER BY id DESC
                        LIMIT %s;
                        """,
                        (thread_id, int(through_message_id), max(1, limit)),
                    )
                rows = list(cur.fetchall())
        finally:
            self._release(conn)
        rows.reverse()
        return [{"role": str(r["role"]), "content": str(r["content"])} for r in rows]

    def get_messages_page(self, thread_id: str, limit: int = 20, offset: int = 0) -> tuple[list[dict], int]:
        safe_limit = max(1, limit)
        safe_offset = max(0, offset)
        conn = self._conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT COUNT(*) AS total FROM messages WHERE thread_id = %s;",
                    (thread_id,),
                )
                total_row = cur.fetchone()
                cur.execute(
                    """
                    SELECT id, role, content, created_at
                    FROM messages
                    WHERE thread_id = %s
                    ORDER BY id DESC
                    LIMIT %s OFFSET %s;
                    """,
                    (thread_id, safe_limit, safe_offset),
                )
                rows = list(cur.fetchall())
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

    def list_sessions(self, limit: int = 100, offset: int = 0) -> list[dict[str, str]]:
        safe_limit = max(1, limit)
        safe_offset = max(0, offset)
        conn = self._conn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT thread_id, created_at, updated_at
                    FROM sessions
                    ORDER BY updated_at DESC
                    LIMIT %s OFFSET %s;
                    """,
                    (safe_limit, safe_offset),
                )
                rows = list(cur.fetchall())
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

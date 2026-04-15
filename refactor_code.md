# Refactor Strategy: Minimal Impact, Multi-user Ready Persistence

## 1. Context Analysis
- **Backend (`src/api_server.py`)**: Uses an in-memory `_threads` dict. Data is lost on restart. Scalability is limited by RAM.
- **Frontend (`sessionStore.js`)**: Uses `localStorage`. Data is client-only and session-limited.
- **Target**: Move to SQLite persistence with minimal code changes.

## 2. Minimalist Backend Changes (`src/api_server.py`)
- **Database**: Use standard `sqlite3` (built-in). Create a small `db_manager.py` to handle simple SQL queries (insert/select).
- **Session Mapping**: Keep using `thread_id` as the primary key. When `/api/chat` is called, persist the message to DB before/after the AI call.
- **Context Handling**: Backend will fetch the last 10-20 messages from the DB to build the `history` for Claude. Frontend no longer needs to keep track of the full history for the AI's sake.

## 3. Minimalist Frontend Changes (`sessionStore.js` / `chatController.js`)
- **SessionStore Refactor**:
    - Change `getCurrentSession().messages` to be an empty array initially.
    - Fetch messages from `GET /api/sessions/{tid}/messages` only when a session is opened.
- **Optimistic UI (`chatController.js`)**:
    - In the `send` event handler, immediately call `pushUser(inputText)` to show it on screen.
    - Disable the send button and show a small "..." or "Sending" indicator.
    - Only update the data model once the API returns the result.
- **Pagination**: Implement a simple "Load more" trigger at the top of the message list to fetch previous messages using `limit` and `offset`.

## 4. Multi-user Smoothness
- **Concurrency**: The `api_server.py` already uses a `Lock`. Switching to SQLite with **WAL (Write-Ahead Logging) mode** enabled (and `check_same_thread=False`) will allow concurrent reads and highly efficient writes, handling 500+ users smoothly.
- **Resource Usage**: Switching from RAM (`_threads` dict) to Disk (SQLite) allows the server to handle thousands of messages with negligible memory footprint.

## 5. Execution Steps for Cursor
1. **Initialize DB**: Create `src/database.py` with tables for `sessions` and `messages`.
2. **Refactor `/api/chat`**: Update the endpoint to read/write from DB.
3. **Add CRUD Endpoints**: Create basic GET endpoints for sessions and message history.
4. **Mock Frontend Update**: Update `sessionStore.js` to use `fetch` for loading messages instead of `JSON.parse(localStorage)`.
5. **UI Polish**: Add the "pending" state handling in `chatController.js`.

---
**Rule**: DO NOT modify the CSS files or the HTML structure of the messages. Keep the `messages` array format identical to ensure `renderMessages()` remains functional

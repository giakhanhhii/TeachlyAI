# Starter Code App

A template for building AI Agents in Python.

## Structure

```
├── frontend/           # Teachly UI (HTML tĩnh — landing + chat)
├── src/
│   ├── api_server.py   # FastAPI: phục vụ UI + POST /api/chat (chạy local)
│   ├── agent.py        # Main agent loop (CLI)
│   ├── tools.py        # Tool definitions
│   └── config.py       # Configuration
├── scripts/
│   ├── setup_hooks.sh  # Hook installer (macOS/Linux)
│   ├── setup_hooks.ps1 # Hook installer (Windows)
│   ├── log_hook.py     # AI tool hook handler
│   └── submit_log.py   # Submits logs on git push
├── requirements.txt
├── .env.example
├── AGENTS.md           # Rules for using AI coding agents
├── JOURNAL.md          # Weekly journal — product journey & learnings
└── WORKLOG.md          # Technical decisions, task assignments, brainstorming
```

## Getting Started

### 1. Clone and setup

```bash
git clone <repo-url>
cd <repo>

# Install git pre-push hook (required, run once)
bash scripts/setup_hooks.sh  # macOS/Linux/Git Bash
# OR
powershell -ExecutionPolicy Bypass -File scripts/setup_hooks.ps1  # Windows PowerShell
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your `ANTHROPIC_API_KEY`. The `AI_LOG_*` variables are pre-filled.

### 3. Run

```bash
python -m venv venv
source venv/bin/activate       # Linux/Mac
# or: venv\Scripts\activate    # Windows

pip install -r requirements.txt
python -m src.agent
```

### 4. Teachly — xem giao diện & chat AI trên máy (một lệnh)

Dùng **một server** phục vụ cả trang web (`frontend/`) và API chat (`/api/chat`). Cần **`ANTHROPIC_API_KEY`** trong `.env` (xem bước 2).

**Windows (PowerShell)** — từ thư mục gốc repo (cùng cấp với `frontend/`):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Đã có .env với ANTHROPIC_API_KEY
uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000
```

**macOS / Linux:**

```bash
source venv/bin/activate   # hoặc tạo venv như bước 3
pip install -r requirements.txt
uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000
```

Sau đó mở trình duyệt: **http://127.0.0.1:8000/** — sẽ vào trang landing **Teachly**; từ đó bấm các thẻ để mở chat. API dùng **cùng origin** nên không cần chỉnh CORS khi truy cập qua cổng 8000.

- Kiểm tra nhanh: **http://127.0.0.1:8000/api/health** (xem `anthropic_configured`, `frontend_dir_exists`).
- Nếu mở `index.html` bằng Live Server cổng khác nhưng API vẫn ở 8000: trong `frontend/index.html` đặt thuộc tính meta `teachly-api-base` thành `http://127.0.0.1:8000`.

## Weekly Journal

Update **[JOURNAL.md](./JOURNAL.md)** at the end of every week to document your product-building journey:

- Features shipped
- AI tools used and how they helped
- Hardest problem of the week and how you solved it
- What you'd do differently
- Plan for next week

> JOURNAL.md **must be updated** before each PR. It is your learning record for the course.

## Worklog

Update **[WORKLOG.md](./WORKLOG.md)** whenever your team makes a technical decision or changes direction:

- **Technical decisions** — why did you choose this approach over alternatives?
- **Task assignments** — who does what, by when
- **Brainstorming** — options considered, pros/cons, conclusion
- **Important bugs** — root cause and fix

See each file for the format and examples.

## AI Logging

Prompts and tool calls are **automatically logged** when you use any supported AI tool (Claude Code, Cursor, Codex, Gemini, Copilot). No manual steps needed after running `setup_hooks.sh`.

See [AGENTS.md](./AGENTS.md) for details.

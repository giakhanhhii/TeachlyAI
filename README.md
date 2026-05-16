# Teachly

**Website:** https://a20-app-082.fly.dev

Teachly is a web application that helps Vietnamese high-school students study English through AI-assisted learning experiences. The product focuses on THPT/grade-12 learning flows and lets users create `slide`, `quiz`, `flashcard`, and `full set` study content from a topic or from an uploaded document.

## Project Goal

- Build a practical English-learning assistant for THPT students.
- Turn one topic or one source document into multiple study formats quickly.
- Keep the experience simple enough for demo and classroom use: generate, review, present, and continue learning in one web flow.

## Main Features

- AI-generated `slide`, `quiz`, `flashcard`, and `full set` content.
- Guided chat-based workflow for choosing learning actions and filling forms.
- Upload-based generation from `PDF`, `DOCX`, `MD`, and `TXT` files.
- Built-in THPTQG/mock learning bundles for fallback and predefined practice flows.
- Flashcard term translation and pronunciation support.
- Slide preview, in-browser editing shell, and PDF export.
- Session history for chat threads.
- Shared experience links stored in the database.
- Topic recommendation flow based on user study history.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript ES modules
- Backend/API: FastAPI, Pydantic, Uvicorn
- Database: PostgreSQL via `psycopg2`
- AI/LLM: OpenAI and Anthropic APIs
- Document extraction: `markitdown`, `pdfplumber`, `python-docx`, `chandra-ocr`
- Testing: Vitest, Playwright, Pytest
- Deployment/runtime helpers: Docker, Fly.io

## Repository Structure

```text
.
├── frontend/                 # Static web UI, chat flows, experience views, slide templates
├── backend/mock/             # Mock JSON bundles used as fallback or sample content
├── src/                      # FastAPI server, AI generation services, DB access, utilities
├── scripts/                  # Import, export, maintenance, hook, and utility scripts
├── tests/                    # Backend, frontend, and e2e test suites
├── .ai-log/                  # AI usage logs
├── AGENTS.md                 # Local instructions for coding agents
├── JOURNAL.md                # Weekly project journal
├── docker-compose.yml        # Containerized app runtime
├── Dockerfile                # Docker build definition
└── README.md
```

## Core Runtime Files

- `src/api_server.py`: main FastAPI app, API routes, static frontend serving
- `src/ai_content_generate.py`: AI generation, autofill, recommendations, document-based generation
- `src/database.py`: PostgreSQL connection pool and persistence for sessions/messages/shared experiences
- `src/config.py`: environment loading and runtime configuration
- `frontend/main_hub.html`: landing page
- `frontend/chatbot_ui.html`: main learning/chat UI
- `frontend/js/chatbot/`: frontend controllers, services, guided flow, experience rendering

## Installation

### Prerequisites

- Python `3.11+` recommended
- Node.js `20+`
- PostgreSQL database connection string
- At least one AI provider key:
  - `OPENAI_API_KEY` for content generation and flash translation
  - `ANTHROPIC_API_KEY` if using Anthropic for chat

### 1. Clone the repository

```bash
git clone <repo-url>
cd A20-App-082
```

### 2. Create and fill environment variables

```bash
cp .env.example .env
```

Update `.env` with real values:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEFAULT_MODEL`
- optional logging and feature flags

Important note:

- `docker-compose.yml` runs the app container, but does **not** start a local PostgreSQL service for you.
- You need a real PostgreSQL database, for example Supabase or another hosted/local PostgreSQL instance.

### 3. Install Python dependencies

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Install Node dependencies

```bash
npm install
```

Node is needed for frontend tooling and for slide PDF export.

## Run the Project

### Option 1: Run locally without Docker

```bash
uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000
```

Open:

- `http://127.0.0.1:8000/main_hub.html`
- or simply `http://127.0.0.1:8000/`

### Option 2: Run with Docker

```bash
docker compose up --build
```

Default local URL:

- `http://127.0.0.1:8000/`

## How to Use

### Learning flow

1. Open the hub page.
2. Choose one learning mode: `slide`, `quiz`, `flashcard`, or `full set`.
3. Enter a topic or use the guided form.
4. Optionally upload a document to generate content from file context.
5. Review the generated output inside the chat/experience UI.
6. Continue learning, share the experience, or export slide content to PDF.

### Chat flow

- The chat endpoint stores messages by `thread_id`.
- Session history can be reopened through the frontend sidebar.
- Scope policy is applied so the chat stays aligned with the educational use case.

## API Summary

Main endpoints in `src/api_server.py`:

- `GET /api/health`
- `POST /api/chat`
- `GET /api/sessions`
- `GET /api/sessions/{thread_id}/messages`
- `POST /api/ai-generate`
- `POST /api/ai-autofill`
- `POST /api/file-upload`
- `POST /api/flash/translate-term`
- `POST /api/flash/translate-terms`
- `POST /api/flash/pronunciations`
- `POST /api/slides/export-pdf`
- `POST /api/shared-experiences`
- `GET /api/shared-experiences/{share_id}`
- `POST /api/recommend-topics`
- `GET /api/mock/{name}`

## Testing

### Backend tests

```bash
pip install -r requirements-dev.txt
python -m pytest tests/backend -q
```

### Frontend unit tests

```bash
npm run lint
npx vitest run
```

### End-to-end tests

```bash
npx playwright install chromium
npm run test:e2e
```

## Notes for Reviewers

- The current production-style web app is centered on `src/api_server.py`.
- Some starter files from the original scaffold, such as `src/agent.py`, still exist in the repository, but they are not the main runtime path for the web product.
- The app uses AI as a service layer inside the backend rather than a separate long-running autonomous multi-agent system.

## Additional Documents

- [JOURNAL.md](./JOURNAL.md): weekly project progress and reflection
- [ARCHITECTURE.md](./ARCHITECTURE.md): system architecture and data flow
- [AGENTS.md](./AGENTS.md): project-specific coding agent instructions

# Teachly

## Link quan trọng

- **Video demo:** https://www.youtube.com/watch?v=tf5mvZXa5zc
- **Pitching deck:** https://drive.google.com/file/d/14JP8BEkyMOwSP6SUcYEAoubwqSmj-THd/view?usp=sharing
- **Website demo:** https://a20-app-082.fly.dev
- **Kiến trúc hệ thống:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Journal tiến độ theo tuần:** [JOURNAL.md](./JOURNAL.md)
- **Hướng dẫn coding agent:** [AGENTS.md](./AGENTS.md)

## Dashboard
<img width="1911" height="906" alt="Teachly AI" src="https://github.com/user-attachments/assets/5d98ba5c-6c2a-4a1d-84ae-a034ea3915a5" />

## Giới thiệu

Teachly là một web application giúp học sinh THPT Việt Nam học tiếng Anh thông qua các trải nghiệm học có AI hỗ trợ. Sản phẩm tập trung vào luồng học THPT/lớp 12 và cho phép người dùng tạo nội dung học dạng `slide`, `quiz`, `flashcard` và `full set` từ một chủ đề hoặc từ một tài liệu được upload.

## Mục tiêu dự án

- Xây dựng một trợ lý học tiếng Anh thực dụng cho học sinh THPT.
- Biến một chủ đề hoặc một tài liệu nguồn thành nhiều định dạng học khác nhau một cách nhanh chóng.
- Giữ trải nghiệm đủ đơn giản để dùng trong demo và lớp học: sinh nội dung, xem lại, trình bày và tiếp tục học trong cùng một web flow.

## Tính năng chính

- Sinh nội dung `slide`, `quiz`, `flashcard` và `full set` bằng AI.
- Workflow guided dựa trên chat để chọn hành động học và điền form.
- Sinh nội dung dựa trên upload file `PDF`, `DOCX`, `MD` và `TXT`.
- Bundle học THPTQG/mock được tích hợp sẵn để fallback và phục vụ các flow luyện tập có định nghĩa trước.
- Hỗ trợ dịch từ vựng flashcard và phát âm.
- Xem trước slide, shell chỉnh sửa trong trình duyệt và xuất PDF.
- Lịch sử session cho các chat thread.
- Link chia sẻ experience được lưu trong database.
- Luồng gợi ý chủ đề dựa trên lịch sử học của người dùng.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript ES module
- Backend/API: FastAPI, Pydantic, Uvicorn
- Database: PostgreSQL qua `psycopg2`
- AI/LLM: OpenAI và Anthropic API
- Trích xuất tài liệu: `markitdown`, `pdfplumber`, `python-docx`, `chandra-ocr`
- Testing: Vitest, Playwright, Pytest
- Hỗ trợ deployment/runtime: Docker, Fly.io

## Cấu trúc repository

```text
.
├── frontend/                 # Static web UI, chat flow, experience view, slide template
├── backend/mock/             # Bundle JSON mock dùng để fallback hoặc làm nội dung mẫu
├── src/                      # FastAPI server, service sinh nội dung AI, truy cập DB, tiện ích
├── scripts/                  # Script import, export, bảo trì, hook và tiện ích
├── tests/                    # Bộ test backend, frontend và e2e
├── .ai-log/                  # Log sử dụng AI
├── AGENTS.md                 # Hướng dẫn nội bộ cho coding agent
├── JOURNAL.md                # Journal tiến độ dự án theo tuần
├── docker-compose.yml        # Runtime app dạng container
├── Dockerfile                # Định nghĩa build Docker
└── README.md
```

## Các file runtime cốt lõi

- `src/api_server.py`: app FastAPI chính, các route API, phục vụ static frontend
- `src/ai_content_generate.py`: sinh nội dung AI, autofill, gợi ý, sinh nội dung dựa trên tài liệu
- `src/database.py`: connection pool PostgreSQL và lưu trữ session/message/shared experience
- `src/config.py`: load biến môi trường và cấu hình runtime
- `frontend/main_hub.html`: landing page
- `frontend/chatbot_ui.html`: UI học/chat chính
- `frontend/js/chatbot/`: controller, service, guided flow và render experience của frontend

## Cài đặt

### Yêu cầu

- Python `3.11+` được khuyến nghị
- Node.js `20+`
- Connection string đến database PostgreSQL
- Ít nhất một AI provider key:
  - `OPENAI_API_KEY` cho sinh nội dung và dịch flashcard
  - `ANTHROPIC_API_KEY` nếu dùng Anthropic cho chat

### 1. Clone repository

```bash
git clone <repo-url>
cd A20-App-082
```

### 2. Tạo và điền biến môi trường

```bash
cp .env.example .env
```

Cập nhật `.env` với giá trị thật:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEFAULT_MODEL`
- các flag log và feature tuỳ chọn

Ghi chú quan trọng:

- `docker-compose.yml` chỉ chạy container của app, **không** tự khởi động một PostgreSQL service local.
- Bạn cần một database PostgreSQL thật, ví dụ Supabase hoặc một PostgreSQL được host/cài local khác.

### 3. Cài Python dependency

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Cài Node dependency

```bash
npm install
```

Node được dùng cho tooling frontend và cho việc xuất slide PDF.

## Chạy dự án

### Cách 1: Chạy local không dùng Docker

```bash
uvicorn src.api_server:app --reload --host 127.0.0.1 --port 8000
```

Mở:

- `http://127.0.0.1:8000/main_hub.html`
- hoặc chỉ cần `http://127.0.0.1:8000/`

### Cách 2: Chạy với Docker

```bash
docker compose up --build
```

URL local mặc định:

- `http://127.0.0.1:8000/`

## Hướng dẫn sử dụng

### Luồng học

1. Mở trang hub.
2. Chọn một chế độ học: `slide`, `quiz`, `flashcard` hoặc `full set`.
3. Nhập một chủ đề hoặc dùng form guided.
4. Tuỳ chọn upload một tài liệu để sinh nội dung từ ngữ cảnh file.
5. Xem lại output đã sinh ra trong chat/experience UI.
6. Tiếp tục học, chia sẻ experience hoặc xuất nội dung slide ra PDF.

### Luồng chat

- Endpoint chat lưu tin nhắn theo `thread_id`.
- Lịch sử session có thể được mở lại từ sidebar của frontend.
- Scope policy được áp dụng để chat luôn bám sát mục đích giáo dục.

## Tóm tắt API

Các endpoint chính trong `src/api_server.py`:

Health và status:

- `GET /api/health`
- `GET /api/status`

Authentication và trạng thái theo tài khoản:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/state`
- `PUT /api/auth/state`

Chat và session:

- `POST /api/chat`
- `GET /api/sessions`
- `GET /api/sessions/{thread_id}/messages`

Sinh nội dung và upload:

- `POST /api/ai-generate`
- `POST /api/ai-autofill`
- `POST /api/file-upload`
- `POST /api/recommend-topics`

Tiện ích cho flashcard:

- `POST /api/flash/translate-term`
- `POST /api/flash/translate-terms`
- `POST /api/flash/pronunciations`

Slide, chia sẻ và mock content:

- `POST /api/slides/export-pdf`
- `POST /api/shared-experiences`
- `GET /api/shared-experiences/{share_id}`
- `GET /api/mock/{name}`

## Testing

### Test backend

```bash
pip install -r requirements-dev.txt
python -m pytest tests/backend -q
```

### Test unit frontend

```bash
npm run lint
npx vitest run
```

### Test end-to-end

```bash
npx playwright install chromium
npm run test:e2e
```

## Ghi chú cho người review

- Web app dạng production hiện tại xoay quanh `src/api_server.py`.
- Một số file khởi tạo từ scaffold ban đầu, ví dụ như `src/agent.py`, vẫn còn tồn tại trong repository nhưng không phải là đường runtime chính của sản phẩm web.
- App sử dụng AI như một lớp service bên trong backend chứ không phải một hệ thống multi-agent tự trị, chạy dài hạn riêng biệt.

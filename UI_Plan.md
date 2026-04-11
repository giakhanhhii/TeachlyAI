# Teachly — Kế hoạch giao diện & sản phẩm (UI Plan)

## 1. Tầm nhìn sản phẩm

**Mục tiêu dài hạn:** Một web **đầy đủ chức năng** cho giáo viên / học sinh ôn Tiếng Anh THPT QG: tạo slide, quiz, hình ảnh minh họa, hội thoại với trợ lý AI — triển khai **có tên miền**, người dùng truy cập **trực tuyến** (HTTPS, hosting ổn định).

**Giai đoạn hiện tại:** Chỉ **frontend tĩnh** trong thư mục **`frontend/`** (HTML/CSS/JS). **Chưa tích hợp backend thật**: không có server xử lý đồng bộ với UI production; phần gọi API và một số màn hình vẫn là **placeholder / demo**.

---

## 2. Thương hiệu & định vị

| Mục | Nội dung |
|-----|----------|
| Tên hiển thị (landing + app) | **Teachly** / **Teachly AI** |
| Phụ đề sidebar | Trợ lý AI Giáo dục |
| Ngôn ngữ UI | Tiếng Việt (ưu tiên) |

*(Tài liệu cũ dùng **HighExam** — không còn khớp giao diện hiện tại; giữ tên **Teachly** thống nhất với file trong `frontend/`.)*

---

## 3. Giao diện đã triển khai (khớp code)

### 3.1 Trang landing — `frontend/main_hub.html`

- **Chủ đề “rừng”:** nền gradient xanh lá / mint, font **Nunito** (Google Fonts), cảm giác ấm, thân thiện.
- **Hero:** tiêu đề **Teachly**, câu dẫn *“Bạn muốn bắt đầu như thế nào?”*
- **Bốn thẻ (card)** — mỗi thẻ có minh họa SVG riêng, badge khi cần (ví dụ *KHUYẾN KHÍCH*, *MỚI*):

  | Thẻ | Mô tả ngắn | Đích (query) |
  |-----|------------|----------------|
  | Tạo Full Set | Bộ slide + quiz + hình (mô tả marketing) | `chatbot_ui.html?flow=fullset` |
  | Tạo slide | Slide theo nội dung người dùng | `chatbot_ui.html?flow=slide` |
  | Tạo quiz | Quiz phục vụ ôn THPT QG tiếng Anh | `chatbot_ui.html?flow=quiz` |
  | Tạo hình ảnh | Ảnh minh họa phục vụ ôn thi | `chatbot_ui.html?flow=image` |

- Trang chỉ là **một file HTML** (chưa bundler); điều hướng sang app chat bằng `location.href`.

### 3.2 Ứng dụng chat — `frontend/chatbot_ui.html`

- **Layout:** sidebar (có **thu gọn**), vùng chat chính, thanh composer (ô nhập + Gửi), nút **Trang chủ** quay về `main_hub.html`.
- **Sidebar:** nhãn **Teachly AI**, nút **Đoạn chat mới**, danh sách phiên chat; trạng thái lưu **`localStorage`** (`teachly_sessions`, `teachly_active_session`).
- **Vùng hội thoại:** bubble user (xanh lá), bubble bot (kính mờ / glass), avatar bot tùy chỉnh.
- **Composer:** placeholder gợi ý giáo dục; footer có disclaimer (*có thể mắc sai sót…*).
- **Luồng có hướng dẫn (guided):** sau khi vào bằng `?flow=...`, bot dẫn từng bước (chủ đề, số câu, mức độ, v.v.) tùy flow.
- **Experience layer:** lớp phủ toàn màn khi “vào làm bài” — hiện có **demo**:
  - **Quiz:** thẻ câu hỏi + lựa chọn (dữ liệu mẫu trong JS).
  - **Flashcard:** thẻ lật mặt trước/sau (dữ liệu mẫu).
  - Nút **Quay lại chat** đóng layer.

### 3.3 Màu sắc & cảm giác (tóm tắt)

- **Xanh lá chủ đạo:** ví dụ `#4caf50`, `#2e7d32`, `#1b5e20`, nền gradient `#c8e6c9` → `#e0f2f1` (landing và app thống nhất “forest / fresh”).
- **Chữ:** `#10233a` / xám muted cho phụ đề.
- **Không** còn palette “xanh dương corporate `#2563EB`” như bản UI plan cũ.

---

## 4. Backend & trạng thái tích hợp

| Hạng mục | Trạng thái |
|----------|------------|
| Chat thật qua API (local) | **`src/api_server.py`** (FastAPI + uvicorn): phục vụ `frontend/` và **`POST /api/chat`**. Trong `chatbot_ui.html`, base API lấy từ meta `teachly-api-base` hoặc **cùng origin** khi mở qua `http://127.0.0.1:8000`. Cần **`ANTHROPIC_API_KEY`** trong `.env`. **Chưa** deploy API công khai / production. |
| Tạo slide / quiz / ảnh thật | **Chưa** — phần quiz & flashcard trên experience layer là **demo tĩnh**. |
| Đăng nhập, tài khoản, thanh toán | **Chưa** có trên UI hiện tại. |
| Tên miền & HTTPS | **Mục tiêu tương lai** — xem mục 6. |

---

## 5. Đặc tả chức năng mong muốn (để nối backend sau)

Khi có backend, các flow từ landing nên map rõ:

- **fullset:** orchestration tạo bộ nội dung (slide + quiz + ảnh) theo một lần “đặt hàng” hoặc wizard trong chat.
- **slide / quiz / image:** mỗi flow có input có cấu trúc (chủ đề, độ khó, số lượng, file đính kèm…) và **kết quả trả về** từ API thay cho dữ liệu hard-code.

*(Có thể tái sử dụng ý tưởng form từ bản plan cũ — **Tên unit**, **từ vựng**, **phong cách**, **trình độ** — nhưng **hiện tại UI chính là chat + CTA trên landing**, không phải form Next.js `/all`.)*

---

## 6. Lộ trình: từ prototype → web online có tên miền

1. **Backend:** API chat + job tạo slide/quiz/ảnh (REST hoặc WebSocket), lưu phiên / người dùng nếu cần.
2. **Nối frontend:** thay URL API theo môi trường; thay demo trong experience layer bằng payload từ server.
3. **Build & deploy:** có thể giữ static hosting (Vercel, Netlify, Cloudflare Pages) cho `frontend/` hoặc gom vào một framework sau này (Next.js, v.v.) nếu team chọn.
4. **Tên miền:** DNS trỏ về hosting; bật HTTPS (Let’s Encrypt / nhà cung cấp).
5. **Bảo mật & vận hành:** CORS, rate limit, key API phía server, không lộ secret trên client.

---

## 7. Stack kỹ thuật (hiện tại — cập nhật theo repo)

| Lớp | Thực tế trong repo |
|-----|-------------------|
| UI | HTML đơn + CSS nhúng trong file, JavaScript vanilla |
| API local (preview) | **FastAPI** `src/api_server.py`, **uvicorn**; xem **README** mục *Teachly* |
| Routing | Query string `?flow=` + `history.replaceState` |
| State cục bộ | `localStorage` cho phiên chat |
| Framework | **Không** dùng Next.js trong snapshot hiện tại (khác với UI plan cũ) |

**Ghi chú:** Nếu sau này chuyển sang Next.js hoặc SPA khác, giữ **cùng thương hiệu, palette forest, và mapping flow** để không lệch kế hoạch sản phẩm.

---

## 8. Hướng dẫn ngắn cho agent / Cursor (khi chỉnh UI)

- Giữ **Teachly** và **chủ đề rừng / xanh lá** đồng bộ giữa `main_hub.html` và `chatbot_ui.html`.
- Mọi thẻ landing mới nên tiếp tục trỏ `chatbot_ui.html?flow=<tên_flow>` và bổ sung nhánh `startFromFlow` tương ứng trong `chatbot_ui.html`.
- Khi thêm tính năng: ưu tiên **tách chuỗi / màu** để dễ theme; base API qua meta **`teachly-api-base`** hoặc cùng origin (xem `chatbot_ui.html`).
- UI vẫn **graceful** khi `fetch` thất bại (nhánh báo lỗi trong chat).

---

*Tài liệu này thay thế nội dung cũ (HighExam, Next `/all` `/slide`, nút xanh dương). Cập nhật khi có thêm màn hình hoặc khi backend được nối.*

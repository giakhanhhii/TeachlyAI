# Worklog

---

### Sprint 1 — 31/03 → 06/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Setup TypeScript project + CI | Văn A | 01/04 | ✅ Xong |
| Implement agent loop cơ bản | Thị B | 02/04 | ✅ Xong |
| Tool: `search_web` (Brave API) | Văn C | 03/04 | ✅ Xong |
| Tool: `read_file`, `write_file` | Thị B | 05/04 | ✅ Xong |
| Conversation memory (JSON) | Văn A | 06/04 | ✅ Xong |
| README + setup docs | Văn C | 06/04 | ✅ Xong |

---

### Sprint 2 — 07/04 → 13/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Fix infinite loop: thêm `max_iterations` | Thị B | 08/04 | 🔄 Đang làm |
| Tool: `run_tests` (chạy pytest) | Văn C | 10/04 | ⏳ Chờ |
| Sliding window memory | Văn A | 09/04 | ⏳ Chờ |
| Demo prep + slides | Cả nhóm | 13/04 | ⏳ Chờ |

---

### Brainstorm: Tính năng cho demo — 05/04/2026

**Câu hỏi:** Demo tuần tới nên show gì để ấn tượng nhất trong 5 phút?

**Các ý tưởng:**
- **Ý tưởng 1 (Văn A):** Cho agent đọc 1 file Python có bug, tự fix, rồi chạy test để verify. Trực quan, dễ hiểu.
- **Ý tưởng 2 (Thị B):** Agent tự build 1 tính năng nhỏ từ mô tả bằng tiếng Việt. Show khả năng hiểu ngôn ngữ tự nhiên.
- **Ý tưởng 3 (Văn C):** Agent review PR, comment vào từng dòng code có vấn đề. Gần với use case thực tế nhất.

**Pros/Cons:**
| Ý tưởng | Pros | Cons |
|---|---|---|
| Fix bug | Dễ làm, chắc chắn chạy được | Ít "wow" hơn |
| Build từ mô tả | Ấn tượng nhất | Có thể fail nếu prompt phức tạp |
| Review PR | Thực tế, liên quan trực tiếp đến khóa học | Cần setup GitHub webhook |

**Kết luận:** Chọn ý tưởng 1 (fix bug) cho demo chính vì đảm bảo. Nếu còn thời gian sẽ show thêm ý tưởng 2 như bonus.

---

### Bug quan trọng: Tool call loop vô hạn — 04/04/2026

**Triệu chứng:** Agent gọi `search_web` liên tục không dừng khi tool trả về lỗi network.

**Root cause:** Không có stop condition khi tool raise exception. Agent nhận `"error": "timeout"` nhưng interpret là cần thử lại.

**Fix:** Thêm 2 điều kiện dừng:
1. `max_iterations = 10` — hard stop sau 10 vòng
2. Nếu tool trả về lỗi 3 lần liên tiếp → dừng và báo user

**Code thay đổi:** `src/agent.ts` lines 45-67

**Học được:** Luôn thiết kế stop condition trước khi implement retry logic.

# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi.

---

## Template

### Quyết định kỹ thuật

---

### [ADR-3] Frontend tĩnh HTML/CSS/JS + ES modules — 08/04/2026

**Bối cảnh:** Cần giao diện Teachly (hub + chat) nhanh, dễ mở trên môi trường lab, chưa bắt buộc SPA framework.

**Các lựa chọn đã xem xét:**
- **React/Vite**: Component hóa tốt, ecosystem lớn; tốn thời gian setup và build cho giai đoạn prototype.
- **HTML/CSS/JS tĩnh + ESM**: Không bundler bắt buộc, file rõ ràng; cần static server cho `import` và chú ý CORS khi gọi API.

**Quyết định:** Chọn HTML/CSS/JS tĩnh, tách `frontend/css/` và `frontend/js/chatbot/` (module), serve qua HTTP khi dev.

**Hệ quả:** Không có state management framework sẵn; mọi tích hợp API/RAG sau này gắn qua fetch và module hiện có. Có thể nâng cấp lên bundler/React sau nếu phạm vi mở rộng.

---

### [ADR-4] Chuẩn bị dữ liệu RAG từ PDF — 06/04/2026

**Bối cảnh:** Đề và bài tập Tiếng Anh THPT chủ yếu ở dạng PDF; cần quyết định bước tiền xử lý trước embedding.

**Các lựa chọn đã xem xét:**
- **Đưa PDF nguyên vào vector store**: Đơn giản nhưng chunk không ổn định, khó trích dẫn đoạn cụ thể.
- **PDF → text sạch → chunk có metadata (năm, loại đề, số câu)**: Công sức OCR/làm sạch ban đầu nhưng truy vấn và citation đáng tin hơn.

**Quyết định:** Hướng PDF → text (OCR nếu cần) → chunk + metadata; chỉ dùng nguồn được phép / nội bộ đã thống nhất.

**Hệ quả:** Pipeline ingest phải được implement và kiểm thử trên mẫu thật; nhóm chấp nhận chi phí làm sạch dữ liệu thay vì RAG “bẩn”.

---

### Sprint 1 — 04/04 → 10/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Thu thập & phân loại PDF đề THPT QG Tiếng Anh + bài tập | Nguyễn Xuân Hải - 2A202600245 | 08/04 | ✅ Xong |
| Research cấu trúc bài giảng / quiz ôn thi | Nguyễn Triệu Gia Khánh - 2A202600225 | 09/04 | ✅ Xong |
| Học RAG (chunking, embedding, vector store, giới hạn) | Nguyễn Triệu Gia Khánh - 2A202600225 | 10/04 | ✅ Xong |
| Ghi chép nguồn tài liệu (bảng nguồn nội bộ) | Nguyễn Xuân Hải - 2A202600245 | 10/04 | ✅ Xong |

---

### Sprint 2 — 11/04 → 17/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Layout landing / hub (`main_hub.html`) | Nguyễn Triệu Gia Khánh - 2A202600225 | 12/04 | ✅ Xong |
| Giao diện chat (`chatbot_ui.html`) + trải nghiệm (quiz/flash…) | Nguyễn Triệu Gia Khánh - 2A202600225 | 14/04 | ✅ Xong |
| Tách CSS (`frontend/css/`) và JS ESM (`frontend/js/chatbot/`) | Nguyễn Triệu Gia Khánh - 2A202600225 | 15/04 | ✅ Xong |
| Smoke test qua static server (ESM, đường dẫn asset) | Nguyễn Triệu Gia Khánh - 2A202600225 | 16/04 | ✅ Xong |
| Cập nhật tài liệu nội bộ nếu có (cách chạy frontend) | Nguyễn Triệu Gia Khánh - 2A202600225 | 17/04 | ⏳ Tùy nhóm |

---

### Brainstorm: Nguồn dữ liệu & RAG — 05/04/2026

**Câu hỏi:** Làm sao vừa đủ tài liệu ôn thi vừa an toàn về bản quyền và chất lượng cho RAG?

**Các ý tưởng:**
- **Ý tưởng 1:** Ưu tiên đề minh họa Bộ GD&ĐT và tài liệu công khai; bổ sung bài tập tự soạn hoặc nguồn được phép.
- **Ý tưởng 2:** Với PDF scan, chạy OCR + review thủ công một mẫu trước khi scale; lưu metadata năm/môn/loại đề.
- **Ý tưởng 3:** Chunk theo câu hỏi / passage để citation trỏ được đoạn; giới hạn top-k và yêu cầu model trích dẫn nguồn khi trả lời.

**Kết luận:** Kết hợp nguồn công khai đã kiểm tra + nội bộ; PDF → text sạch rồi mới embedding; thiết kế chunk và metadata ngay từ đầu để giảm hallucination.

---

### [ADR-5] Hệ thống đăng nhập / đăng ký người dùng — 18/04/2026

**Bối cảnh:** Để cá nhân hóa nội dung và lưu lịch sử học tập, cần xác thực người dùng trước khi truy cập các tính năng tạo quiz / flashcard / slide.

**Các lựa chọn đã xem xét:**
- **Guest mode (không cần đăng nhập):** Đơn giản, không cần DB người dùng; mất cá nhân hóa và không lưu được lịch sử.
- **JWT + local storage:** Stateless, phù hợp REST API, dễ tích hợp với frontend hiện có (HTML/JS thuần).
- **Session-based (server-side):** Bảo mật hơn, cần session store; phức tạp hơn khi prototype chưa có Redis.

**Quyết định:** JWT + local storage. Tách route `/auth/register` và `/auth/login`; middleware xác thực token cho các route cần bảo vệ.

**Hệ quả:** Người dùng phải đăng ký để dùng các tính năng chính. Token hết hạn cần refresh logic ở giai đoạn sau nếu cần thêm.

---

### [ADR-6] Upload tài liệu PDF (5 file đề THPTQG) — 25/04/2026

**Bối cảnh:** Nhóm cần đưa bộ đề THPTQG Tiếng Anh đã phân loại vào hệ thống để RAG truy vấn. Cần quyết định cách quản lý file upload và lưu trữ.

**Các lựa chọn đã xem xét:**
- **Upload qua form → lưu `uploads/`:** Đơn giản, không cần service ngoài; đủ cho prototype nội bộ.
- **Gắn file tĩnh vào repo / Docker image:** Không cho phép user upload thêm sau này.
- **Cloud storage (S3, GCS):** Tốt nhất để scale; overkill cho giai đoạn hiện tại.

**Quyết định:** Upload 5 file PDF qua backend endpoint, lưu tại `uploads/`, đăng ký metadata (tên, năm, loại đề) vào JSON store. Thiết kế đủ tổng quát để sau này chuyển sang cloud storage.

**Hệ quả:** 5 file PDF đề THPTQG Tiếng Anh đã được ingest và sẵn sàng cho pipeline RAG. Chấp nhận giới hạn dung lượng local storage trong giai đoạn prototype.

---

### [ADR-7] Hệ thống recommendation nội dung AI (fallback + autofill) — 05/05/2026

**Bối cảnh:** Khi AI không tạo đủ nội dung hoặc trả về lỗi, người dùng bị kẹt ở màn trống. Cần cơ chế gợi ý và tự điền thông minh để giữ trải nghiệm liên tục cho cả quiz, flashcard và slide.

**Các lựa chọn đã xem xét:**
- **Không có fallback:** Đơn giản nhất; UX xấu khi AI lỗi hoặc chậm, người dùng thấy trang trắng.
- **Template hardcode mẫu:** Nhanh; không cá nhân hóa theo chủ đề người dùng nhập.
- **AI fallback tự động sau N lần thất bại + `/api/ai-autofill`:** Người dùng vẫn nhận nội dung có liên quan; cần status panel để theo dõi trạng thái AI real-time.

**Quyết định:** Trigger AI fallback sau 3 lần play thất bại; thêm endpoint `/api/ai-autofill` để frontend gọi khi cần tự điền nội dung; status panel hiển thị trạng thái AI. Dev badge (DEV-ONLY) phân biệt môi trường — xóa trước khi deploy production.

**Hệ quả:** Trải nghiệm người dùng mượt hơn khi AI chậm hoặc lỗi tạm thời. Cần test kỹ kịch bản fallback để tránh loop vô hạn khi AI liên tục thất bại.

---

### Sprint 3 — 18/04 → 24/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Xây backend API server, chuẩn hóa luồng gọi frontend → backend | Nguyễn Triệu Gia Khánh - 2A202600225 | 20/04 | ✅ Xong |
| Hệ thống đăng nhập / đăng ký: JWT auth, `/auth/register`, `/auth/login`, middleware bảo vệ route | Nguyễn Triệu Gia Khánh - 2A202600225 | 21/04 | ✅ Xong |
| Guided flow trong giao diện chat: chọn card, form cấu hình từng loại nội dung | Nguyễn Triệu Gia Khánh - 2A202600225 | 22/04 | ✅ Xong |
| Triển khai khung 4 card: Tạo Quiz, Tạo Flashcard, Tạo Slide, Tạo Full Set (dùng chung navigation + state) | Nguyễn Triệu Gia Khánh - 2A202600225 | 23/04 | ✅ Xong |
| Session / sidebar / quản lý đoạn chat (mỗi lần tạo nội dung = một luồng riêng) | Nguyễn Triệu Gia Khánh - 2A202600225 | 24/04 | ✅ Xong |
| Ghi chép ý anh coach trong mentor duty, hỗ trợ test flow các card | Nguyễn Xuân Hải - 2A202600245 | 24/04 | ✅ Xong |

---

### Sprint 4 — 25/04 → 01/05/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Màn hình đầu ra đầy đủ cho quiz (làm bài, chấm điểm), flashcard (lật thẻ), slide (xem trước) trong chat | Nguyễn Triệu Gia Khánh - 2A202600225 | 27/04 | ✅ Xong |
| Mobile layout toàn diện: sidebar, header, card, form, action button, dropdown | Nguyễn Triệu Gia Khánh - 2A202600225 | 28/04 | ✅ Xong |
| Flow Full Set hoàn thiện: từ chọn nguồn đầu vào đến xem kết quả hỗn hợp trong cùng một chat | Nguyễn Triệu Gia Khánh - 2A202600225 | 29/04 | ✅ Xong |
| Tải lên 5 file PDF đề THPTQG Tiếng Anh, đăng ký metadata vào JSON store, sẵn sàng cho RAG | Nguyễn Triệu Gia Khánh - 2A202600225 | 30/04 | ✅ Xong |
| Chuẩn hóa môi trường Docker: route backend, hot reload, dependency khi thêm chức năng mới | Nguyễn Triệu Gia Khánh - 2A202600225 | 01/05 | ✅ Xong |
| Ghi biên bản ý anh coach, test thủ công flow chính, thử nghiệm upload PDF để kiểm chứng chức năng | Nguyễn Xuân Hải - 2A202600245 | 01/05 | ✅ Xong |

---

### Sprint 5 — 02/05 → 08/05/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Slide experience hoàn chỉnh: chế độ trình chiếu, xem lướt, chỉnh sửa inline, tải xuống PDF | Nguyễn Triệu Gia Khánh - 2A202600225 | 05/05 | ✅ Xong |
| Hệ thống recommendation: AI fallback sau 3 lần thất bại, endpoint `/api/ai-autofill`, status panel | Nguyễn Triệu Gia Khánh - 2A202600225 | 06/05 | ✅ Xong |
| Dev badge (DEV-ONLY) phân biệt môi trường dev / production — cần xóa trước deploy | Nguyễn Triệu Gia Khánh - 2A202600225 | 07/05 | ✅ Xong |
| Rà soát toàn bộ hành trình người dùng: trang chủ → tạo chat → chọn card → xem kết quả | Nguyễn Triệu Gia Khánh - 2A202600225 | 08/05 | ✅ Xong |
| Test flow chính (quiz / flashcard / slide / full set), ghi nhận lỗi, tổng hợp góp ý anh coach | Nguyễn Xuân Hải - 2A202600245 | 08/05 | ✅ Xong |
| Thử nghiệm upload và đọc file PDF, đối chiếu kết quả với nội dung gốc để kiểm tra độ chính xác của pipeline | Nguyễn Xuân Hải - 2A202600245 | 08/05 | ✅ Xong |

---

### Sprint 6 — 09/05 → 16/05/2026 *(Sprint cuối)*

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Sửa lỗi theo danh sách mentor duty: UI regression, UX flow, layout quiz / flashcard / slide | Nguyễn Triệu Gia Khánh - 2A202600225 | 12/05 | ✅ Xong |
| Tinh gọn phần lõi 4 card theo hướng nhanh, ổn định, dễ mở rộng; giảm bớt hướng chưa khớp mục tiêu | Nguyễn Triệu Gia Khánh - 2A202600225 | 14/05 | ✅ Xong |
| Fix bug popup đăng nhập tạo đè lên session cũ khi khôi phục lịch sử chat | Nguyễn Triệu Gia Khánh - 2A202600225 | 15/05 | ✅ Xong |
| Dọn dev badge (DEV-ONLY) và các flag thử nghiệm không dùng trong production | Nguyễn Triệu Gia Khánh - 2A202600225 | 15/05 | ✅ Xong |
| Xác nhận toàn bộ tính năng hoạt động đúng: quiz, flashcard, slide, full set, recommendation, auth, session | Nguyễn Triệu Gia Khánh - 2A202600225 | 16/05 | ✅ Xong |
| Kiểm tra golden path đầu-cuối: đăng ký → đăng nhập → tạo nội dung → đăng xuất → đăng nhập lại → khôi phục đúng | Nguyễn Triệu Gia Khánh - 2A202600225 | 16/05 | ✅ Xong |
| Pass test thủ công cuối: xác nhận không còn lỗi ảnh hưởng đến trải nghiệm người dùng | Nguyễn Xuân Hải - 2A202600245 | 16/05 | ✅ Xong |
| Tổng hợp ghi chú mentor duty lần cuối, xác nhận toàn bộ góp ý anh coach đã được xử lý | Nguyễn Xuân Hải - 2A202600245 | 16/05 | ✅ Xong |
| Chạy bộ test cuối trước submit: `pytest tests/backend` (57 pass), `vitest run` (104 pass / 1 skip), `playwright test` (8 pass / 17 [TEST DRIFT] skip / 0 fail); lưu log gốc tại `screenshots/_raw/` | Nguyễn Triệu Gia Khánh - 2A202600225 | 17/05 | ✅ Xong |
| Viết `EVALUATION.md`: tổng hợp 187 test case (169 pass / 18 skip / 0 fail), bộ 37 câu kiểm thử thủ công, metrics, mentor feedback log, render 7 ảnh evidence (terminal output + bảng tổng hợp) | Nguyễn Triệu Gia Khánh - 2A202600225 | 17/05 | ✅ Xong |

---

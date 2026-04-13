# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi.

---

## Template

### Quyết định kỹ thuật

```markdown
### [ADR-N] Tiêu đề quyết định — DD/MM/YYYY

**Bối cảnh:** Vấn đề cần giải quyết là gì?

**Các lựa chọn đã xem xét:**
- Option A: ...
- Option B: ...

**Quyết định:** Chọn option nào và tại sao.

**Hệ quả:** Những gì bị ảnh hưởng / trade-off.
```

### Phân công

```markdown
### Sprint N — DD/MM → DD/MM/YYYY

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| | | | |
```

### Brainstorming

```markdown
### Brainstorm: [Chủ đề] — DD/MM/YYYY

**Câu hỏi:** ...

**Các ý tưởng:**
- Ý tưởng 1: ...
- Ý tưởng 2: ...

**Kết luận:** ...
```

---

## Ví dụ

### [ADR-1] Dùng TypeScript thay vì Python — 30/03/2026

**Bối cảnh:** Cả nhóm cần chọn 1 ngôn ngữ chính để xây dựng agent. Có 2 thành viên quen Python, 1 thành viên quen TypeScript.

**Các lựa chọn đã xem xét:**
- **Python**: Ecosystem ML tốt hơn, syntax đơn giản, thành viên quen hơn.
- **TypeScript**: Type safety, dễ refactor khi project lớn, nhiều library AI mới ra bản TS trước.

**Quyết định:** Chọn TypeScript vì project này focus vào agent architecture, không cần ML library nặng. Type safety sẽ giúp bắt lỗi sớm hơn khi codebase phình ra.

**Hệ quả:** 2 thành viên Python cần học TypeScript cơ bản (ước tính 1 tuần). Sẽ không dùng được `langchain` Python trực tiếp.

---

### [ADR-2] Lưu conversation history bằng file JSON — 03/04/2026

**Bối cảnh:** Agent cần nhớ context giữa các lần chạy. Cần chọn storage.

**Các lựa chọn đã xem xét:**
- **In-memory array**: Đơn giản nhất nhưng mất khi restart.
- **File JSON**: Persistent, không cần setup, dễ inspect bằng tay.
- **SQLite**: Có thể query, tốt cho production nhưng overkill cho prototype.
- **Redis**: Fast nhưng cần chạy thêm service.

**Quyết định:** File JSON cho giai đoạn prototype. Thiết kế interface `MemoryStore` để sau này swap sang SQLite không cần sửa logic agent.

**Hệ quả:** Không query được theo thời gian hay user. Chấp nhận được ở giai đoạn này.

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

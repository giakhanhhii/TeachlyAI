# Weekly Journal
### Tuần 1 — 31/03/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245,

#### Đã làm
- Thu thập và phân loại nguồn PDF đề thi THPT QG môn Tiếng Anh (đề minh họa, đề các năm) và bài tập ôn luyện; ghi chú nguồn công khai / nội bộ để dùng cho RAG sau này.
- Tìm hiểu cách làm bài giảng / slide / quiz phục vụ ôn thi: cấu trúc tiết, phân dạng đề, mức độ câu hỏi.
- Nghiên cứu RAG: tài liệu → chunking, embedding, vector store, truy vấn; rủi ro hallucination và nhu cầu trích dẫn nguồn.

#### Khó nhất tuần này
- Một số PDF scan chất lượng thấp — cần OCR và kiểm tra lại nội dung trước khi đưa vào pipeline.
- Cân nhắc bản quyền và phạm vi sử dụng tài liệu (chỉ nguồn được phép hoặc nội bộ nhóm).

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Tóm tắt tài liệu RAG, gợi ý chiến lược chunk / embedding | Rút ngắn thời gian đọc lý thuyết |
| Claude Code | So khớp cấu trúc đề thi với ý tưởng bài giảng / quiz | Có khung nội dung rõ hơn cho tuần sau |

#### Học được
- RAG không chỉ là “nhét PDF vào DB”: chunk size, overlap và metadata ảnh hưởng trực tiếp độ chính xác khi trả lời.
- Bài giảng ôn thi nên bám phân dạng đề (đọc hiểu, ngữ pháp, từ vựng…) để khớp với đề THPT QG.

#### Nếu làm lại, sẽ làm khác
- Lập bảng nguồn PDF ngay từ đầu (link, năm, loại đề, ghi chú bản quyền) thay vì chỉ lưu file rời.
- Thử một pipeline OCR mẫu sớm trên 1–2 file scan để ước lượng công sức làm sạch text.

#### Kế hoạch tuần tới
- Hoàn thiện frontend tĩnh (landing + chat), tách CSS/JS module.
- Chuẩn bị nối backend / API và (sau đó) luồng upload hoặc ingest PDF cho RAG.

---

### Tuần 2 — 7/04/2026

**Thành viên:** Nguyễn Triệu Gia Khánh - 2A202600225, Nguyễn Xuân Hải - 2A202600245

#### Đã làm
- Hoàn thành frontend tĩnh Teachly trong `frontend/`: `main_hub.html` (landing/hub) và `chatbot_ui.html` (giao diện chat).
- Tách CSS theo ranh giới layout/sidebar/chat/experience/tokens; JS dạng ES modules trong `frontend/js/chatbot/` (session, guided flow, gọi API, view tách khỏi logic).

#### Khó nhất tuần này
- ES modules cần serve qua HTTP (không mở trực tiếp `file://`) — phải thống nhất cách chạy static server khi dev và khi demo.
- Chuẩn bị nối API thật: CORS, endpoint và format message cần khớp với backend.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Cursor | Refactor tách file CSS/JS, gợi ý cấu trúc module | Code frontend gọn, dễ bảo trì hơn |

#### Học được
- Tách UI (HTML/CSS) và logic (session, API) giúp sau này thay endpoint hoặc thêm RAG mà không phải viết lại toàn bộ giao diện.

#### Nếu làm lại, sẽ làm khác
- Ghi `README` hoặc một dòng hướng dẫn chạy `npx serve frontend` (hoặc tương đương) ngay khi chuyển sang ESM.

#### Kế hoạch tuần tới
- Tích hợp backend và luồng RAG (ingest PDF đã chuẩn hóa, truy vấn có trích dẫn).
- Upload / quản lý tài liệu nếu phạm vi sprint cho phép.

---

# Weekly Journal

Ghi lại hành trình xây dựng sản phẩm mỗi tuần — những gì đã làm, học được gì, AI giúp như thế nào.

> **Cập nhật mỗi cuối tuần** (trước khi tạo PR). Không cần dài, chỉ cần thật.

---

## Template

```markdown
## Tuần N — DD/MM/YYYY

### Đã làm
-

### Khó nhất tuần này
-

### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | | |

### Học được
-

### Nếu làm lại, sẽ làm khác
-

### Kế hoạch tuần tới
-
```

---

## Ví dụ

### Tuần 1 — 31/03/2026

**Thành viên:** Nguyễn Văn A, Trần Thị B, Lê Văn C

#### Đã làm
- Setup project TypeScript + cấu hình `.env`
- Xây dựng agent loop cơ bản: nhận input → gọi Claude API → in output
- Thêm tool `search_web` đầu tiên (dùng Brave Search API)
- Viết README cho repo nhóm

#### Khó nhất tuần này
- Tool call response của Claude trả về sai format — mất 2 tiếng debug mới phát hiện ra thiếu `"type": "tool_result"` trong message history.
- Lần đầu dùng TypeScript nên type error khá nhiều, phải học cách dùng `as` và generic.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Giải thích Anthropic tool use API, debug message format | Giải quyết được bug trong 15 phút |
| Cursor | Autocomplete TypeScript types | Tiết kiệm khoảng 30% thời gian gõ |

#### Học được
- Tool use trong Claude hoạt động theo vòng lặp: model gọi tool → app trả kết quả → model tiếp tục. Cần giữ đúng message history.
- `zod` rất hữu ích để validate tool input schema.
- Nên đặt timeout cho API call ngay từ đầu, không để sau mới thêm.

#### Nếu làm lại, sẽ làm khác
- Setup TypeScript strict mode ngay từ đầu thay vì thêm sau (refactor mệt hơn).
- Viết unit test cho `parseToolCall()` trước khi tích hợp vào agent loop.

#### Kế hoạch tuần tới
- Thêm tool `read_file` và `write_file`
- Implement memory: lưu conversation history vào file JSON
- Thử chạy agent giải 1 bài tập thực tế

---

### Tuần 2 — 07/04/2026

**Thành viên:** Nguyễn Văn A, Trần Thị B, Lê Văn C

#### Đã làm
- Thêm tool `read_file`, `write_file`, `list_dir`
- Agent có thể tự đọc file trong repo và đề xuất refactor
- Implement conversation memory: lưu 20 message gần nhất
- Thử nghiệm: cho agent tự fix 3 bug đơn giản → thành công 2/3

#### Khó nhất tuần này
- Memory bị lỗi khi conversation quá dài (vượt context window). Phải implement sliding window: chỉ giữ system prompt + 20 message gần nhất.
- Agent đôi khi loop vô hạn khi tool trả lỗi — chưa có stop condition tốt.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Thiết kế sliding window memory, review code agent loop | Phát hiện thêm edge case khi tool throw exception |
| Gemini CLI | So sánh approach lưu memory: file JSON vs SQLite | Tư vấn dùng JSON cho prototype, SQLite khi cần query |

#### Học được
- Context window là resource có hạn — cần thiết kế memory strategy từ sớm.
- Stop condition quan trọng không kém gì agent logic: `max_iterations`, `no_new_tool_calls`, `explicit_done`.
- AI agent review code của mình rất có ích: Claude Code tìm ra 2 potential null pointer mà mình bỏ sót.

#### Nếu làm lại, sẽ làm khác
- Viết interface `Memory` trước, rồi implement sau — thay vì hard-code array từ đầu.
- Log tất cả tool call ra file ngay từ đầu để debug dễ hơn.

#### Kế hoạch tuần tới
- Fix vòng lặp vô hạn: thêm `max_iterations = 10`
- Thêm tool `run_tests` để agent tự kiểm tra code sau khi sửa
- Demo cho instructor cuối tuần

---

## Nhật ký dự án (Teachly / A20)

### Tuần 1 — 04/04/2026

**Thành viên:** Cả nhóm

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

### Tuần 2 — 11/04/2026

**Thành viên:** Cả nhóm

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

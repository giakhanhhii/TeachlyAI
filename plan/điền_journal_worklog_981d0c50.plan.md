---
name: Điền JOURNAL WORKLOG
overview: Bổ sung nội dung Tuần 1 (nghiên cứu dữ liệu PDF đề THPT QG Tiếng Anh, bài tập, cách làm bài giảng, RAG) và Tuần 2 (hoàn thành frontend Teachly) vào [JOURNAL.md](JOURNAL.md) và [WORKLOG.md](WORKLOG.md), giữ nguyên cấu trúc form hiện có; thêm mục nhật ký thực tế để không xóa phần Template/Ví dụ mẫu.
todos:
  - id: journal-section
    content: "Thêm ## Nhật ký dự án + Tuần 1 & 2 vào JOURNAL.md (đúng form Ví dụ)"
    status: pending
  - id: worklog-sprints
    content: Thêm ADR (tuỳ chọn), Sprint 1–2, Brainstorm vào WORKLOG.md sau phần ví dụ
    status: pending
  - id: confirm-names-dates
    content: Xác nhận Thành viên + ngày tuần trước khi apply (hoặc dùng Cả nhóm + 04/04 & 11/04/2026)
    status: pending
isProject: false
---

# Kế hoạch điền JOURNAL.md và WORKLOG.md (Tuần 1–2)

## Nguyên tắc

- **Không sửa** nội dung khối `## Template` và code fence bên trong.
- **Không đổi** cấu trúc từng mục con so với [JOURNAL.md](JOURNAL.md) mục **Ví dụ**: `### Tuần N — DD/MM/YYYY` → dòng `**Thành viên:**` → các mục `#### Đã làm`, `#### Khó nhất tuần này`, `#### AI tool đã dùng` (bảng 3 cột), `#### Học được`, `#### Nếu làm lại, sẽ làm khác`, `#### Kế hoạch tuần tới`, kết thúc bằng `---`.
- [WORKLOG.md](WORKLOG.md): dùng đúng form trong **Template** cho từng loại (ADR / Sprint / Brainstorming); không chỉnh sửa phần Template hay các ví dụ mẫu hiện có (`[ADR-1]`, Sprint mẫu, Brainstorm mẫu, Bug mẫu).

## Vị trí chèn (tránh trùng “Tuần 1/2” với ví dụ giả)

- **JOURNAL.md:** Thêm section mới **sau** toàn bộ phần `## Ví dụ` (sau entry Tuần 2 ví dụ và `---` cuối), ví dụ tiêu đề: `## Nhật ký dự án (Teachly / A20)`, rồi hai khối `### Tuần 1` và `### Tuần 2` theo đúng form trên.
- **WORKLOG.md:** Thêm **sau** phần ví dụ (sau mục Bug mẫu), các khối mới: 1–2 ADR ngắn (nếu phù hợp), **Sprint 1** và **Sprint 2** dạng bảng phân công, tùy chọn 1 **Brainstorm** ngắn về nguồn PDF + RAG.

## Ngày tháng (đề xuất, có thể chỉnh khi thực hiện)

- Tuần 1: `04/04/2026` (tuần làm nền tảng / research).
- Tuần 2: `11/04/2026` (khớp ngữ cảnh dự án đang ở đầu tháng 4/2026).

Nếu nhóm có quy ước tuần khác (ví dụ bắt đầu 31/03), chỉ đổi dòng tiêu đề `### Tuần N — …`, không đổi layout.

## Nội dung Tuần 1 (ngắn gọn, đúng yêu cầu)

**Đã làm (gợi ý bullet):**

- Thu thập và phân loại nguồn **PDF đề thi THPT QG môn Tiếng Anh** và **bài tập** (đề minh họa, đề các năm, sách/bộ đề — ghi rõ nguồn công khai / nội bộ tùy nhóm).
- Tìm hiểu **cách làm bài giảng / slide / quiz** phục vụ ôn thi (cấu trúc tiết, mức độ câu hỏi, phân dạng đề).
- Nghiên cứu **RAG**: tài liệu → chunking, embedding, vector store, truy vấn + giới hạn (hallucination, citation).

**Khó nhất / Học được / Làm lại / Kế hoạch tuần tới:** viết 1–3 bullet mỗi mục, sát thực tế (ví dụ: bản quyền PDF, chất lượng OCR, chọn chunk size, so sánh embedding local vs API).

**AI tool:** 1–2 dòng trong bảng (Cursor / Claude / …) — **Thành viên:** dùng `Cả nhóm` hoặc để bạn bổ sung tên thật khi apply (kế hoạch ghi chú rõ chỗ này).

## Nội dung Tuần 2 (ngắn — frontend)

**Đã làm:** Hoàn thành **frontend tĩnh Teachly** trong [frontend/](frontend/): landing [main_hub.html](frontend/main_hub.html), app chat [chatbot_ui.html](frontend/chatbot_ui.html); tách **CSS** ([frontend/css/](frontend/css/)) và **JS ES modules** ([frontend/js/chatbot/](frontend/js/chatbot/)) theo ranh giới UI vs logic (session, guided flow, API) — ngắn gọn, không liệt kê quá kỹ từng file.

**Các mục còn lại:** 1–2 ý khó (ESM + serve HTTP, nối API), học được, làm lại, kế hoạch tuần 3 (ví dụ: tích hợp RAG/backend, upload PDF).

## WORKLOG.md — nội dung đề xuất

1. **`### [ADR-3]`** (tuỳ chọn nhưng hợp lý): Quyết định **stack frontend** (HTML/CSS/JS tĩnh + ESM, chưa React) hoặc **chiến lược dữ liệu cho RAG** (PDF → text → chunk) — 4 đoạn: Bối cảnh / Lựa chọn / Quyết định / Hệ quả (đúng form ADR).
2. **`### Sprint 1 — 04/04 → 10/04/2026`:** Bảng 4–6 dòng: thu thập PDF đề/bài tập; research bài giảng; học RAG; ghi chép nguồn; (cột Người làm có thể `Cả nhóm` hoặc tên).
3. **`### Sprint 2 — 11/04 → 17/04/2026`:** Bảng: layout landing + chat UI; tách CSS/JS; smoke test qua server static; cập nhật tài liệu nội bộ nếu có.
4. **`### Brainstorm: Nguồn dữ liệu & RAG`** (ngày tuần 1): Câu hỏi + 2–3 ý tưởng + kết luận ngắn (đúng form Brainstorming).

## Việc cần xác nhận trước khi ghi (khi bạn bấm thực hiện)

- **Tên thành viên** trong `**Thành viên:**` (hoặc giữ `Cả nhóm`).
- **Ngày chính xác** tuần 1–2 nếu khác đề xuất trên.

Sau khi bạn xác nhận plan, agent sẽ chỉnh sửa trực tiếp hai file markdown theo đúng form, không đụng cấu trúc template.

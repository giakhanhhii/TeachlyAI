# Tài liệu Đề xuất Kiến trúc: Tối ưu hóa "God Components"

Tài liệu này cung cấp các đề xuất (recommendations) cho AI Coding Agent (ví dụ: Cursor) để thực hiện tách các file có kích thước quá lớn thành các module nhỏ hơn. Quyết định triển khai cụ thể cuối cùng nên dựa trên phân tích ngữ cảnh thực tế của Agent tại thời điểm refactor.

## 1. Danh sách các file cần tối ưu (Top 5)

| Đường dẫn file | Số dòng | Vai trò hiện tại |
| :--- | :--- | :--- |
| `frontend/js/chatbot/chatController.js` | ~1200 | Điều khiển chính: Quản lý session, tin nhắn, flow, và chuyển đổi giữa các "experience". |
| `frontend/js/chatbot/dom/flowCards.js` | ~1190 | Chứa logic tạo các form (card) tương tác và dữ liệu mẫu (SAMPLES). |
| `frontend/js/chatbot/guidedFlow.js` | ~660 | Logic xử lý trạng thái và tính toán kết quả (effects) của dòng hội thoại dẫn dắt. |
| `frontend/css/chatbot-experience.css` | ~530 | Toàn bộ CSS cho các giao diện học liệu (Quiz, Flashcard, Slide). |
| `src/pdf_chunker.py` | ~490 | (Backend) Xử lý cắt nhỏ PDF, OCR và làm sạch văn bản. |

---

## 2. Kế hoạch Refactor chi tiết

### A. `chatController.js` (Ưu tiên Cao)
**Vấn đề:** Đang ôm đồm quá nhiều trách nhiệm từ UI, State đến Logic nghiệp vụ.

**Giải pháp:**
1.  **Tách `SessionHandler`:** Chuyển các hàm `renderChatListUI`, `togglePinSession`, `renameSession`, `deleteSession` sang một file quản lý UI danh sách chat riêng.
2.  **Tách `ExperienceManager`:** Quản lý việc `openSingleExperience`, `restoreCurrentSessionExperience` và các hook tương ứng.
3.  **Tách `HistoryService`:** Quản lý `history.pushState`, `onpopstate` và đồng bộ hóa URL/Phase.
4.  **Tách `MessageController`:** Điều phối việc gửi nhận tin nhắn (`pushUser`, `pushBot`) và các trạng thái gửi (`isSending`).

**Cấu trúc mới đề xuất:**
- `frontend/js/chatbot/controllers/sessionController.js`
- `frontend/js/chatbot/controllers/messageController.js`
- `frontend/js/chatbot/services/historyService.js`
- `frontend/js/chatbot/services/experienceService.js`

### B. `flowCards.js` (Ưu tiên Cao)
**Vấn đề:** Chứa cả dữ liệu mẫu khổng lồ và logic tạo DOM phức tạp cho nhiều loại card khác nhau.

**Giải pháp:**
1.  **Tách `SAMPLES`:** Chuyển toàn bộ các mảng `SAMPLES_FULLSET`, `SAMPLES_SLIDE`, v.v. sang `frontend/js/chatbot/data/sampleFlowData.js`.
2.  **Tách theo loại Card:** Chia nhỏ file này thành các module chuyên biệt trong thư mục `frontend/js/chatbot/dom/cards/`:
    - `fullSetCards.js` (Topic & PDF)
    - `experienceCards.js` (Slide, Quiz, Flash - cả Topic và PDF meta)
    - `pdfGateCard.js` (Pick PDF Gate)
3.  **Hàm tiện ích:** Di chuyển `el`, `wrapField`, `showAutoConfirmPanel` vào một file common helper.

### C. `pdf_chunker.py`
**Vấn đề:** Logic OCR, làm sạch text và chiến lược chunking viết chung một chỗ.

**Giải pháp:**
1.  Tách các class/hàm OCR sang `src/utils/ocr_helper.py`.
2.  Tách logic làm sạch text sang một file chuyên biệt (đã có `text_cleaner.py`, cần kiểm tra lại độ chồng chéo).
3.  Giữ `pdf_chunker.py` như một Orchestrator điều phối quá trình.

---

## 3. Quy tắc "Không làm hỏng chức năng" (Safety Rules)

Để đảm bảo không gây lỗi khi tách code:
1.  **Giữ nguyên Interface:** Các hàm được tách ra phải giữ nguyên tên và tham số đầu vào.
2.  **Sử dụng Export/Import:** Tận dụng ES Modules để kết nối lại các phần đã tách. `chatController.js` ban đầu sẽ trở thành nơi import và tập hợp (aggregate) các module nhỏ.
3.  **Kiểm thử sau mỗi bước:** Sau khi tách một module nhỏ (ví dụ: move SAMPLES), phải chạy lại ứng dụng để đảm bảo giao diện vẫn hiển thị đúng.
4.  **Sử dụng Git:** Commit sau mỗi bước refactor thành công để dễ dàng rollback khi phát hiện lỗi logic.

## 4. Danh sách các file mới cần tạo (Dự kiến)

1.  `frontend/js/chatbot/data/sampleFlowData.js`
2.  `frontend/js/chatbot/dom/cards/common.js`
3.  `frontend/js/chatbot/dom/cards/fullSetCards.js`
4.  `frontend/js/chatbot/dom/cards/experienceCards.js`
5.  `frontend/js/chatbot/services/historyService.js`
6.  `frontend/js/chatbot/controllers/sessionController.js`

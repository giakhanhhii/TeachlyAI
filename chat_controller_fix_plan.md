# Hướng dẫn Refactor: `chatController.js` (Chiến lược Đề xuất)

Tài liệu này đóng vai trò như một bản hướng dẫn kiến trúc (Architectural Guide) dành cho AI Agent (như Cursor). Các đề xuất dưới đây giúp chia nhỏ `chatController.js` (~1200 dòng) thành các module độc lập, giúp hệ thống linh hoạt hơn. Agent có toàn quyền quyết định cấu trúc code cuối cùng sao cho tối ưu nhất.

## 1. Phân tích Trách nhiệm Hiện tại

| Nhóm chức năng | Các hàm/logic chính |
| :--- | :--- |
| **Experience Management** | `openSingleExperience`, `restoreCurrentSessionExperience`, `rememberOpenExperience`, `persistActiveExperience`. |
| **History & Navigation** | `ensureHistoryBaseState`, `ensureExperienceHistoryEntry`, `onpopstate`, `handleFlowEntry`. |
| **Message Handling** | `sendPrompt`, `pushUser`, `pushBot`, `renderMessages`, `loadMoreHistory`. |
| **Session UI Logic** | `renderChatListUI`, `newChatBtn` listener, `togglePinSession`, `renameSession`. |
| **Guided Flow Integration** | `onFlowAction`, `handlePdfSourceAction`, `onFlowCardSubmit`. |

---

## 2. Cấu trúc Thư mục Mới Đề xuất

Để quản lý tốt hơn, chúng ta sẽ tạo một cấu trúc thư mục mới trong `frontend/js/chatbot/`:

```text
frontend/js/chatbot/
├── controllers/
│   ├── sessionController.js      # Điều khiển danh sách chat và chuyển đổi session
│   ├── messageController.js      # Điều phối gửi/nhận tin nhắn và render
│   └── experienceController.js   # Quản lý việc mở/khôi phục các loại học liệu
├── services/
│   ├── historyService.js        # Quản lý trình duyệt history và URL
│   └── flowIntegration.js       # Xử lý các action từ Guided Flow
└── chatController.js            # File gốc (chỉ còn là điểm khởi tạo và kết nối)
```

---

## 3. Lộ trình Refactor (Từng bước)

### Bước 1: Trích xuất `ExperienceService` & `ExperienceController`
*   **Mục tiêu:** Tách logic quản lý trạng thái "experience" (Quiz, Slide, Flashcard).
*   **Hàm di chuyển:** `rememberOpenExperience`, `persistActiveExperience`, `openSingleExperience`, `restoreCurrentSessionExperience`, `buildResumeTitle`.
*   **Lợi ích:** `chatController` không còn cần quan tâm đến cách mount hay restore các view học liệu.

### Bước 2: Trích xuất `HistoryService`
*   **Mục tiêu:** Quản lý đồng bộ giữa trạng thái ứng dụng và URL thanh địa chỉ.
*   **Hàm di chuyển:** `ensureHistoryBaseState`, `ensureExperienceHistoryEntry`, logic xử lý `popstate`.
*   **Lợi ích:** Dễ dàng kiểm soát nút Back của trình duyệt mà không làm rối logic chính.

### Bước 3: Trích xuất `SessionController`
*   **Mục tiêu:** Tách logic liên quan đến Sidebar và danh sách Chat.
*   **Hàm di chuyển:** `renderChatListUI`, xử lý sự kiện cho `newChatBtn`, `togglePinSession`, `renameSession`, `deleteSession`.
*   **Lợi ích:** Tách biệt hoàn toàn giao diện danh sách chat (bên trái) và nội dung chat (bên phải).

### Bước 4: Trích xuất `MessageController` (Trái tim của Chat)
*   **Mục tiêu:** Quản lý luồng dữ liệu tin nhắn.
*   **Hàm di chuyển:** `sendPrompt`, `renderMessages`, `loadMoreHistory`, `pushUser`, `pushBot`.
*   **Lợi ích:** Tập trung logic giao tiếp với Backend và hiển thị nội dung tin nhắn vào một nơi.

### Bước 5: Cấu trúc lại `init()` trong `chatController.js`
*   **Mục tiêu:** Trở thành một "Orchestrator" (Người điều phối).
*   **Logic còn lại:** Khởi tạo các controller, đăng ký các hook giao tiếp giữa chúng, và khởi động (boot) ứng dụng.

---

## 4. Kiểm soát Rủi ro (Safety First)

1.  **Không thay đổi `sessionStore.js`:** Giữ nguyên lớp dữ liệu để các controller mới vẫn dùng chung nguồn dữ liệu duy nhất (Single Source of Truth).
2.  **Sử dụng Event/Callback:** Thay vì các module gọi trực tiếp hàm của nhau (gây vòng lặp), sử dụng callback hoặc một hệ thống event đơn giản để thông báo thay đổi.
3.  **Unit Test (nếu có):** Kiểm tra kỹ các logic quan trọng như `computeCompleted` và `sameMeta` sau khi di chuyển.

## 5. Danh sách việc cần làm ngay (Action Items)

- [ ] Tạo thư mục `frontend/js/chatbot/controllers/` và `frontend/js/chatbot/services/`.
- [ ] Di chuyển các helpers đơn giản (`buildResumeTitle`, `splitFlowActionValue`) sang một file `utils.js` nếu cần.
- [ ] Bắt đầu tách `HistoryService` (đây là phần ít phụ thuộc nhất).
- [ ] Tách dần các logic Experience sang `experienceController`.

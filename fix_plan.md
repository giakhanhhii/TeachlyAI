# Fix Plan: Sync Metadata & Content Randomization

## 1. Goal
Đồng bộ hóa số lượng học liệu giữa Form và trải nghiệm thực tế, đảm bảo tính ngẫu nhiên và duy nhất của nội dung trên mỗi phiên làm việc.

## 2. Core Requirements (Emphasized for AI)

### A. Synchronization & Partial Fill Handling
- **Respect Quantity:** Khi người dùng nhập một con số vào ô "Số lượng" (ví dụ: 20 Flashcard, Quiz, hoặc Slide), hệ thống phải tạo ra đúng số lượng đó.
- **Auto-Confirm Logic:** 
    - Nếu người dùng chỉ điền **ô Số lượng** (hoặc chỉ một ô bất kỳ) mà bỏ trống các ô mô tả chính:
        - Hiện thông báo xác nhận: *"Bạn mới điền số lượng (hoặc thông tin một phần), Teachly sẽ tự điền những thông tin còn lại cho bạn. Bạn có muốn tiếp tục không?"*
        - Nếu người dùng chọn **"Có"**: Chuyển ngay đến trải nghiệm đó (Ví dụ: Quiz) với số lượng đã điền.
- **Skip Action:**
    - Nếu người dùng nhấn nút "Bỏ qua" trên Form: Tự động sinh số lượng ngẫu nhiên trong khoảng **20 đến 40** và bắt đầu trải nghiệm ngay.

### B. Randomization & Uniqueness
- **Shuffle Every Time:** Mỗi khi một bộ học liệu được tạo ra (Quiz, Slide, Flashcard), thứ tự các mục phải được xáo trộn ngẫu nhiên.
- **No Duplicates:** Đảm bảo không có 2 mục (từ vựng/câu hỏi) nào bị trùng lặp trong cùng một phiên hiển thị (Session).

### C. Full Set Sync & Randomization
- **Full Set Definition:** Một "Full Set" là một tổ hợp bao gồm cả 3 thành phần (Slide, Quiz, Flashcard) dựa trên một chủ đề/tài liệu.
- **Sync Individual Counts:** Form tạo Full Set phải cung cấp các ô nhập số lượng riêng biệt cho từng loại (Số slide, Số câu Quiz, Số thẻ Flashcard). Khi điền con số này, hệ thống phải tạo ra đúng số lượng tương ứng cho từng loại.
- **Randomized & Mixed Components:** 
    - Mỗi thành phần (Slide, Quiz, Flashcard) phải được xáo trộn nội dung ngẫu nhiên và đảm bảo tính duy nhất (mục B).
    - **Trộn lẫn (Mixed):** Có thể xáo trộn cả thứ tự xuất hiện của 3 thành phần này trong danh sách hiển thị để tạo sự mới mẻ mỗi lần truy cập.

## 3. Implementation Flexibility
Cursor (hoặc AI đảm nhận) có toàn quyền quyết định cách tổ chức code giữa Form View, Controller và Data Service để đạt được các yêu cầu trên một cách sạch sẽ và hiệu quả nhất. Các hướng dẫn logic trong code cũ chỉ mang tính tham khảo, ưu tiên kết quả trải nghiệm người dùng cuối.

---
**Status:** Instruction set updated. Ready for execution.

# Tính năng mới: Làm full đề THPTQG

## Mục tiêu

Bổ sung một mode riêng cho người dùng muốn làm trọn bộ đề THPTQG theo luồng cố định, thay vì tự tạo quiz từ PDF hoặc chủ đề. Tính năng này đi theo hướng thư viện đề mẫu, làm bài toàn đề, nộp bài, xem kết quả tổng quan, xem chi tiết từng câu và đọc giải thích đáp án.

## Điểm vào tính năng

- Trong flow `quiz`, thêm action mới `Làm full đề THPTQG`.
- Nút này xuất hiện cùng hàng với `Tải lên PDF` và `Nhập chủ đề trực tiếp`.
- Khi bấm vào, hệ thống không mở `quiz_form` hiện tại mà chuyển sang experience riêng `thptqg_fulltest`.

## Luồng người dùng

1. Người dùng mở flow quiz.
2. Người dùng chọn `Làm full đề THPTQG`.
3. Hệ thống mở danh sách `THPTQG simulation tests`.
4. Người dùng chọn một đề khả dụng để làm.
5. Người dùng làm bài theo từng part, điều hướng bằng sidebar bên phải.
6. Người dùng nộp bài.
7. Hệ thống hiển thị kết quả tổng quan.
8. Người dùng bấm `Chi tiết` để xem từng câu.
9. Người dùng mở `Giải thích chi tiết đáp án` để xem lời giải.

## Danh sách đề

- Hiển thị `THPTQG simulation test 1` đến `THPTQG simulation test 5`.
- Chỉ `THPTQG simulation test 1` khả dụng trong bản v1.
- `THPTQG simulation test 2..5` hiển thị trạng thái khóa với nhãn `Sắp có`.
- Trạng thái nút theo tiến độ:
  - chưa làm: `Làm đề`
  - đang làm dở: `Tiếp tục làm`
  - đã nộp: `Xem kết quả`
  - chưa có dữ liệu: `Sắp có`

## Cấu trúc đề thi

- Bản v1 dùng dữ liệu từ `mockdata_40.md`.
- Tổng số câu: `40`.
- Thời gian hiển thị: `60 phút`.
- Đề được chia thành `4 part`.
- Mỗi `part` có đúng `10 câu`.

### Mapping part

- `Part 1`: câu `1-10`
- `Part 2`: câu `11-20`
- `Part 3`: câu `21-30`
- `Part 4`: câu `31-40`

## Màn hình làm bài

- Giao diện làm bài là experience riêng, không tái sử dụng trực tiếp `quizExperienceView`.
- Vùng chính hiển thị passage, instruction và câu hỏi của part hiện tại.
- Sidebar phải hiển thị:
  - thời gian đã làm
  - nút `Nộp bài`
  - danh sách `Part 1..4`
  - question map để nhảy nhanh đến từng câu
- Toàn bộ label kiểu `Recording` được thay bằng `Part`.
- Người dùng có thể:
  - chọn đáp án
  - chuyển part
  - nhảy trực tiếp tới câu bất kỳ
  - đánh dấu câu cần xem lại

## Lưu trạng thái và resume

Mỗi lần người dùng chọn đáp án hoặc đổi vị trí làm bài, state được lưu lại để có thể resume đúng chỗ đang làm.

### State chính

- `testId`
- `answersByQuestion`
- `flaggedQuestions`
- `currentPartId`
- `currentQuestion`
- `startedAt`
- `elapsedSeconds`
- `submittedAt`
- `reviewMode`
- `activeResultPartId`
- `detailQuestionId`

### Quy tắc resume

- Nếu bài chưa nộp, mở lại đúng đề, đúng part và đúng câu gần nhất.
- Nếu bài đã nộp, mở lại thẳng trang kết quả của đề đó.

## Màn hình kết quả

- Hiển thị card tổng quan:
  - số câu đúng
  - số câu sai
  - số câu bỏ qua
  - thời gian hoàn thành
  - điểm quy đổi trên thang 10
- Có filter:
  - `Tổng quát`
  - `Part 1`
  - `Part 2`
  - `Part 3`
  - `Part 4`
- Có bảng thống kê theo part:
  - số câu đúng
  - số câu sai
  - số câu bỏ qua
  - độ chính xác
  - danh sách câu

## Màn hình chi tiết

- Hiển thị danh sách câu theo part.
- Mỗi câu cho biết:
  - trạng thái `Đúng / Sai / Bỏ qua`
  - đáp án đã chọn
  - đáp án đúng
  - nút `Chi tiết`
- Khi mở chi tiết câu:
  - hiển thị lại nội dung câu hỏi
  - hiển thị đáp án đúng
  - hiển thị trích đoạn liên quan hoặc evidence
  - có accordion `Giải thích chi tiết đáp án`

## Dữ liệu mock

- Tạo mock resource mới tên logic `thptqg_fulltest`.
- Backend trả dữ liệu qua `/api/mock/thptqg_fulltest`.
- Frontend có embedded fallback để vẫn chạy được khi không gọi API.
- Dữ liệu được chuẩn hóa thành bundle có:
  - `catalog`
  - `tests[]`
  - `parts[]`
  - `questions[]`

### Ghi chú dữ liệu

- Bản v1 chấm điểm theo answer key của `mockdata_40.md`.
- Một vài câu được giữ nguyên theo bảng đáp án gốc để bảo toàn tính nhất quán với dữ liệu mock hiện tại.
- Phần giải thích đáp án là dữ liệu tĩnh, không phụ thuộc AI runtime.

## File liên quan

- `frontend/js/chatbot/guidedFlow/shared.js`
- `frontend/js/chatbot/guidedFlow/pickAction.js`
- `frontend/js/chatbot/controllers/guidedInteractionController.js`
- `frontend/js/chatbot/controllers/experienceController.js`
- `frontend/js/chatbot/chatController.js`
- `frontend/js/chatbot/services/experienceStateService.js`
- `frontend/js/chatbot/services/experienceResumeService.js`
- `frontend/js/chatbot/services/experienceHistoryService.js`
- `frontend/js/chatbot/services/mockContentApi.js`
- `frontend/js/chatbot/services/embeddedThptqgFullTestBundle.js`
- `frontend/js/chatbot/dom/thptqgFullTestExperienceView.js`
- `frontend/css/quiz-exp.css`
- `backend/mock/thptqg_fulltest.json`
- `src/api_server.py`

## Checklist kiểm thử

- Action `Làm full đề THPTQG` hiển thị đúng trong flow quiz.
- Mở danh sách đề thấy `test 1` khả dụng, `test 2..5` bị khóa.
- Mở `test 1` thấy đúng `4 part`, mỗi `part` đúng `10 câu`.
- Chọn đáp án ở nhiều câu rồi reload/resume vẫn giữ được dữ liệu.
- Nộp bài khi còn câu trống vẫn tính được `bỏ qua`.
- Kết quả đúng/sai/bỏ qua khớp answer key mock.
- Filter theo part cập nhật thống kê đúng.
- Mỗi câu trong trang chi tiết hiển thị đủ đáp án chọn, đáp án đúng và giải thích.

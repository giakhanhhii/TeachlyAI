/**
 * @typedef {{ autoMode: boolean }} GuidanceContext
 */

/** @type {Array<{ test: RegExp, condition?: (ctx: GuidanceContext) => boolean, message: string }>} */
const INTENTS = [
  // ── Chọn chủ đề khi đang ở chế độ Auto ────────────────────────────────────
  {
    test: /chọn\s*chủ\s*đề|đổi\s*chủ\s*đề|tự\s*chọn\s*chủ\s*đề|muốn\s*chọn\s*chủ\s*đề|chủ\s*đề\s*(khác|mới)|chọn\s*topic/i,
    condition: (ctx) => ctx.autoMode,
    message:
      "Trong chế độ **Tạo Auto**, Teachly tự động chọn chủ đề phù hợp cho bạn.\n\n"
      + "Nếu muốn tự chọn chủ đề, hãy nhấn nút **Tạo Auto** ở góc trên phải → chuyển sang **Tạo Custom** "
      + "→ rồi chọn loại bài học (Quiz, Slide hoặc Flashcard) và điền chủ đề bạn muốn.",
  },

  // ── Giải thích / bật tắt Auto Mode ────────────────────────────────────────
  {
    test: /\b(?:auto\s*mode|chế\s*độ\s*auto|tạo\s*auto|tạo\s*custom|bật\s*auto|tắt\s*auto|chuyển\s*(?:sang\s+)?(?:chế\s+độ\s+)?(?:auto|custom)|auto\s*(?:là|có\s*nghĩa|hoạt\s*động|dùng\s*để))/i,
    message:
      "Teachly có 2 chế độ tạo nội dung:\n\n"
      + "- **Tạo Auto**: Teachly tự chọn chủ đề và tạo bài liên tục — học nhanh mà không cần cấu hình.\n"
      + "- **Tạo Custom**: Bạn tự nhập chủ đề, số lượng câu/slide và các tùy chọn khác.\n\n"
      + "Để chuyển đổi, nhấn nút **Tạo Auto / Tạo Custom** ở góc trên phải trang chủ.",
  },

  // ── Tạo Quiz ───────────────────────────────────────────────────────────────
  {
    test: /(?:tạo|làm|bắt\s*đầu|muốn|học)\s+(?:bộ\s*|một\s*)?quiz\b|tạo\s+câu\s+hỏi\s+trắc\s+nghiệm/i,
    message:
      "Để tạo Quiz:\n"
      + "1. Nhấn nút **Home** (🏠) ở góc trên trái để về trang chủ\n"
      + "2. Nhấn vào thẻ **Quiz**\n"
      + "3. Điền chủ đề, chọn số câu và độ khó\n"
      + "4. Nhấn **Tạo Quiz** — Teachly sẽ tự tạo bộ câu hỏi cho bạn!",
  },

  // ── Tạo Slide ──────────────────────────────────────────────────────────────
  {
    test: /(?:tạo|làm|bắt\s*đầu|muốn|xem)\s+(?:bộ\s*|một\s*)?slide\b|tạo\s+(?:bài\s+)?trình\s+chiếu/i,
    message:
      "Để tạo Slide:\n"
      + "1. Nhấn nút **Home** (🏠) ở góc trên trái để về trang chủ\n"
      + "2. Nhấn vào thẻ **Slide**\n"
      + "3. Điền chủ đề, chọn số slide và giao diện\n"
      + "4. Nhấn **Tạo Slide** — Teachly sẽ thiết kế bộ slide cho bạn!",
  },

  // ── Tạo Flashcard ──────────────────────────────────────────────────────────
  {
    test: /(?:tạo|làm|bắt\s*đầu|muốn|học)\s+(?:bộ\s*|một\s*)?(?:flash\s*card|flashcard|thẻ\s*(?:từ\s*vựng|ghi\s*nhớ|học))|tạo\s+thẻ\s+(?:từ\s*vựng|ghi\s*nhớ)/i,
    message:
      "Để tạo Flashcard:\n"
      + "1. Nhấn nút **Home** (🏠) ở góc trên trái để về trang chủ\n"
      + "2. Nhấn vào thẻ **Flashcard**\n"
      + "3. Điền chủ đề hoặc danh sách từ vựng, chọn số thẻ\n"
      + "4. Nhấn **Tạo Flashcard** — bộ thẻ sẽ được tạo ngay!",
  },

  // ── Tạo Full Set ───────────────────────────────────────────────────────────
  {
    test: /(?:tạo|làm|bắt\s*đầu|muốn|học)\s+full\s*set\b|full\s*set\s*(?:là|có|gồm|gồm\s*những|hoạt\s*động)|fullset/i,
    message:
      "**Full Set** là gói học toàn diện gồm **Slide + Quiz + Flashcard** cho cùng một chủ đề — tạo một lần, học đủ cả ba!\n\n"
      + "Để tạo Full Set:\n"
      + "1. Nhấn nút **Home** (🏠) để về trang chủ\n"
      + "2. Nhấn vào thẻ **Full Set** (được khuyên dùng)\n"
      + "3. Điền chủ đề và số lượng mong muốn\n"
      + "4. Nhấn **Tạo Full Set**",
  },

  // ── Tiếp tục / resume bài cũ ───────────────────────────────────────────────
  {
    test: /tiếp\s*tục\s*(?:bài|học|làm|quiz|slide|flashcard)|làm\s*tiếp|mở\s*lại\s*bài|quay\s*lại\s*bài|vào\s*lại\s*bài\s*(?:cũ|trước)|resume\s*bài/i,
    message:
      "Để tiếp tục bài học đang dở:\n"
      + "- Nhìn vào **phần dưới cùng của chat** — Teachly hiển thị nút **Tiếp tục** cho bài học gần nhất.\n"
      + "- Hoặc nhấn vào **tên hội thoại** trong sidebar bên trái để quay lại phiên học trước.",
  },

  // ── Đổi số lượng câu / slide / thẻ ────────────────────────────────────────
  {
    test: /(?:đổi|thay\s*đổi|tăng|giảm|muốn\s*(?:nhiều|ít|thêm|bớt))\s*(?:số\s*)?(?:câu\s*(?:hỏi)?|slide|thẻ|flashcard)|số\s*lượng\s*(?:câu|slide|thẻ)|(?:nhiều|ít)\s*câu\s*hơn|(?:nhiều|ít)\s*slide\s*hơn/i,
    message:
      "Số lượng câu hỏi, slide hoặc flashcard được đặt **lúc tạo bài**:\n"
      + "- Trong form tạo nội dung, tìm ô **Số lượng** và điền số bạn muốn.\n"
      + "- Nếu đang ở chế độ **Auto**, nhấn vào thẻ bài học — hộp thoại chọn số lượng sẽ xuất hiện trước khi bắt đầu.",
  },

  // ── Độ khó ─────────────────────────────────────────────────────────────────
  {
    test: /(?:chọn|đổi|thay\s*đổi|điều\s*chỉnh)\s*độ\s*khó|(?:khó|dễ)\s*hơn|cấp\s*độ\s*(?:khó|dễ|học)|độ\s*khó\s*(?:là|có|như\s*thế\s*nào|của)/i,
    message:
      "Độ khó được chọn khi **tạo Quiz**:\n"
      + "- Trong form Quiz, tìm mục **Độ khó** với 4 cấp: *Mất gốc → Cơ bản → Trung bình → Nâng cao*.\n"
      + "- Chọn cấp phù hợp rồi nhấn **Tạo Quiz**.",
  },

  // ── Upload file / PDF ──────────────────────────────────────────────────────
  {
    test: /upload|tải\s*lên\s*(?:file|tài\s*liệu|pdf|word|ảnh)|từ\s*(?:file|tài\s*liệu|pdf)|dùng\s*file|nhập\s*từ\s*file|tạo\s*(?:quiz|slide|flashcard)\s*từ\s*(?:file|tài\s*liệu)/i,
    message:
      "Teachly hỗ trợ tạo nội dung từ file (PDF, Word, ảnh, văn bản):\n"
      + "1. Mở form tạo Quiz / Slide / Flashcard\n"
      + "2. Chọn tab **Từ file** thay vì nhập chủ đề thủ công\n"
      + "3. Hoặc nhấn nút **📎** (đính kèm) ở góc dưới trái ô chat để tải file lên trực tiếp.",
  },

  // ── Chia sẻ bài ────────────────────────────────────────────────────────────
  {
    test: /chia\s*sẻ\s*(?:bài|link|kết\s*quả|slide|quiz|flashcard)|share\s*(?:bài|link)|gửi\s*(?:link|bài)\s*cho|tạo\s*link\s*chia\s*sẻ/i,
    message:
      "Để chia sẻ bài học:\n"
      + "1. Mở bài học (Quiz, Slide hoặc Flashcard) bạn muốn chia sẻ\n"
      + "2. Trong giao diện bài học, nhấn nút **Chia sẻ** (biểu tượng ⬆️ hoặc 🔗)\n"
      + "3. Teachly tạo link — sao chép và gửi cho bạn bè!",
  },

  // ── Tạo chat mới ──────────────────────────────────────────────────────────
  {
    test: /(?:tạo|bắt\s*đầu|mở)\s*(?:chat|hội\s*thoại|cuộc\s*trò\s*chuyện)\s*mới|new\s*chat\b|chat\s*mới\b/i,
    message:
      "Để tạo hội thoại mới, nhấn nút **+ New Chat** ở đầu sidebar bên trái.\n"
      + "Mỗi hội thoại lưu riêng lịch sử chat và bài học của bạn.",
  },

  // ── Về trang chủ ──────────────────────────────────────────────────────────
  {
    test: /(?:về|quay\s*(?:về|lại)|trở\s*về|thoát\s*về|back\s*to)\s*trang\s*chủ|thoát\s*(?:ra\s*)?(?:ngoài|khỏi)\s*(?:chat|bài)/i,
    message:
      "Để về trang chủ, nhấn nút **Home** (🏠) ở góc trên bên trái thanh tiêu đề.",
  },

  // ── Đăng xuất ─────────────────────────────────────────────────────────────
  {
    test: /\b(?:đăng\s*xuất|logout|thoát\s*(?:tài\s*khoản|khỏi\s*tài\s*khoản)|log\s*out|sign\s*out)\b/i,
    message:
      "Để đăng xuất:\n"
      + "1. Nhìn vào sidebar bên trái, phần dưới cùng\n"
      + "2. Nhấn biểu tượng **cài đặt** (⚙️) cạnh tên tài khoản\n"
      + "3. Chọn **Đăng xuất** trong menu hiện ra.",
  },

  // ── Xóa lịch sử chat ──────────────────────────────────────────────────────
  {
    test: /xóa\s*(?:lịch\s*sử|(?:tất\s*cả\s*)?chat|hội\s*thoại|cuộc\s*trò\s*chuyện)|clear\s*(?:history|chat)\b|dọn\s*(?:dẹp\s*)?chat/i,
    message:
      "Để xóa lịch sử chat:\n"
      + "1. Trong sidebar, nhấn biểu tượng **cài đặt** (⚙️) cạnh tên tài khoản\n"
      + "2. Chọn **Xóa chat không ghim**\n\n"
      + "*Mẹo: Nhấn chuột phải vào tên chat và chọn **Ghim** để giữ lại các hội thoại quan trọng trước khi xóa.*",
  },

  // ── Đăng nhập ─────────────────────────────────────────────────────────────
  {
    test: /\b(?:đăng\s*nhập|login|log\s*in|sign\s*in)\b/i,
    message:
      "Để đăng nhập, nhấn nút **Đăng nhập** ở góc trên phải trang chủ (hoặc bất kỳ nút bài học nào — Teachly sẽ yêu cầu đăng nhập tự động).",
  },

  // ── Gợi ý / recommendation panel ─────────────────────────────────────────
  {
    test: /(?:bảng|panel|mục)\s*(?:gợi\s*ý|đề\s*xuất|recommendation)|gợi\s*ý\s*(?:chủ\s*đề|bài\s*học)|đề\s*xuất\s*(?:chủ\s*đề|bài\s*học)/i,
    message:
      "Teachly có **Bảng gợi ý** hiển thị các chủ đề được đề xuất dựa trên thời gian bạn học.\n\n"
      + "Để bật/tắt bảng này:\n"
      + "1. Nhấn biểu tượng **cài đặt** (⚙️) trong sidebar\n"
      + "2. Bật/tắt tùy chọn **Hiển thị gợi ý**.",
  },

  // ── Hướng dẫn chung ───────────────────────────────────────────────────────
  {
    test: /hướng\s*dẫn\s*(?:sử\s*dụng|dùng|cách\s*dùng)|cách\s*(?:sử\s*dụng|dùng)\s*(?:teachly|app|ứng\s*dụng)|teachly\s*(?:là\s*gì|có\s*thể|làm\s*được|gồm|có\s*gì)|tính\s*năng\s*(?:của\s*teachly)?|(?:giúp|hỗ\s*trợ)\s*(?:tôi|mình|em)\s*(?:dùng|sử\s*dụng)\s*teachly/i,
    message:
      "Teachly giúp bạn tạo tài liệu học tập bằng AI. Các tính năng chính:\n\n"
      + "- **Full Set** — Tạo Slide + Quiz + Flashcard cùng lúc cho một chủ đề\n"
      + "- **Slide** — Tạo bài trình chiếu có hình ảnh và ghi chú\n"
      + "- **Quiz** — Tạo bộ câu hỏi trắc nghiệm theo chủ đề và độ khó\n"
      + "- **Flashcard** — Tạo thẻ ôn từ vựng có phiên âm và dịch nghĩa\n\n"
      + "Bắt đầu bằng cách nhấn vào một trong **4 thẻ** trên trang chủ, hoặc nhắn tên tính năng bạn muốn dùng để được hướng dẫn chi tiết!",
  },
];

/**
 * Trả về tin nhắn hướng dẫn nếu prompt khớp với một intent đã biết, ngược lại trả null.
 * @param {string} prompt
 * @param {GuidanceContext} context
 * @returns {string | null}
 */
export function resolveGuidanceMessage(prompt, context) {
  const ctx = context && typeof context === "object" ? context : { autoMode: false };
  for (const intent of INTENTS) {
    if (intent.condition && !intent.condition(ctx)) continue;
    if (intent.test.test(prompt)) return intent.message;
  }
  return null;
}

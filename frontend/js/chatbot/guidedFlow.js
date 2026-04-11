/**
 * Pure guided-flow transitions (no DOM). Controller applies returned `effects`.
 * @param {any} guided
 * @param {string} value
 */
export function computePickAction(guided, value) {
  if (!guided || guided.kind !== "pick" || guided.step !== "main") {
    return { handled: false, guided, effects: [] };
  }
  if (value === "mcq") {
    return {
      handled: true,
      guided: { kind: "quiz", step: "quiz_topic", data: {} },
      effects: [
        { type: "pushUser", text: "Tạo đề trắc nghiệm" },
        {
          type: "pushBot",
          text: 'Chủ đề:\nBạn muốn làm đề về phần nào? (Ví dụ: Ngữ pháp tổng hợp, Đọc hiểu, Full đề, hoặc up file của bạn)\n\nHãy gõ câu trả lời vào ô chat bên dưới.',
        },
      ],
    };
  }
  if (value === "flash") {
    return {
      handled: true,
      guided: { kind: "flash", step: "flash_source", data: {} },
      effects: [
        { type: "pushUser", text: "Tạo flash card từ vựng" },
        {
          type: "pushBot",
          text: 'Nguồn:\nBạn muốn mình lấy từ vựng từ đâu? (Dán danh sách vào đây hoặc up file PDF của bạn — có thể bỏ qua để mình tự động tạo từ vựng)\n\nTrả lời trong ô chat.',
        },
      ],
    };
  }
  return { handled: false, guided, effects: [] };
}

/**
 * @param {any} guided
 * @param {string} text
 */
export function computeGuidedTextSubmit(guided, text) {
  if (!guided) return { handled: false, guided: null, effects: [] };
  if (guided.kind === "pick") return { handled: false, guided, effects: [] };

  const g = guided;

  if (g.kind === "quiz") {
    if (g.step === "quiz_topic") {
      return {
        handled: true,
        guided: { ...g, step: "quiz_count", data: { ...g.data, topic: text } },
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: 'Số lượng:\nBạn muốn thử sức với bao nhiêu câu? (Tối đa 50 câu)\n\nGõ con số hoặc mô tả trong ô chat.',
          },
        ],
      };
    }
    if (g.step === "quiz_count") {
      return {
        handled: true,
        guided: { ...g, step: "quiz_notes", data: { ...g.data, count: text } },
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: 'Ghi chú thêm:\nBạn có ghi chú nào cho đề quiz không? (Ví dụ: mức độ khó, dạng câu ưu tiên, hay gõ "không")\n\nTrả lời trong ô chat.',
          },
        ],
      };
    }
    if (g.step === "quiz_notes") {
      const meta = { ...g.data, notes: text };
      return {
        handled: true,
        guided: null,
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: "Cảm ơn bạn! Mình đã ghi nhận chủ đề, số lượng và ghi chú.\n\nBên dưới là giao diện làm bài.",
          },
          { type: "showQuiz", meta },
        ],
      };
    }
  }

  if (g.kind === "flash") {
    if (g.step === "flash_source") {
      return {
        handled: true,
        guided: { ...g, step: "flash_count", data: { ...g.data, source: text } },
        effects: [
          { type: "pushUser", text },
          { type: "pushBot", text: 'Số lượng:\nBạn muốn tạo bộ bao nhiêu thẻ? (tối đa 50)\n\nGõ trong ô chat.' },
        ],
      };
    }
    if (g.step === "flash_count") {
      return {
        handled: true,
        guided: { ...g, step: "flash_extra", data: { ...g.data, count: text } },
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: 'Ghi chú thêm:\nBạn có ghi chú nào cho bộ flashcard không? (Có thể gõ "không")\n\nTrả lời trong ô chat.',
          },
        ],
      };
    }
    if (g.step === "flash_extra") {
      const meta = { ...g.data, extra: text };
      return {
        handled: true,
        guided: null,
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: "Cảm ơn bạn!\n\nBên dưới là bộ flashcard — nhấn thẻ để lật mặt trước và mặt sau.",
          },
          { type: "showFlash", meta },
        ],
      };
    }
  }

  if (g.kind === "slide") {
    if (g.step === "slide_topic") {
      return {
        handled: true,
        guided: { ...g, step: "slide_count", data: { ...g.data, topic: text } },
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: 'Số slide:\nBạn muốn khoảng bao nhiêu slide? (Gợi ý: 5–15)\n\nGõ con số trong ô chat.',
          },
        ],
      };
    }
    if (g.step === "slide_count") {
      return {
        handled: true,
        guided: { ...g, step: "slide_notes", data: { ...g.data, count: text } },
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: 'Ghi chú thêm:\nBạn có ghi chú nào cho bộ slide không? (Phong cách, độ sâu nội dung… hoặc gõ "không")\n\nTrả lời trong ô chat.',
          },
        ],
      };
    }
    if (g.step === "slide_notes") {
      const meta = { ...g.data, notes: text };
      return {
        handled: true,
        guided: null,
        effects: [
          { type: "pushUser", text },
          {
            type: "pushBot",
            text: "Cảm ơn bạn! Mình đã ghi nhận chủ đề, số slide và ghi chú.\n\nBên dưới là xem trước bộ slide.",
          },
          { type: "showSlide", meta },
        ],
      };
    }
  }

  return { handled: false, guided, effects: [] };
}

/** @param {string | null} flow */
export function computeStartFlow(flow) {
  let guided = null;
  const effects = [];

  if (flow === "fullset") {
    guided = { kind: "pick", step: "main", data: {} };
    effects.push({
      type: "pushBot",
      text: "Chào bạn! Hôm nay bạn muốn tạo Full Set THPTQG tiếng anh theo cách nào?",
      actions: [
        { label: "Tạo đề trắc nghiệm", value: "mcq" },
        { label: "Tạo flash card từ vựng", value: "flash" },
      ],
    });
    return { guided, effects };
  }
  if (flow === "quiz") {
    guided = { kind: "quiz", step: "quiz_topic", data: {} };
    effects.push({
      type: "pushBot",
      text: 'Chào bạn! Bạn vào mục Tạo quiz.\n\nChủ đề:\nBạn muốn làm đề về phần nào? (Ví dụ: Ngữ pháp tổng hợp, Đọc hiểu, hoặc up file của bạn)\n\nTrả lời trong ô chat.',
    });
    return { guided, effects };
  }
  if (flow === "slide") {
    guided = { kind: "slide", step: "slide_topic", data: {} };
    effects.push({
      type: "pushBot",
      text: 'Chào bạn! Bạn vào mục Tạo slide.\n\nChủ đề:\nBạn muốn slide về nội dung gì? (Ví dụ: Ngữ pháp tổng hợp, Đọc hiểu, Ôn tập trước thi)\n\nTrả lời trong ô chat.',
    });
    return { guided, effects };
  }
  if (flow === "flashcard") {
    guided = { kind: "flash", step: "flash_source", data: {} };
    effects.push({
      type: "pushBot",
      text: 'Chào bạn! Bạn vào mục Tạo flashcard với âm thanh.\n\nNguồn từ vựng:\nBạn muốn mình lấy từ vựng từ đâu? (Dán danh sách vào đây hoặc up file PDF của bạn)\n\nTrả lời trong ô chat.',
    });
    return { guided, effects };
  }
  return { guided: null, effects: [] };
}

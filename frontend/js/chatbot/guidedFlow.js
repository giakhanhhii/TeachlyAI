/**
 * Pure guided-flow transitions (no DOM). Controller applies returned `effects`.
 * @param {any} guided
 * @param {string} value
 */
export function computePickAction(guided, value) {
  if (!guided || guided.kind !== "fullset" || guided.step !== "await_source") {
    return { handled: false, guided, effects: [] };
  }
  if (value === "fullset_pdf") {
    return {
      handled: true,
      guided: { kind: "fullset", step: "await_pdf_confirm", data: {} },
      effects: [
        { type: "pushUser", text: "Tải lên PDF" },
        {
          type: "pushBot",
          text:
            "Bạn đã chọn tải lên PDF.\n\nKhi tích hợp xong, Teachly sẽ dùng Chandra OCR2 để chuyển nội dung sang Markdown. Hiện tại bạn chỉ cần chọn tệp bên dưới để hoàn tất bước chuẩn bị trên giao diện.",
          cardType: "fullset_pdf",
        },
      ],
    };
  }
  if (value === "fullset_topic") {
    return {
      handled: true,
      guided: { kind: "fullset", step: "await_topic_form", data: {} },
      effects: [
        { type: "pushUser", text: "Nhập chủ đề trực tiếp" },
        {
          type: "pushBot",
          text:
            "Tuyệt vời! Bạn hãy hoàn thiện nhanh các thông tin dưới đây để Teachly bắt đầu soạn Full Set nhé:",
          cardType: "fullset_topic",
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
  void text;
  if (!guided) return { handled: false, guided: null, effects: [] };
  return { handled: false, guided, effects: [] };
}

/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeFlowCardSubmit(guided, cardType, payload) {
  if (!guided) return { handled: false, guided, effects: [] };

  if (guided.kind === "fullset" && guided.step === "await_pdf_confirm" && cardType === "fullset_pdf") {
    const name = payload.fileName || "—";
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `Đã chọn tệp PDF: ${name}` },
        {
          type: "pushBot",
          text:
            "Cảm ơn bạn! Tệp đã được ghi nhận trên giao diện.\n\nBước chuyển Markdown bằng Chandra OCR2 sẽ được kích hoạt khi tích hợp backend — bạn có thể tiếp tục trò chuyện hoặc quay về trang chủ để chọn chức năng khác.",
        },
      ],
    };
  }

  if (guided.kind === "fullset" && guided.step === "await_topic_form" && cardType === "fullset_topic") {
    const lines = [
      `[Full Set — chủ đề] ${payload.topic}`,
      `Trình độ: ${payload.level}`,
      `Số lượng — Slide: ${payload.slides}, Quiz: ${payload.quiz}, Flashcard: ${payload.flash}`,
    ];
    if (payload.extra) lines.push(`Yêu cầu thêm: ${payload.extra}`);
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: lines.join("\n") },
        {
          type: "pushBot",
          text:
            "Teachly đã nhận đủ thông tin để chuẩn bị Full Set theo chủ đề của bạn (giao diện demo).\n\nViệc sinh nội dung thực tế sẽ được nối với backend/AI ở bước sau.",
        },
      ],
    };
  }

  if (guided.kind === "slide" && guided.step === "await_form" && cardType === "slide_form") {
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      payload.fileName ? `Tệp đính kèm: ${payload.fileName}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic: payload.topic || "—",
      count: payload.count || "—",
      notes: notes || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `[Slide] ${meta.topic} — ${meta.count} slide${meta.notes !== "—" ? ` — ${meta.notes}` : ""}`,
        },
        {
          type: "pushBot",
          text: "Cảm ơn bạn! Thông tin đã được ghi nhận.\n\nBên dưới là xem trước bộ slide (mock).",
        },
        { type: "showSlide", meta },
      ],
    };
  }

  if (guided.kind === "quiz" && guided.step === "await_form" && cardType === "quiz_form") {
    const topic = [payload.source, payload.kind].filter(Boolean).join(" — ") || "—";
    const notes = [payload.difficulty ? `Tỉ lệ độ khó: ${payload.difficulty}` : "", payload.notes ? `Ghi chú: ${payload.notes}` : "", payload.fileName ? `Tệp: ${payload.fileName}` : ""]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic,
      count: payload.count || "—",
      notes: notes || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `[Quiz THPTQG] ${meta.topic} — ${meta.count} câu`,
        },
        {
          type: "pushBot",
          text: "Thiết lập đã xong trên giao diện.\n\nBên dưới là giao diện làm bài (mock).",
        },
        { type: "showQuiz", meta },
      ],
    };
  }

  if (guided.kind === "flash" && guided.step === "await_form" && cardType === "flash_form") {
    const src = payload.list || "(Teachly gợi ý theo ghi chú)";
    const extra = [payload.back ? `Mặt sau: ${payload.back}` : "", payload.aiImage ? `Hình AI: ${payload.aiImage}` : "", payload.notes ? `Ghi chú: ${payload.notes}` : ""]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      source: src,
      count: "—",
      extra: extra || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `[Flashcard] ${src}` },
        {
          type: "pushBot",
          text: "Cảm ơn bạn!\n\nBên dưới là bộ flashcard xem trước (mock) — nhấn thẻ để lật.",
        },
        { type: "showFlash", meta },
      ],
    };
  }

  return { handled: false, guided, effects: [] };
}

/** @param {string | null} flow */
export function computeStartFlow(flow) {
  let guided = null;
  const effects = [];

  if (flow === "fullset") {
    guided = { kind: "fullset", step: "await_source", data: {} };
    effects.push({
      type: "pushBot",
      text:
        "Chào bạn! Để bắt đầu, bạn đã có tài liệu (PDF/Văn bản) sẵn chưa hay muốn tôi tự biên soạn theo chủ đề?",
      actions: [
        { label: "Tải lên PDF", value: "fullset_pdf" },
        { label: "Nhập chủ đề trực tiếp", value: "fullset_topic" },
      ],
    });
    return { guided, effects };
  }

  if (flow === "slide") {
    guided = { kind: "slide", step: "await_form", data: {} };
    effects.push({
      type: "pushBot",
      text: "Hãy điền thông tin để tôi thiết kế bài giảng cho bạn:",
      cardType: "slide_form",
    });
    return { guided, effects };
  }

  if (flow === "quiz") {
    guided = { kind: "quiz", step: "await_form", data: {} };
    effects.push({
      type: "pushBot",
      text: "Thiết lập thông số cho bộ câu hỏi trắc nghiệm của bạn tại đây:",
      cardType: "quiz_form",
    });
    return { guided, effects };
  }

  if (flow === "flashcard") {
    guided = { kind: "flash", step: "await_form", data: {} };
    effects.push({
      type: "pushBot",
      text: "Cung cấp danh sách từ vựng để Teachly tạo bộ Flashcard thông minh:",
      cardType: "flash_form",
    });
    return { guided, effects };
  }

  return { guided: null, effects: [] };
}

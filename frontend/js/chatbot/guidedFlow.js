export const MSG_START_SOURCE =
  "Chào bạn! Để bắt đầu, bạn đã có tài liệu (PDF/Văn bản) sẵn chưa hay muốn tôi tự biên soạn theo chủ đề?";

/** Các nút “Tải lên PDF” ở bước chọn nguồn — cần chọn file trước khi vào form. */
export const PDF_SOURCE_ACTION_VALUES = new Set(["fullset_pdf", "slide_pdf", "quiz_pdf", "flash_pdf"]);

/**
 * Lặp lại câu hỏi mở đầu + 2 nút khi người dùng hủy chọn PDF.
 * @param {"fullset"|"slide"|"quiz"|"flash"} kind
 * @returns {{ type: "pushBot", text: string, actions: { label: string, value: string }[] }[]}
 */
export function getRestartAwaitSourceEffects(kind) {
  if (kind === "fullset") {
    return [
      {
        type: "pushBot",
        text: MSG_START_SOURCE,
        actions: [
          { label: "Tải lên PDF", value: "fullset_pdf" },
          { label: "Nhập chủ đề trực tiếp", value: "fullset_topic" },
        ],
      },
    ];
  }
  if (kind === "slide") {
    return [
      {
        type: "pushBot",
        text: MSG_START_SOURCE,
        actions: [
          { label: "Tải lên PDF", value: "slide_pdf" },
          { label: "Nhập chủ đề trực tiếp", value: "slide_topic" },
        ],
      },
    ];
  }
  if (kind === "quiz") {
    return [
      {
        type: "pushBot",
        text: MSG_START_SOURCE,
        actions: [
          { label: "Tải lên PDF", value: "quiz_pdf" },
          { label: "Nhập chủ đề trực tiếp", value: "quiz_topic" },
        ],
      },
    ];
  }
  if (kind === "flash") {
    return [
      {
        type: "pushBot",
        text: MSG_START_SOURCE,
        actions: [
          { label: "Tải lên PDF", value: "flash_pdf" },
          { label: "Nhập chủ đề trực tiếp", value: "flash_topic" },
        ],
      },
    ];
  }
  return [];
}

/**
 * Pure guided-flow transitions (no DOM). Controller applies returned `effects`.
 * @param {any} guided
 * @param {string} value
 */
export function computePickAction(guided, value) {
  if (!guided) {
    return { handled: false, guided, effects: [] };
  }

  if (guided.step !== "await_source") {
    return { handled: false, guided, effects: [] };
  }

  if (guided.kind === "fullset") {
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

  if (guided.kind === "slide") {
    if (value === "slide_pdf") {
      return {
        handled: true,
        guided: { kind: "slide", step: "await_pdf_file", data: {} },
        effects: [
          { type: "pushUser", text: "Tải lên PDF" },
          {
            type: "pushBot",
            text:
              "Trước tiên hãy chọn tệp PDF. Sau khi đã chọn tệp và nhấn Tiếp tục, Teachly sẽ hiển thị biểu mẫu để bạn điền thêm thông tin.",
            cardType: "pick_pdf_gate",
          },
        ],
      };
    }
    if (value === "slide_topic") {
      return {
        handled: true,
        guided: { kind: "slide", step: "await_topic_form", data: {} },
        effects: [
          { type: "pushUser", text: "Nhập chủ đề trực tiếp" },
          {
            type: "pushBot",
            text: "Tuyệt vời! Điền thông tin dưới đây để Teachly thiết kế slide bài giảng cho bạn:",
            cardType: "slide_form",
          },
        ],
      };
    }
    return { handled: false, guided, effects: [] };
  }

  if (guided.kind === "quiz") {
    if (value === "quiz_pdf") {
      return {
        handled: true,
        guided: { kind: "quiz", step: "await_pdf_file", data: {} },
        effects: [
          { type: "pushUser", text: "Tải lên PDF" },
          {
            type: "pushBot",
            text:
              "Trước tiên hãy chọn tệp PDF. Sau khi đã chọn tệp và nhấn Tiếp tục, Teachly sẽ hiển thị biểu mẫu để bạn điền thêm thông tin.",
            cardType: "pick_pdf_gate",
          },
        ],
      };
    }
    if (value === "quiz_topic") {
      return {
        handled: true,
        guided: { kind: "quiz", step: "await_topic_form", data: {} },
        effects: [
          { type: "pushUser", text: "Nhập chủ đề trực tiếp" },
          {
            type: "pushBot",
            text: "Tuyệt vời! Thiết lập thông số cho bộ câu hỏi của bạn tại đây:",
            cardType: "quiz_form",
          },
        ],
      };
    }
    return { handled: false, guided, effects: [] };
  }

  if (guided.kind === "flash") {
    if (value === "flash_pdf") {
      return {
        handled: true,
        guided: { kind: "flash", step: "await_pdf_file", data: {} },
        effects: [
          { type: "pushUser", text: "Tải lên PDF" },
          {
            type: "pushBot",
            text:
              "Trước tiên hãy chọn tệp PDF. Sau khi đã chọn tệp và nhấn Tiếp tục, Teachly sẽ hiển thị biểu mẫu để bạn điền thêm thông tin.",
            cardType: "pick_pdf_gate",
          },
        ],
      };
    }
    if (value === "flash_topic") {
      return {
        handled: true,
        guided: { kind: "flash", step: "await_topic_form", data: {} },
        effects: [
          { type: "pushUser", text: "Nhập chủ đề trực tiếp" },
          {
            type: "pushBot",
            text: "Tuyệt vời! Cung cấp thông tin để Teachly tạo bộ Flashcard cho bạn:",
            cardType: "flash_form",
          },
        ],
      };
    }
    return { handled: false, guided, effects: [] };
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
    if (payload.__auto === "1") {
      return {
        handled: true,
        guided: null,
        effects: [
          { type: "pushUser", text: "Bỏ qua tải PDF — nhờ Teachly tự động soạn nội dung" },
          {
            type: "pushBot",
            text:
              "Đã ghi nhận: bạn không tải PDF.\n\nTeachly sẽ tự động đề xuất nội dung khi pipeline AI sẵn sàng. Bạn có thể tiếp tục chat hoặc quay về trang chủ.",
          },
        ],
      };
    }
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
    const lines = [];
    if (payload.__auto === "1") lines.push("[Chế độ Teachly tự động]");
    lines.push(
      `[Full Set — chủ đề] ${payload.topic}`,
      `Trình độ: ${payload.level}`,
      `Số lượng — Slide: ${payload.slides}, Quiz: ${payload.quiz}, Flashcard: ${payload.flash}`,
    );
    if (payload.extra) lines.push(`Yêu cầu thêm: ${payload.extra}`);
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: lines.join("\n") },
        {
          type: "pushBot",
          text:
            payload.__auto === "1"
              ? "Bạn đã chọn để Teachly tự động soạn Full Set (giao diện demo). Khi backend sẵn sàng, hệ thống sẽ sinh nội dung phù hợp.\n\nBạn có thể tiếp tục chat hoặc quay về trang chủ."
              : "Teachly đã nhận đủ thông tin để chuẩn bị Full Set theo chủ đề của bạn (giao diện demo).\n\nViệc sinh nội dung thực tế sẽ được nối với backend/AI ở bước sau.",
        },
      ],
    };
  }

  if (
    (guided.kind === "slide" || guided.kind === "quiz" || guided.kind === "flash") &&
    guided.step === "await_pdf_file" &&
    cardType === "pick_pdf_gate"
  ) {
    if (payload.__no_file === "1") {
      const actions =
        guided.kind === "slide"
          ? [
              { label: "Tải lên PDF", value: "slide_pdf" },
              { label: "Nhập chủ đề trực tiếp", value: "slide_topic" },
            ]
          : guided.kind === "quiz"
            ? [
                { label: "Tải lên PDF", value: "quiz_pdf" },
                { label: "Nhập chủ đề trực tiếp", value: "quiz_topic" },
              ]
            : [
                { label: "Tải lên PDF", value: "flash_pdf" },
                { label: "Nhập chủ đề trực tiếp", value: "flash_topic" },
              ];
      return {
        handled: true,
        guided: { kind: guided.kind, step: "await_source", data: {} },
        effects: [
          { type: "pushUser", text: "Bỏ qua" },
          {
            type: "pushBot",
            text: MSG_START_SOURCE,
            actions,
          },
        ],
      };
    }
    const fn = payload.fileName || "";
    if (!fn) {
      return { handled: false, guided, effects: [] };
    }
    const baseData = guided.data && typeof guided.data === "object" ? guided.data : {};
    const data = { ...baseData, pdfFileName: fn };
    const nextGuided = { ...guided, step: "await_pdf_meta", data };
    const metaCard =
      guided.kind === "slide" ? "slide_pdf_meta" : guided.kind === "quiz" ? "quiz_pdf_meta" : "flash_pdf_meta";
    const intro =
      guided.kind === "slide"
        ? "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bài giảng từ tài liệu của bạn:"
        : guided.kind === "quiz"
          ? "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bộ đề từ tài liệu của bạn:"
          : "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bộ flashcard từ tài liệu của bạn:";
    return {
      handled: true,
      guided: nextGuided,
      effects: [
        { type: "pushUser", text: `Đã chọn tệp PDF: ${fn}` },
        { type: "pushBot", text: intro, cardType: metaCard },
      ],
    };
  }

  if (guided.kind === "slide" && guided.step === "await_pdf_meta" && cardType === "slide_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp PDF: ${pdfFn}` : "",
      "Nguồn: PDF",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic: payload.name || "—",
      count: payload.count || "—",
      notes: notes || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Slide — PDF] ${meta.topic} — ${meta.count} slide${meta.notes !== "—" ? ` — ${meta.notes}` : ""}`,
        },
        {
          type: "pushBot",
          text:
            payload.__auto === "1"
              ? "Bạn đã xác nhận để Teachly tự động thiết kế slide từ PDF (mock).\n\nBên dưới là xem trước bộ slide."
              : "Cảm ơn bạn! Thông tin PDF đã được ghi nhận.\n\nBên dưới là xem trước bộ slide (mock).",
        },
        { type: "showSlide", meta },
      ],
    };
  }

  if (guided.kind === "slide" && guided.step === "await_topic_form" && cardType === "slide_form") {
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
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
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Slide] ${meta.topic} — ${meta.count} slide${meta.notes !== "—" ? ` — ${meta.notes}` : ""}`,
        },
        {
          type: "pushBot",
          text:
            payload.__auto === "1"
              ? "Bạn đã xác nhận để Teachly tự động thiết kế slide (mock).\n\nBên dưới là xem trước bộ slide."
              : "Cảm ơn bạn! Thông tin đã được ghi nhận.\n\nBên dưới là xem trước bộ slide (mock).",
        },
        { type: "showSlide", meta },
      ],
    };
  }

  if (guided.kind === "quiz" && guided.step === "await_pdf_meta" && cardType === "quiz_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const topic = [payload.name, "Từ PDF"].filter(Boolean).join(" — ") || "—";
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp PDF: ${pdfFn}` : "",
    ]
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
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Quiz — PDF] ${payload.name || "—"} — ${meta.count} câu`,
        },
        {
          type: "pushBot",
          text:
            payload.__auto === "1"
              ? "Bạn đã xác nhận để Teachly tự động tạo bộ quiz từ PDF (mock).\n\nBên dưới là giao diện làm bài."
              : "Thiết lập PDF đã xong trên giao diện.\n\nBên dưới là giao diện làm bài (mock).",
        },
        { type: "showQuiz", meta },
      ],
    };
  }

  if (guided.kind === "quiz" && guided.step === "await_topic_form" && cardType === "quiz_form") {
    const topic = [payload.source, payload.kind].filter(Boolean).join(" — ") || "—";
    const notes = [payload.difficulty ? `Tỉ lệ độ khó: ${payload.difficulty}` : "", payload.notes ? `Ghi chú: ${payload.notes}` : ""]
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
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Quiz THPTQG] ${meta.topic} — ${meta.count} câu`,
        },
        {
          type: "pushBot",
          text:
            payload.__auto === "1"
              ? "Bạn đã xác nhận để Teachly tự động tạo bộ quiz (mock).\n\nBên dưới là giao diện làm bài."
              : "Thiết lập đã xong trên giao diện.\n\nBên dưới là giao diện làm bài (mock).",
        },
        { type: "showQuiz", meta },
      ],
    };
  }

  if (guided.kind === "flash" && guided.step === "await_pdf_meta" && cardType === "flash_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const extra = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp PDF: ${pdfFn}` : "",
      "Nguồn: PDF",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      source: payload.name || "—",
      count: payload.count || "—",
      extra: extra || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Flashcard — PDF] ${meta.source} — ${meta.count} thẻ` },
        {
          type: "pushBot",
          text:
            payload.__auto === "1"
              ? "Bạn đã xác nhận để Teachly tự động tạo flashcard từ PDF (mock).\n\nBên dưới là bộ thẻ — nhấn để lật."
              : "Cảm ơn bạn!\n\nBên dưới là bộ flashcard xem trước từ PDF (mock) — nhấn thẻ để lật.",
        },
        { type: "showFlash", meta },
      ],
    };
  }

  if (guided.kind === "flash" && guided.step === "await_topic_form" && cardType === "flash_form") {
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
        { type: "pushUser", text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Flashcard] ${src}` },
        {
          type: "pushBot",
          text:
            payload.__auto === "1"
              ? "Bạn đã xác nhận để Teachly tự động tạo flashcard (mock).\n\nBên dưới là bộ thẻ — nhấn để lật."
              : "Cảm ơn bạn!\n\nBên dưới là bộ flashcard xem trước (mock) — nhấn thẻ để lật.",
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
      text: MSG_START_SOURCE,
      actions: [
        { label: "Tải lên PDF", value: "fullset_pdf" },
        { label: "Nhập chủ đề trực tiếp", value: "fullset_topic" },
      ],
    });
    return { guided, effects };
  }

  if (flow === "slide") {
    guided = { kind: "slide", step: "await_source", data: {} };
    effects.push({
      type: "pushBot",
      text: MSG_START_SOURCE,
      actions: [
        { label: "Tải lên PDF", value: "slide_pdf" },
        { label: "Nhập chủ đề trực tiếp", value: "slide_topic" },
      ],
    });
    return { guided, effects };
  }

  if (flow === "quiz") {
    guided = { kind: "quiz", step: "await_source", data: {} };
    effects.push({
      type: "pushBot",
      text: MSG_START_SOURCE,
      actions: [
        { label: "Tải lên PDF", value: "quiz_pdf" },
        { label: "Nhập chủ đề trực tiếp", value: "quiz_topic" },
      ],
    });
    return { guided, effects };
  }

  if (flow === "flashcard") {
    guided = { kind: "flash", step: "await_source", data: {} };
    effects.push({
      type: "pushBot",
      text: MSG_START_SOURCE,
      actions: [
        { label: "Tải lên PDF", value: "flash_pdf" },
        { label: "Nhập chủ đề trực tiếp", value: "flash_topic" },
      ],
    });
    return { guided, effects };
  }

  return { guided: null, effects: [] };
}

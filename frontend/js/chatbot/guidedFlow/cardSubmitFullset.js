import { getSourceActions } from "./shared.js";

/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeFullsetCardSubmit(guided, cardType, payload) {
  if (guided.kind === "fullset" && guided.step === "await_pdf_confirm" && cardType === "fullset_pdf") {
    if (payload.__auto === "1") {
      return {
        handled: true,
        guided: null,
        effects: [
          { type: "pushUser", text: "Bỏ qua tải PDF — nhờ Teachly tự động soạn nội dung" },
          {
            type: "pushBot",
            text: "Teachly đã ghi nhận lựa chọn của bạn. Bạn muốn tiếp tục theo cách nào?",
            actions: getSourceActions("fullset"),
          },
        ],
      };
    }
    const name = payload.fileName || "—";
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `Đã chọn tệp: ${name}` },
        {
          type: "pushBot",
          text: "Teachly đã nhận tệp. Bạn muốn tiếp tục theo cách nào?",
          actions: getSourceActions("fullset"),
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
      `Mẫu slide: ${payload.slideTemplate || "—"}`,
      `Số lượng — Slide: ${payload.slides}, Quiz: ${payload.quiz}, Flashcard: ${payload.flash}`,
    );
    if (payload.extra) lines.push(`Yêu cầu thêm: ${payload.extra}`);

    const topic = payload.topic || "—";
    const openedAt = new Date().toISOString();
    const experienceId =
      globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const resumeDock = {
      title: `Full set — ${topic}`,
      experienceId,
      fullsetMixed: {
        topic,
        level: String(payload.level || "—"),
        slideTemplate: String(payload.slideTemplate || ""),
        slides: String(payload.slides || "0"),
        quiz: String(payload.quiz || "0"),
        flash: String(payload.flash || "0"),
        extra: String(payload.extra || ""),
        __experienceId: experienceId,
      },
      items: [
        {
          kind: "slide",
          meta: {
            topic,
            count: String(payload.slides || "—"),
            slideTemplate: String(payload.slideTemplate || ""),
            notes:
              payload.slideTemplate
                ? `Mẫu slide: ${payload.slideTemplate} | Full set (demo mock)`
                : "Full set (demo mock)",
            __experienceId: `${experienceId}:slide`,
          },
          experienceId: `${experienceId}:slide`,
          title: `Slide — ${topic}`,
          openedAt,
        },
        {
          kind: "quiz",
          meta: {
            topic,
            count: String(payload.quiz || "—"),
            notes: "Full set (demo mock)",
            __experienceId: `${experienceId}:quiz`,
          },
          experienceId: `${experienceId}:quiz`,
          title: `Trắc nghiệm — ${topic}`,
          openedAt,
        },
        {
          kind: "flash",
          meta: {
            source: topic,
            count: String(payload.flash || "—"),
            extra: "Full set (demo mock)",
            __experienceId: `${experienceId}:flash`,
          },
          experienceId: `${experienceId}:flash`,
          title: `Flashcard — ${topic}`,
          openedAt,
        },
      ],
    };
    const baseBot =
      payload.__auto === "1"
        ? "Teachly đã chuẩn bị Full Set tự động. Bạn muốn tiếp tục theo cách nào?"
        : "Teachly đã nhận thông tin Full Set. Bạn muốn tiếp tục theo cách nào?";
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: lines.join("\n") },
        {
          type: "pushBot",
          text: baseBot,
          actions: getSourceActions("fullset"),
          resumeDock,
        },
      ],
    };
  }

  return null;
}


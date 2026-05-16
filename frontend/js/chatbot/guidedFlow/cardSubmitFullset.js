import { getSourceActions } from "./shared.js";
import { buildExperienceTitle } from "../services/contentTitles.js";

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
          { type: "pushUser", text: "Bỏ qua tải file — nhờ Teachly tự động soạn nội dung" },
          {
            type: "pushBot",
            text: "Teachly đã ghi nhận lựa chọn của bạn. Bạn muốn tiếp tục theo cách nào?",
            actions: [
              { label: "Tải lên file", value: "fullset_pdf" },
              { label: "Nhập chủ đề trực tiếp", value: "fullset_topic" },
            ],
          },
        ],
      };
    }
    const name = payload.fileName || "—";
    const experienceId =
      globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const spec = {
      topic: name,
      level: "—",
      slides: "10",
      quiz: "10",
      flash: "20",
      slideTemplate: "",
      extra: "",
      __pdfPending: "1",
      __experienceId: experienceId,
    };
    return {
      handled: true,
        guided: null,
        effects: [
          { type: "pushUser", text: `Đã chọn tệp: ${name}`, experienceId },
          {
            type: "pushBot",
            text: "Teachly đã nhận tệp. Nhấn nút bên dưới để bắt đầu tạo Full Set từ tài liệu của bạn.",
            resumeDock: {
            title: buildExperienceTitle("fullset", name),
            experienceId,
            fullsetMixed: spec,
            items: [],
          },
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
    const sharedExtra = String(payload.extra || "");
    const slideNotes = [
      payload.slideTemplate ? `Mẫu slide: ${payload.slideTemplate}` : "",
      sharedExtra ? `Yêu cầu thêm: ${sharedExtra}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const quizNotes = [
      payload.level ? `Trình độ: ${payload.level}` : "",
      sharedExtra ? `Ghi chú: ${sharedExtra}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const openedAt = new Date().toISOString();
    const experienceId =
      globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const resumeDock = {
      title: buildExperienceTitle("fullset", topic),
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
        ...(payload.__forceAi === "1" ? { __forceAi: "1" } : {}),
        ...(payload.__forceMock === "1" ? { __forceMock: "1" } : {}),
      },
      items: [
        {
          kind: "slide",
          meta: {
            topic,
            count: String(payload.slides || "—"),
            slideTemplate: String(payload.slideTemplate || ""),
            notes: slideNotes || "—",
            __experienceId: `${experienceId}:slide`,
            ...(payload.__forceAi === "1" ? { __forceAi: "1" } : {}),
            ...(payload.__forceMock === "1" ? { __forceMock: "1" } : {}),
          },
          experienceId: `${experienceId}:slide`,
          title: buildExperienceTitle("slide", topic),
          openedAt,
        },
        {
          kind: "quiz",
          meta: {
            topic,
            source: topic,
            count: String(payload.quiz || "—"),
            notes: quizNotes || "—",
            difficulty: String(payload.level || ""),
            __experienceId: `${experienceId}:quiz`,
            ...(payload.__forceAi === "1" ? { __forceAi: "1" } : {}),
            ...(payload.__forceMock === "1" ? { __forceMock: "1" } : {}),
          },
          experienceId: `${experienceId}:quiz`,
          title: buildExperienceTitle("quiz", topic),
          openedAt,
        },
        {
          kind: "flash",
          meta: {
            source: topic,
            count: String(payload.flash || "—"),
            notes: sharedExtra,
            extra: sharedExtra || "—",
            __experienceId: `${experienceId}:flash`,
            ...(payload.__forceAi === "1" ? { __forceAi: "1" } : {}),
            ...(payload.__forceMock === "1" ? { __forceMock: "1" } : {}),
          },
          experienceId: `${experienceId}:flash`,
          title: buildExperienceTitle("flash", topic),
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


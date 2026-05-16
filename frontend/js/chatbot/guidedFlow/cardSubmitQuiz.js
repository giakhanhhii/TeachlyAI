import { generateFlowExperienceId } from "./shared.js";

/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeQuizCardSubmit(guided, cardType, payload) {
  if (guided.kind === "quiz" && guided.step === "await_pdf_meta" && cardType === "quiz_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const experienceId =
      typeof guided.data?.uploadAttemptId === "string" && guided.data.uploadAttemptId.trim()
        ? guided.data.uploadAttemptId.trim()
        : generateFlowExperienceId();
    const topic = [payload.name, "Từ file"].filter(Boolean).join(" — ") || "—";
    const notes = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp: ${pdfFn}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic,
      count: payload.count || "—",
      notes: notes || "—",
      ...(payload.presetId ? { presetId: payload.presetId } : {}),
      __experienceId: experienceId,
      ...(guided.data?.pdfFile instanceof File ? { __pdfFile: guided.data.pdfFile } : {}),
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Quiz — file] ${payload.name || "—"} — ${meta.count} câu`,
          experienceId,
        },
        { type: "showQuiz", meta },
      ],
    };
  }

  if (guided.kind === "quiz" && guided.step === "await_topic_form" && cardType === "quiz_form") {
    const topic = payload.source || "—";
    const notes = [payload.difficulty ? `Trình độ: ${payload.difficulty}` : "", payload.notes ? `Ghi chú: ${payload.notes}` : ""]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      topic,
      count: payload.count || "—",
      notes: notes || "—",
      ...(payload.source ? { source: payload.source } : {}),
      ...(payload.difficulty ? { difficulty: payload.difficulty } : {}),
      ...(payload.presetId ? { presetId: payload.presetId } : {}),
      ...(payload.__forceAi === "1" ? { __forceAi: "1" } : {}),
      ...(payload.__forceMock === "1" ? { __forceMock: "1" } : {}),
    };
    return {
      handled: true,
      guided: null,
      effects: [
        {
          type: "pushUser",
          text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Quiz THPTQG] ${meta.topic} — ${meta.count} câu`,
        },
        { type: "showQuiz", meta },
      ],
    };
  }

  return null;
}


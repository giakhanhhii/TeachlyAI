import { parseDirectFlashVocabLines } from "./flashVocabParse.js";
import { filterFlashCardsWithinLimit } from "../services/flashCardLimits.js";

/**
 * @param {any} guided
 * @param {string} cardType
 * @param {Record<string, string>} payload
 */
export function computeFlashCardSubmit(guided, cardType, payload) {
  if (guided.kind === "flash" && guided.step === "await_pdf_meta" && cardType === "flash_pdf_meta") {
    const pdfFn = guided.data && guided.data.pdfFileName ? String(guided.data.pdfFileName) : "";
    const extra = [
      payload.structure ? `Cấu trúc: ${payload.structure}` : "",
      payload.style ? `Phong cách: ${payload.style}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
      pdfFn ? `Tệp: ${pdfFn}` : "",
      "Nguồn: file",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      source: payload.name || "—",
      count: payload.count || "—",
      extra: extra || "—",
      ...(guided.data?.pdfFile instanceof File ? { __pdfFile: guided.data.pdfFile } : {}),
    };
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Flashcard — file] ${meta.source} — ${meta.count} thẻ` },
        { type: "showFlash", meta },
      ],
    };
  }

  if (guided.kind === "flash" && guided.step === "await_topic_form" && cardType === "flash_form") {
    const src = payload.list || "(Teachly gợi ý theo ghi chú)";
    const extra = [
      payload.back ? `Mặt sau: ${payload.back}` : "",
      payload.aiImage ? `Hình AI: ${payload.aiImage}` : "",
      payload.notes ? `Ghi chú: ${payload.notes}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const meta = {
      source: src,
      count: String(payload.count || "20").trim() || "20",
      basis: payload.back || "",
      notes: payload.notes || "",
      presetId: payload.presetId || "",
      extra: extra || "—",
    };
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `${payload.__auto === "1" ? "[Teachly tự động] " : ""}[Flashcard] ${src}` },
        { type: "showFlash", meta },
      ],
    };
  }

  if (guided.kind === "flash" && guided.step === "await_vocab_form" && cardType === "flash_vocab_form") {
    const raw = String(payload.vocabText || "").trim();
    /** @type {Record<string, string>} */
    let apiBack = {};
    try {
      const j = payload.__apiBackJson ? String(payload.__apiBackJson) : "";
      if (j) {
        const o = JSON.parse(j);
        if (o && typeof o === "object") apiBack = /** @type {Record<string, string>} */ (o);
      }
    } catch {
      apiBack = {};
    }
    const autoT = payload.__autoTranslateEnLines;
    const autoTranslateEnLines = autoT !== "0" && autoT !== "false";
    const { cards } = parseDirectFlashVocabLines(raw, apiBack, { autoTranslateEnLines });
    const safeCards = filterFlashCardsWithinLimit(cards);
    if (!safeCards.length) {
      return { handled: false, guided, effects: [] };
    }
    const countStr = String(safeCards.length);
    const meta = {
      source: "Nhập từ vựng trực tiếp",
      count: countStr,
      extra: `${countStr} thẻ từ nhập tay`,
      __directCardsJson: JSON.stringify(safeCards),
    };
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: `[Flashcard — từ vựng] ${countStr} thẻ` },
        { type: "showFlash", meta },
      ],
    };
  }

  return null;
}

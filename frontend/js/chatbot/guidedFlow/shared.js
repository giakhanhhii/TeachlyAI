export const MSG_START_SOURCE =
  "Chào bạn! Để bắt đầu, bạn đã có tài liệu (PDF/DOCX/MD/TXT) sẵn chưa hay muốn tôi tự biên soạn theo chủ đề?";
export const MSG_CONTINUE_SOURCE = "Bạn muốn tiếp tục theo cách nào?";
export const CONTINUE_SOURCE_PROMPT_KEY = "continue_source_prompt";

/** Các nút “Tải lên PDF” ở bước chọn nguồn — cần chọn file trước khi vào form. */
export const PDF_SOURCE_ACTION_VALUES = new Set(["fullset_pdf", "slide_pdf", "quiz_pdf", "flash_pdf"]);

/** @type {Record<"fullset"|"slide"|"quiz"|"flash"|"thptqg_fulltest", { label: string, value: string }[]>} */
const SOURCE_ACTIONS_BY_KIND = {
  fullset: [
    { label: "Tải lên PDF", value: "fullset_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "fullset_topic" },
  ],
  slide: [
    { label: "Tải lên PDF", value: "slide_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "slide_topic" },
  ],
  quiz: [
    { label: "Tải lên PDF", value: "quiz_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "quiz_topic" },
    { label: "Làm full đề THPTQG", value: "quiz_fulltest" },
  ],
  flash: [
    { label: "Tải lên PDF", value: "flash_pdf" },
    { label: "Nhập từ vựng trực tiếp", value: "flash_vocab" },
    { label: "Nhập chủ đề trực tiếp", value: "flash_topic" },
  ],
  thptqg_fulltest: [
    { label: "Tải lên PDF", value: "quiz_pdf" },
    { label: "Nhập chủ đề trực tiếp", value: "quiz_topic" },
    { label: "Làm full đề THPTQG", value: "quiz_fulltest" },
  ],
};

/**
 * @param {"fullset"|"slide"|"quiz"|"flash"|"thptqg_fulltest"} kind
 * @returns {{ label: string, value: string }[]}
 */
export function getSourceActions(kind) {
  return SOURCE_ACTIONS_BY_KIND[kind] ? [...SOURCE_ACTIONS_BY_KIND[kind]] : [];
}

/**
 * @param {"fullset"|"slide"|"quiz"|"flash"|"thptqg_fulltest"} kind
 * @param {string} [text]
 */
export function createSourceChoiceEffect(kind, text = MSG_CONTINUE_SOURCE) {
  const actions = getSourceActions(kind);
  if (!actions.length) return null;
  return { type: "pushBot", text, actions, messageKey: CONTINUE_SOURCE_PROMPT_KEY };
}

/**
 * @param {any} message
 */
export function isContinueSourcePromptMessage(message) {
  if (!message || typeof message !== "object") return false;
  if (message.messageKey === CONTINUE_SOURCE_PROMPT_KEY) return true;
  return String(message.text || "") === MSG_CONTINUE_SOURCE && Array.isArray(message.actions) && message.actions.length > 0;
}

/** Tin nhắn bot trước form meta PDF (slide / quiz / flash). */
export function pdfMetaFormIntro(/** @type {"slide"|"quiz"|"flash"} */ kind) {
  if (kind === "slide") {
    return "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bài giảng từ tài liệu của bạn:";
  }
  if (kind === "quiz") {
    return "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bộ đề từ tài liệu của bạn:";
  }
  return "Bạn đã chọn tệp PDF. Hoàn thiện tên, số lượng, cấu trúc, phong cách và ghi chú để Teachly chuẩn bị bộ flashcard từ tài liệu của bạn:";
}

/**
 * Lặp lại câu hỏi mở đầu + 2 nút khi người dùng hủy chọn PDF.
 * @param {"fullset"|"slide"|"quiz"|"flash"|"thptqg_fulltest"} kind
 * @returns {{ type: "pushBot", text: string, actions: { label: string, value: string }[] }[]}
 */
export function getRestartAwaitSourceEffects(kind) {
  const effect = createSourceChoiceEffect(kind);
  return effect ? [effect] : [];
}


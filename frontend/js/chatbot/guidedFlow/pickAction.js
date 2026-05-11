import { pdfMetaFormIntro } from "./shared.js";

/**
 * @param {any} guided
 * @param {string} value
 * @param {{ pdfFile?: File | null }} [opts]
 */
export function computePickAction(guided, value, opts = {}) {
  const pdfFile = opts.pdfFile instanceof File ? opts.pdfFile : null;
  if (!guided || guided.step !== "await_source") {
    return { handled: false, guided, effects: [] };
  }

  if (guided.kind === "fullset") {
    return handleFullsetPick(guided, value);
  }
  if (guided.kind === "slide" || guided.kind === "quiz" || guided.kind === "flash") {
    return handleSingleModePick(guided, value, pdfFile);
  }
  return { handled: false, guided, effects: [] };
}

function handleFullsetPick(guided, value) {
  if (value === "fullset_pdf") {
    return {
      handled: true,
      guided: { kind: "fullset", step: "await_pdf_confirm", data: {} },
      effects: [
        { type: "pushUser", text: "Tải lên file" },
        {
          type: "pushBot",
          text:
            "Bạn đã chọn tải lên tệp tài liệu.\n\nTeachly sẽ chuyển nội dung sang Markdown và dùng AI để tạo Full Set từ tài liệu của bạn. Hỗ trợ: PDF, DOCX, Markdown (.md), TXT — tối đa 20 trang.",
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
          text: "Tuyệt vời! Bạn hãy hoàn thiện nhanh các thông tin dưới đây để Teachly bắt đầu soạn Full Set nhé:",
          cardType: "fullset_topic",
        },
      ],
    };
  }
  return { handled: false, guided, effects: [] };
}

/**
 * @param {any} guided
 * @param {string} value
 * @param {File | null} pdfFile
 */
function handleSingleModePick(guided, value, pdfFile) {
  const kind = guided.kind;
  const sourceValue = `${kind}_pdf`;
  const topicValue = `${kind}_topic`;
  const metaCardType = `${kind}_pdf_meta`;
  const topicCardType = kind === "slide" ? "slide_form" : kind === "quiz" ? "quiz_form" : "flash_form";

  if (value === sourceValue) {
    if (pdfFile) {
      const fileName = pdfFile.name;
      return {
        handled: true,
        guided: { kind, step: "await_pdf_meta", data: { pdfFileName: fileName } },
        effects: [
          { type: "pushUser", text: `Tải lên PDF — ${fileName}` },
          { type: "pushBot", text: pdfMetaFormIntro(kind), cardType: metaCardType },
        ],
      };
    }
    return {
      handled: true,
      guided: { kind, step: "await_pdf_file", data: {} },
      effects: [
        { type: "pushUser", text: "Tải lên PDF" },
        { type: "pushBot", text: "", cardType: "pick_pdf_gate" },
      ],
    };
  }

  if (value === topicValue) {
    return {
      handled: true,
      guided: { kind, step: "await_topic_form", data: {} },
      effects: [
        { type: "pushUser", text: "Nhập chủ đề trực tiếp" },
        { type: "pushBot", text: topicIntro(kind), cardType: topicCardType },
      ],
    };
  }

  if (kind === "quiz" && value === "quiz_fulltest") {
    return {
      handled: true,
      guided: null,
      effects: [
        { type: "pushUser", text: "Làm full đề THPTQG" },
        {
          type: "showThptqgFullTest",
          meta: {
            catalogTitle: "THPTQG simulation tests",
            source: "mockdata_40.md",
            notes: "Mỗi part gồm 10 câu trong bản v1.",
          },
        },
      ],
    };
  }

  if (kind === "flash" && value === "flash_vocab") {
    return {
      handled: true,
      guided: { kind: "flash", step: "await_vocab_form", data: {} },
      effects: [
        { type: "pushUser", text: "Nhập từ vựng trực tiếp" },
        {
          type: "pushBot",
          text: "",
          cardType: "flash_vocab_form",
        },
      ],
    };
  }

  return { handled: false, guided, effects: [] };
}

/** @param {"slide"|"quiz"|"flash"} kind */
function topicIntro(kind) {
  if (kind === "slide") return "Tuyệt vời! Điền thông tin dưới đây để Teachly thiết kế slide bài giảng cho bạn:";
  if (kind === "quiz") return "Tuyệt vời! Thiết lập thông số cho bộ câu hỏi của bạn tại đây:";
  return "Tuyệt vời! Cung cấp thông tin để Teachly tạo bộ Flashcard cho bạn:";
}


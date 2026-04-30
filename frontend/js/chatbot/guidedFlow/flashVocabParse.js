import { lookupEnToVi } from "./flashVocabLookup.js";
import { MAX_FLASH_CARD_SIDE_CHARS, isFlashCardSideWithinLimit } from "../services/flashCardLimits.js";

const EN_VOCAB_TOKEN_RE = /^(?=.*[A-Za-z])[A-Za-z0-9'()/-]+$/;

/** Nội dung placeholder (chữ mờ) trong ô nhập từ vựng — không dùng tin nhắn bot riêng. */
export const FLASH_VOCAB_TEXTAREA_PLACEHOLDER =
  "Điền theo dạng (mỗi dòng 1 thẻ)\nTừ : nghĩa\nVí dụ: \nPreserve: bảo tồn\nAbandon: tư bỏ, bỏ rơi\n\nChỉ cần gõ obstacle (không cần dấu :) — hệ thống tự thêm nghĩa (từ điển hoặc dịch tự động).";

/**
 * @param {string} trimmed
 * @returns {boolean}
 */
export function isEnglishOnlyVocabLine(trimmed) {
  const t = String(trimmed || "").trim();
  if (!t || t.startsWith("#")) return false;
  if (t.includes(":")) return false;
  const parts = t.split(/\s+/).filter(Boolean);
  if (!parts.length) return false;
  return parts.every((w) => EN_VOCAB_TOKEN_RE.test(w));
}

/**
 * @param {Record<string, string>} apiBackByLine
 * @param {string} key
 */
function apiBackFor(apiBackByLine, key) {
  const k = String(key || "").trim();
  if (!k) return "";
  const raw = apiBackByLine && typeof apiBackByLine === "object" ? apiBackByLine[k] : "";
  return String(raw || "").trim();
}

/**
 * Từ đầu tiên (trước dấu :) phải là từ tiếng Anh dạng Latin ASCII (tránh nhầm tiêu đề bài như "Buổi 19: ...").
 * @param {string} front
 */
export function firstTokenIsEnglishAscii(front) {
  const token = String(front)
    .trim()
    .split(/\s+/)[0] || "";
  if (!token) return false;
  return EN_VOCAB_TOKEN_RE.test(token);
}

/**
 * @typedef {"empty"|"comment"|"incomplete"|"invalid"|"too_long"|"skipped_en"|"bare_en_auto_off"|"auto_en"|"pending_api"|"ok"} FlashVocabLineKind
 */

/**
 * @param {string} trimmed
 * @param {Record<string, string>} [apiBackByLine] nghĩa từ API dịch, khóa = nguyên dòng trim
 * @param {{ autoTranslateEnLines?: boolean }} [opts] tắt thì dòng EN không dấu : không dùng từ điển/API, bỏ qua khi tạo thẻ
 * @returns {FlashVocabLineKind}
 */
export function classifyFlashVocabLine(trimmed, apiBackByLine = {}, opts = {}) {
  const autoEn = opts.autoTranslateEnLines !== false;
  if (!trimmed) return "empty";
  if (trimmed.startsWith("#")) return "comment";
  const idx = trimmed.indexOf(":");
  if (idx < 0) {
    if (!isFlashCardSideWithinLimit(trimmed)) return "too_long";
    const englishBare = isEnglishOnlyVocabLine(trimmed);
    if (!autoEn && englishBare) return "bare_en_auto_off";
    if (lookupEnToVi(trimmed)) return "auto_en";
    if (apiBackFor(apiBackByLine, trimmed)) return "auto_en";
    if (englishBare) return "pending_api";
    return "incomplete";
  }
  if (idx === 0) return "invalid";
  const front = trimmed.slice(0, idx).trim();
  const back = trimmed.slice(idx + 1).trim();
  if (!front || !back) return "invalid";
  if (!isFlashCardSideWithinLimit(front) || !isFlashCardSideWithinLimit(back)) return "too_long";
  if (!firstTokenIsEnglishAscii(front)) return "skipped_en";
  return "ok";
}

/**
 * Tách bạch màu trong ô nhập và trạng thái thẻ: đỏ = sai form / không tạo thẻ; vàng = đã có nghĩa; vàng nhạt = đang chờ dịch.
 * @param {string} trimmed
 * @param {Record<string, string>} [apiBackByLine]
 * @param {{ autoTranslateEnLines?: boolean }} [opts]
 * @returns {"reject"|"auto"|"pending"|"neutral"}
 */
export function getFlashVocabEditorLineHighlight(trimmed, apiBackByLine = {}, opts = {}) {
  const kind = classifyFlashVocabLine(trimmed, apiBackByLine, opts);
  if (kind === "invalid" || kind === "too_long" || kind === "skipped_en" || kind === "incomplete" || kind === "bare_en_auto_off")
    return "reject";
  if (kind === "auto_en") return "auto";
  if (kind === "pending_api") return "pending";
  return "neutral";
}

/**
 * @param {string} raw
 * @param {Record<string, string>} [apiBackByLine]
 * @param {{ autoTranslateEnLines?: boolean }} [opts]
 * @returns {{ cards: { front: string, back: string }[], invalidLines: string[], overLimitLines: string[], skippedNonEnglish: number, pendingApiCount: number, skippedBareEnglishNoAuto: number }}
 */
export function parseDirectFlashVocabLines(raw, apiBackByLine = {}, opts = {}) {
  const text = String(raw ?? "");
  const lines = text.split(/\r?\n/);
  /** @type {{ front: string, back: string }[]} */
  const cards = [];
  /** @type {string[]} */
  const invalidLines = [];
  /** @type {string[]} */
  const overLimitLines = [];
  let skippedNonEnglish = 0;
  let pendingApiCount = 0;
  let skippedBareEnglishNoAuto = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const kind = classifyFlashVocabLine(trimmed, apiBackByLine, opts);
    if (kind === "empty" || kind === "comment") continue;
    if (kind === "bare_en_auto_off") {
      skippedBareEnglishNoAuto += 1;
      continue;
    }
    if (kind === "ok") {
      const idx = trimmed.indexOf(":");
      const front = trimmed.slice(0, idx).trim();
      const back = trimmed.slice(idx + 1).trim();
      cards.push({ front, back });
      continue;
    }
    if (kind === "auto_en") {
      const back = lookupEnToVi(trimmed) || apiBackFor(apiBackByLine, trimmed);
      if (back) {
        if (!isFlashCardSideWithinLimit(back)) {
          overLimitLines.push(trimmed);
        } else {
          cards.push({ front: trimmed, back });
        }
      } else {
        invalidLines.push(trimmed);
      }
      continue;
    }
    if (kind === "pending_api") {
      const back = apiBackFor(apiBackByLine, trimmed);
      if (back) {
        if (!isFlashCardSideWithinLimit(back)) {
          overLimitLines.push(trimmed);
        } else {
          cards.push({ front: trimmed, back });
        }
      } else {
        pendingApiCount += 1;
      }
      continue;
    }
    if (kind === "too_long") {
      overLimitLines.push(trimmed);
      continue;
    }
    if (kind === "skipped_en") {
      skippedNonEnglish += 1;
      continue;
    }
    invalidLines.push(trimmed);
  }
  return { cards, invalidLines, overLimitLines, skippedNonEnglish, pendingApiCount, skippedBareEnglishNoAuto };
}

import { lookupEnToVi } from "./flashVocabLookup.js";

/** Nội dung placeholder (chữ mờ) trong ô nhập từ vựng — không dùng tin nhắn bot riêng. */
export const FLASH_VOCAB_TEXTAREA_PLACEHOLDER =
  "Điền theo dạng\nTừ : nghĩa\nVí dụ: \nPreserve: bảo tồn\nAbandon: tư bỏ, bỏ rơi\n\nChỉ cần gõ obstacle (không cần dấu :) — hệ thống tự thêm nghĩa (từ điển hoặc dịch tự động).";

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
  return parts.every((w) => /^[A-Za-z][A-Za-z0-9'-]*$/.test(w));
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
  return /^[A-Za-z][A-Za-z0-9'-]*$/.test(token);
}

/**
 * @typedef {"empty"|"comment"|"incomplete"|"invalid"|"skipped_en"|"auto_en"|"pending_api"|"ok"} FlashVocabLineKind
 */

/**
 * @param {string} trimmed
 * @param {Record<string, string>} [apiBackByLine] nghĩa từ API dịch, khóa = nguyên dòng trim
 * @returns {FlashVocabLineKind}
 */
export function classifyFlashVocabLine(trimmed, apiBackByLine = {}) {
  if (!trimmed) return "empty";
  if (trimmed.startsWith("#")) return "comment";
  const idx = trimmed.indexOf(":");
  if (idx < 0) {
    if (lookupEnToVi(trimmed)) return "auto_en";
    if (apiBackFor(apiBackByLine, trimmed)) return "auto_en";
    if (isEnglishOnlyVocabLine(trimmed)) return "pending_api";
    return "incomplete";
  }
  if (idx === 0) return "invalid";
  const front = trimmed.slice(0, idx).trim();
  const back = trimmed.slice(idx + 1).trim();
  if (!front || !back) return "invalid";
  if (!firstTokenIsEnglishAscii(front)) return "skipped_en";
  return "ok";
}

/**
 * Tách bạch màu trong ô nhập và trạng thái thẻ: đỏ = sai form / không tạo thẻ; vàng = đã có nghĩa; vàng nhạt = đang chờ dịch.
 * @param {string} trimmed
 * @param {Record<string, string>} [apiBackByLine]
 * @returns {"reject"|"auto"|"pending"|"neutral"}
 */
export function getFlashVocabEditorLineHighlight(trimmed, apiBackByLine = {}) {
  const kind = classifyFlashVocabLine(trimmed, apiBackByLine);
  if (kind === "invalid" || kind === "skipped_en" || kind === "incomplete") return "reject";
  if (kind === "auto_en") return "auto";
  if (kind === "pending_api") return "pending";
  return "neutral";
}

/**
 * @param {string} raw
 * @param {Record<string, string>} [apiBackByLine]
 * @returns {{ cards: { front: string, back: string }[], invalidLines: string[], skippedNonEnglish: number, pendingApiCount: number }}
 */
export function parseDirectFlashVocabLines(raw, apiBackByLine = {}) {
  const text = String(raw ?? "");
  const lines = text.split(/\r?\n/);
  /** @type {{ front: string, back: string }[]} */
  const cards = [];
  /** @type {string[]} */
  const invalidLines = [];
  let skippedNonEnglish = 0;
  let pendingApiCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    const kind = classifyFlashVocabLine(trimmed, apiBackByLine);
    if (kind === "empty" || kind === "comment") continue;
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
        cards.push({ front: trimmed, back });
      } else {
        invalidLines.push(trimmed);
      }
      continue;
    }
    if (kind === "pending_api") {
      const back = apiBackFor(apiBackByLine, trimmed);
      if (back) {
        cards.push({ front: trimmed, back });
      } else {
        pendingApiCount += 1;
      }
      continue;
    }
    if (kind === "skipped_en") {
      skippedNonEnglish += 1;
      continue;
    }
    invalidLines.push(trimmed);
  }
  return { cards, invalidLines, skippedNonEnglish, pendingApiCount };
}

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
 * Mỗi dòng: `mặt_trước: mặt_sau` — chỉ tách tại dấu hai chấm đầu tiên.
 * Dòng có mặt trước không bắt đầu bằng từ tiếng Anh (ASCII) thì bỏ qua, không tạo thẻ.
 * @param {string} raw
 * @returns {{ cards: { front: string, back: string }[], invalidLines: string[], skippedNonEnglish: number }}
 */
export function parseDirectFlashVocabLines(raw) {
  const text = String(raw ?? "");
  const lines = text.split(/\r?\n/);
  /** @type {{ front: string, back: string }[]} */
  const cards = [];
  /** @type {string[]} */
  const invalidLines = [];
  let skippedNonEnglish = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) {
      invalidLines.push(trimmed);
      continue;
    }
    const front = trimmed.slice(0, idx).trim();
    const back = trimmed.slice(idx + 1).trim();
    if (!front || !back) {
      invalidLines.push(trimmed);
      continue;
    }
    if (!firstTokenIsEnglishAscii(front)) {
      skippedNonEnglish += 1;
      continue;
    }
    cards.push({ front, back });
  }
  return { cards, invalidLines, skippedNonEnglish };
}

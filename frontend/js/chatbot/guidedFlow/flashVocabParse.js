/**
 * Mỗi dòng: `mặt_trước: mặt_sau` — chỉ tách tại dấu hai chấm đầu tiên.
 * @param {string} raw
 * @returns {{ cards: { front: string, back: string }[], invalidLines: string[] }}
 */
export function parseDirectFlashVocabLines(raw) {
  const text = String(raw ?? "");
  const lines = text.split(/\r?\n/);
  /** @type {{ front: string, back: string }[]} */
  const cards = [];
  /** @type {string[]} */
  const invalidLines = [];
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
    cards.push({ front, back });
  }
  return { cards, invalidLines };
}

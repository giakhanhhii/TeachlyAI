import { getFlashVocabEditorLineHighlight } from "../../guidedFlow/flashVocabParse.js";

/**
 * Lớp highlight khớp textarea (pre-wrap + span theo dòng).
 * @param {HTMLElement} inner
 * @param {string} raw
 * @param {Record<string, string>} apiBackByLine
 * @param {{ autoTranslateEnLines?: boolean }} [opts]
 */
export function renderFlashVocabHighlightLines(inner, raw, apiBackByLine, opts = {}) {
  inner.replaceChildren();
  const lines = String(raw).split(/\r?\n/);
  if (lines.length === 0) return;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const tier = getFlashVocabEditorLineHighlight(line.trim(), apiBackByLine, opts);
    const span = document.createElement("span");
    if (tier === "reject") {
      span.className = "flow-vocab-seg--rejected";
    } else if (tier === "auto") {
      span.className = "flow-vocab-seg--auto";
    } else if (tier === "pending") {
      span.className = "flow-vocab-seg--auto-pending";
    }
    const nl = i < lines.length - 1 ? "\n" : "";
    span.textContent = (line.length ? line : "\u00a0") + nl;
    inner.appendChild(span);
  }
}

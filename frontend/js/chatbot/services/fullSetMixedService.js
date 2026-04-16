/** @param {string} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function capitalizeFirst(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toLocaleUpperCase("vi") + t.slice(1);
}

export function insertInlineMcLineBreaks(s) {
  if (!s) return s;
  let t = s.replace(/([:;?])\s+A\.\s/g, "$1\nA. ");
  t = t.replace(/\s+(?=[B-F]\.\s)/g, "\n");
  return t;
}

export function quizStemToSafeHtml(s) {
  const withBreaks = insertInlineMcLineBreaks(s);
  const esc = escapeHtml(withBreaks);
  const withBold = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

/** @param {any} q */
export function quizOptionList(q) {
  return Array.isArray(q?.options) ? q.options : [];
}

/** Chỉ số đáp án đúng (0..n-1), luôn hợp lệ với số lượng phương án. */
export function quizCorrectOptionIndex(q) {
  const opts = quizOptionList(q);
  if (opts.length === 0) return -1;
  const c = Number(q?.correctIndex);
  if (!Number.isFinite(c)) return 0;
  return Math.min(Math.max(0, Math.floor(c)), opts.length - 1);
}

/**
 * @param {Record<string, string>} meta
 * @param {number} qIndex
 * @param {any} question
 */
export function buildAiDraftQuiz(meta, qIndex, question) {
  const topic = meta.topic || "—";
  const count = meta.count || "—";
  const notes = meta.notes || "—";
  const opts = (question.options || []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n");
  return (
    `[Sửa đề quiz — nhờ AI]\n` +
    `Ngữ cảnh — Full set trộn | Chủ đề: ${topic}; Số câu quiz trong bộ: ${count}; Ghi chú: ${notes}\n` +
    `Câu hiện tại (mục ${qIndex + 1} trong phiên): ${question.text}\n` +
    `${opts}\n\n` +
    `Hãy đề xuất phiên bản câu hỏi và phương án tốt hơn (giữ định dạng trắc nghiệm 4 lựa chọn), kèm đáp án đúng và gợi ý ngắn.`
  );
}


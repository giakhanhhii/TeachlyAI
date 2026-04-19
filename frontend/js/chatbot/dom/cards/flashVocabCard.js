import { parseDirectFlashVocabLines } from "../../guidedFlow/flashVocabParse.js";
import { el, flowTextarea, wrapField } from "./flowCardShared.js";

const MAX_PAIRS = 40;

/**
 * @param {{ onSubmit: (p: Record<string, string>) => void }} deps
 */
export function createFlashVocabFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Nhập từ vựng trực tiếp"));

  const ta = flowTextarea("preserve: bảo tồn, giữ gìn\nabandon: từ bỏ, bỏ rơi", 10);
  root.appendChild(
    wrapField(
      "Danh sách (mỗi dòng một thẻ)",
      ta,
      "Định dạng: từ hoặc cụm mặt trước, dấu hai chấm, rồi nghĩa / mặt sau. Ví dụ: preserve: bảo tồn, giữ gìn — phần trước dấu : là mặt trước thẻ, phần sau là mặt sau. Tối đa 40 thẻ.",
    ),
  );

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const submit = el("button", "flow-primary-btn", "Tạo flashcard");
  submit.type = "button";
  actions.appendChild(submit);
  root.appendChild(actions);

  submit.addEventListener("click", () => {
    err.style.display = "none";
    const body = ta.value.trim();
    const { cards, invalidLines } = parseDirectFlashVocabLines(body);
    if (!cards.length) {
      err.textContent = invalidLines.length
        ? "Chưa có dòng hợp lệ. Mỗi dòng cần có dạng \"từ: nghĩa\" (có dấu hai chấm, không để trống hai bên)."
        : "Hãy nhập ít nhất một dòng theo dạng từ: nghĩa.";
      err.style.display = "block";
      return;
    }
    if (cards.length > MAX_PAIRS) {
      err.textContent = `Tối đa ${MAX_PAIRS} thẻ mỗi lần (bạn có ${cards.length} dòng hợp lệ). Hãy xóa bớt hoặc chia nhỏ.`;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    deps.onSubmit({ vocabText: body });
  });

  return root;
}

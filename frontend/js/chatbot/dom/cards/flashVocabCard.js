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
      "Định dạng: từ hoặc cụm mặt trước, dấu hai chấm, rồi nghĩa / mặt sau. Từ đầu tiên trước dấu : phải là tiếng Anh (chữ A–Z); dòng kiểu Buổi 19: ... sẽ được bỏ qua. Ví dụ: preserve: bảo tồn, giữ gìn. Tối đa 40 thẻ.",
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
    const { cards, invalidLines, skippedNonEnglish } = parseDirectFlashVocabLines(body);
    if (!cards.length) {
      if (skippedNonEnglish > 0 && !invalidLines.length) {
        err.textContent =
          "Các dòng đã bỏ qua vì từ đầu tiên trước dấu : không phải tiếng Anh (chữ Latin A–Z). Thêm ít nhất một dòng như preserve: bảo tồn, giữ gìn.";
      } else if (skippedNonEnglish > 0 && invalidLines.length) {
        err.textContent =
          "Chưa có thẻ hợp lệ: sửa các dòng sai định dạng và đảm bảo từ đầu tiên trước dấu : là tiếng Anh (ví dụ abandon: từ bỏ).";
      } else if (invalidLines.length) {
        err.textContent =
          "Chưa có dòng hợp lệ. Mỗi dòng cần có dạng \"từ: nghĩa\" (có dấu hai chấm, không để trống hai bên).";
      } else {
        err.textContent = "Hãy nhập ít nhất một dòng theo dạng từ: nghĩa.";
      }
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

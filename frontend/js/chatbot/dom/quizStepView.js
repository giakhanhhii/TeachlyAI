import { quizStemToSafeHtml } from "../services/quizService.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const BOOKMARK_SVG = `
  <svg class="flash-bookmark-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 3.75h10a1.25 1.25 0 0 1 1.25 1.25v15.22L12 16.6 5.75 20.22V5A1.25 1.25 0 0 1 7 3.75z" />
  </svg>
`;

/**
 * @param {HTMLButtonElement[]} buttons
 * @param {number | null} selected
 * @param {number} correctIndex
 */
function applyGradedStyles(buttons, selected, correctIndex) {
  buttons.forEach((btn, j) => {
    if (j === correctIndex) btn.classList.add("correct");
    if (j === selected && j !== correctIndex) btn.classList.add("wrong");
    btn.disabled = true;
  });
}

/**
 * @param {{
 *  stage: HTMLElement,
 *  question: any,
 *  index: number,
 *  selected: number | null,
 *  graded: boolean,
 *  onSelect: (selectedIndex: number) => void,
 *  isBookmarked?: boolean,
 *  onToggleBookmark?: (event: MouseEvent) => void,
 * }} params
 */
export function renderQuizStepView(params) {
  const { stage, question, index, selected, graded, onSelect, isBookmarked = false, onToggleBookmark } = params;
  stage.innerHTML = "";
  if (!question) {
    const empty = document.createElement("p");
    empty.className = "exp-empty";
    empty.textContent = "Không có câu hỏi trong bộ dữ liệu mock.";
    stage.appendChild(empty);
    return { hasQuestion: false };
  }

  const num = document.createElement("div");
  num.className = "exp-q-number";
  num.textContent = `${index + 1}.`;

  const text = document.createElement("p");
  text.className = "exp-q-text";
  text.innerHTML = quizStemToSafeHtml(question.text || "");

  const optsWrap = document.createElement("div");
  optsWrap.className = "exp-option-grid";
  const buttons = [];
  (question.options || []).forEach((opt, j) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "exp-opt-btn";
    b.textContent = `${OPTION_LETTERS[j] || j}. ${opt}`;
    b.addEventListener("click", () => {
      if (graded) return;
      onSelect(j);
      optsWrap.querySelectorAll(".exp-opt-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
    });
    if (selected === j) b.classList.add("selected");
    optsWrap.appendChild(b);
    buttons.push(b);
  });

  const pickHint = document.createElement("p");
  pickHint.className = "exp-mixed-pick-hint";
  pickHint.textContent = "Chọn một đáp án, nhấn Tiếp theo để xem đúng/sai, rồi Tiếp theo lần nữa để sang câu kế tiếp.";

  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.type = "button";
  bookmarkBtn.className = "exp-hint-toggle exp-mixed-quiz-bookmark-btn";
  bookmarkBtn.innerHTML = `${BOOKMARK_SVG}<span>${isBookmarked ? "Đã bookmark" : "Bookmark câu này"}</span>`;
  bookmarkBtn.setAttribute("aria-pressed", isBookmarked ? "true" : "false");
  bookmarkBtn.setAttribute("aria-label", isBookmarked ? "Bỏ bookmark câu hỏi" : "Bookmark câu hỏi");
  bookmarkBtn.title = isBookmarked ? "Bỏ bookmark câu hỏi" : "Bookmark câu hỏi";
  bookmarkBtn.classList.toggle("active", isBookmarked);
  bookmarkBtn.hidden = typeof onToggleBookmark !== "function";
  bookmarkBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    onToggleBookmark?.(event);
  });

  const hintToggle = document.createElement("button");
  hintToggle.type = "button";
  hintToggle.className = "exp-hint-toggle";
  hintToggle.innerHTML = `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;

  const hintPanel = document.createElement("div");
  hintPanel.className = "exp-hint-panel";
  hintPanel.hidden = true;
  hintPanel.textContent = question.hint || "(Chưa có gợi ý.)";

  let hintOpen = false;
  hintToggle.addEventListener("click", () => {
    hintOpen = !hintOpen;
    hintPanel.hidden = !hintOpen;
    hintToggle.innerHTML = hintOpen
      ? `Ẩn gợi ý <span class="exp-chevron exp-chevron-up" aria-hidden="true">▾</span>`
      : `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;
  });

  stage.appendChild(num);
  stage.appendChild(text);
  stage.appendChild(optsWrap);
  stage.appendChild(pickHint);
  stage.appendChild(bookmarkBtn);
  stage.appendChild(hintToggle);
  stage.appendChild(hintPanel);

  if (graded) applyGradedStyles(buttons, selected, question.correctIndex);
  return {
    hasQuestion: true,
    optionButtons: buttons,
    applyGrading(currentSelected) {
      applyGradedStyles(buttons, currentSelected, question.correctIndex);
    },
  };
}

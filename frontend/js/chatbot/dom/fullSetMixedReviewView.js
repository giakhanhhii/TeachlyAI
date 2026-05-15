import { buildMixedWrongExplanation, quizStemToSafeHtml } from "../services/fullSetMixedService.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function renderFlashBookmarkReviewCard(stepIndex, step, list, displayIndex) {
  const data = step?.data && typeof step.data === "object" ? step.data : {};
  const card = document.createElement("div");
  card.className = "quiz-review-card quiz-review-card-flash";

  const title = document.createElement("div");
  title.className = "quiz-review-question";
  title.textContent = `Flashcard ${displayIndex}.`;
  card.appendChild(title);

  const body = document.createElement("div");
  body.className = "quiz-review-flash-grid";

  const front = document.createElement("div");
  front.className = "quiz-review-flash-face";
  const frontLabel = document.createElement("strong");
  frontLabel.textContent = "Mặt trước";
  const frontText = document.createElement("p");
  frontText.textContent = String(data.front || "");
  front.append(frontLabel, frontText);

  const back = document.createElement("div");
  back.className = "quiz-review-flash-face";
  const backLabel = document.createElement("strong");
  backLabel.textContent = "Mặt sau";
  const backText = document.createElement("p");
  backText.textContent = String(data.back || "");
  back.append(backLabel, backText);

  body.append(front, back);

  if (data.phonetic || data.hint) {
    const meta = document.createElement("div");
    meta.className = "quiz-review-flash-meta";
    if (data.phonetic) {
      const phonetic = document.createElement("span");
      phonetic.textContent = `Phát âm: ${String(data.phonetic)}`;
      meta.appendChild(phonetic);
    }
    if (data.hint) {
      const hint = document.createElement("span");
      hint.textContent = `Gợi ý: ${String(data.hint)}`;
      meta.appendChild(hint);
    }
    card.appendChild(body);
    card.appendChild(meta);
  } else {
    card.appendChild(body);
  }

  card.dataset.stepIndex = String(stepIndex);
  list.appendChild(card);
}

/**
 * @param {{
 *  stage: HTMLElement,
 *  steps: { kind: "slide"|"quiz"|"flash", data: any }[],
 *  quizStepIndexes: number[],
 *  quizOrderByStep: Record<number, number>,
 *  quizSelectedByStep: (number | null)[],
 *  quizCountedByStep: boolean[],
 *  quizCorrectByStep: boolean[],
 *  bookmarkedStepKeys: string[],
 *  stepKeys: string[],
 *  bookmarkFilter: boolean,
 *  bookmarkFilterKind: "all"|"quiz"|"flash",
 *  bookmarkedQuizCount: number,
 *  bookmarkedFlashCount: number,
 *  reviewFilter: "all" | "wrong",
 *  correct: number,
 *  wrong: number,
 *  onBackToStep: () => void,
 *  onCreateOther: () => void | Promise<void>,
 *  onContinueCreate: () => void | Promise<void>,
 *  onFilterChange: (filter: "all"|"wrong") => void,
 *  onBookmarkKindChange?: (kind: "quiz"|"flash") => void,
 * }} params
 */
export function renderFullSetMixedReviewView(params) {
  const {
    stage,
    steps,
    quizStepIndexes,
    quizOrderByStep,
    quizSelectedByStep,
    quizCountedByStep,
    quizCorrectByStep,
    bookmarkedStepKeys,
    stepKeys,
    bookmarkFilter,
    bookmarkFilterKind,
    bookmarkedQuizCount,
    bookmarkedFlashCount,
    reviewFilter,
    correct,
    wrong,
    onBackToStep,
    onCreateOther,
    onContinueCreate,
    onFilterChange,
    onBookmarkKindChange,
  } = params;
  stage.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "quiz-review-wrap";
  const scoreRow = document.createElement("div");
  scoreRow.className = "quiz-review-score-row";
  const scoreMain = document.createElement("div");
  scoreMain.className = "quiz-review-score-main";
  const scoreCard = document.createElement("div");
  scoreCard.className = "quiz-review-score";
  scoreCard.innerHTML = `
      <h3>Kết quả bài quiz</h3>
      <p>Bạn làm đúng <strong>${correct}</strong>/<strong>${quizStepIndexes.length}</strong> câu, sai <strong>${wrong}</strong> câu.</p>
    `;
  scoreMain.appendChild(scoreCard);

  const actions = document.createElement("div");
  actions.className = "quiz-review-actions";
  const backInline = document.createElement("button");
  backInline.type = "button";
  backInline.className = "continue-create-btn quiz-review-action-back";
  backInline.textContent = "Quay lại thẻ";
  backInline.addEventListener("click", onBackToStep);

  const otherInline = document.createElement("button");
  otherInline.type = "button";
  otherInline.className = "continue-create-btn continue-create-btn-secondary";
  otherInline.textContent = "Tạo full set khác";
  otherInline.addEventListener("click", () => {
    void Promise.resolve(onCreateOther());
  });

  const sameInline = document.createElement("button");
  sameInline.type = "button";
  sameInline.className = "continue-create-btn continue-create-btn-primary";
  sameInline.textContent = "Tiếp tục tạo";
  sameInline.addEventListener("click", () => {
    void Promise.resolve(onContinueCreate());
  });
  actions.appendChild(backInline);
  actions.appendChild(otherInline);
  actions.appendChild(sameInline);
  scoreRow.appendChild(scoreMain);
  scoreRow.appendChild(actions);
  wrap.appendChild(scoreRow);

  const showQuizFilters = !bookmarkFilter || bookmarkFilterKind !== "flash";
  if (showQuizFilters) {
    const filterRow = document.createElement("div");
    filterRow.className = "quiz-review-filters";
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = `quiz-review-filter-btn${reviewFilter === "all" ? " active" : ""}`;
    allBtn.textContent = "Xem toàn bộ câu";
    allBtn.addEventListener("click", () => onFilterChange("all"));
    const wrongBtn = document.createElement("button");
    wrongBtn.type = "button";
    wrongBtn.className = `quiz-review-filter-btn${reviewFilter === "wrong" ? " active" : ""}`;
    wrongBtn.textContent = "Xem các câu sai";
    wrongBtn.addEventListener("click", () => onFilterChange("wrong"));
    filterRow.appendChild(allBtn);
    filterRow.appendChild(wrongBtn);
    wrap.appendChild(filterRow);
  }

  const showBookmarkTypeFilters = bookmarkFilter && bookmarkedQuizCount > 0 && bookmarkedFlashCount > 0;
  if (showBookmarkTypeFilters) {
    const bookmarkRow = document.createElement("div");
    bookmarkRow.className = "quiz-review-filters quiz-review-bookmark-filters";
    const quizBookmarkBtn = document.createElement("button");
    quizBookmarkBtn.type = "button";
    quizBookmarkBtn.className = `quiz-review-filter-btn${bookmarkFilterKind !== "flash" ? " active" : ""}`;
    quizBookmarkBtn.textContent = `Bookmark quiz (${bookmarkedQuizCount})`;
    quizBookmarkBtn.addEventListener("click", () => onBookmarkKindChange?.("quiz"));

    const flashBookmarkBtn = document.createElement("button");
    flashBookmarkBtn.type = "button";
    flashBookmarkBtn.className = `quiz-review-filter-btn${bookmarkFilterKind === "flash" ? " active" : ""}`;
    flashBookmarkBtn.textContent = `Bookmark flashcard (${bookmarkedFlashCount})`;
    flashBookmarkBtn.addEventListener("click", () => onBookmarkKindChange?.("flash"));

    bookmarkRow.append(quizBookmarkBtn, flashBookmarkBtn);
    wrap.appendChild(bookmarkRow);
  }

  const list = document.createElement("div");
  list.className = "quiz-review-list";
  const bookmarkedKeySet = new Set(Array.isArray(bookmarkedStepKeys) ? bookmarkedStepKeys.map(String) : []);
  const visibleStepIndexes = [];
  if (bookmarkFilter && bookmarkFilterKind === "flash") {
    steps.forEach((step, stepIndex) => {
      if (step?.kind !== "flash") return;
      if (!bookmarkedKeySet.has(String(stepKeys[stepIndex] || ""))) return;
      visibleStepIndexes.push(stepIndex);
    });
  } else {
    for (let i = 0; i < quizStepIndexes.length; i += 1) {
      const stepIndex = quizStepIndexes[i];
      if (bookmarkFilter && !bookmarkedKeySet.has(String(stepKeys[stepIndex] || ""))) continue;
      if (reviewFilter === "wrong" && quizCorrectByStep[stepIndex]) continue;
      visibleStepIndexes.push(stepIndex);
    }
  }

  if (!visibleStepIndexes.length) {
    const empty = document.createElement("p");
    empty.className = "exp-empty";
    if (bookmarkFilter && bookmarkFilterKind === "flash") {
      empty.textContent = "Chưa có flashcard nào được bookmark.";
    } else {
      empty.textContent = bookmarkFilter
        ? (reviewFilter === "wrong"
            ? "Không có câu quiz đã bookmark nào thuộc nhóm câu sai."
            : "Chưa có câu quiz nào được bookmark.")
        : (reviewFilter === "wrong" ? "Tuyệt vời! Bạn không có câu sai." : "Chưa có dữ liệu để hiển thị.");
    }
    list.appendChild(empty);
  } else if (bookmarkFilter && bookmarkFilterKind === "flash") {
    visibleStepIndexes.forEach((stepIndex, visibleIndex) => {
      renderFlashBookmarkReviewCard(stepIndex, steps[stepIndex], list, visibleIndex + 1);
    });
  } else {
    visibleStepIndexes.forEach((stepIndex) => {
      const q = steps[stepIndex]?.data || {};
      const picked = quizSelectedByStep[stepIndex];
      const isCounted = !!quizCountedByStep[stepIndex];
      const isCorrect = isCounted && !!quizCorrectByStep[stepIndex];
      const isWrong = isCounted && !quizCorrectByStep[stepIndex];

      const card = document.createElement("div");
      card.className = "quiz-review-card";
      const title = document.createElement("div");
      title.className = "quiz-review-question";
      title.innerHTML = `<strong>Câu ${quizOrderByStep[stepIndex]}.</strong> ${quizStemToSafeHtml(q.text || "")}`;
      card.appendChild(title);

      const options = document.createElement("div");
      options.className = "quiz-review-options";
      (q.options || []).forEach((opt, j) => {
        const line = document.createElement("div");
        let cls = "quiz-review-option";
        if (j === q.correctIndex) cls += " correct";
        if (j === picked && j !== q.correctIndex) cls += " wrong";
        line.className = cls;
        line.textContent = `${OPTION_LETTERS[j] || j}. ${opt}`;
        options.appendChild(line);
      });
      card.appendChild(options);

      const result = document.createElement("div");
      result.className = `quiz-review-result ${isCorrect ? "ok" : isWrong ? "bad" : ""}`.trim();
      result.textContent = isCorrect
        ? "Bạn làm đúng câu này."
        : isWrong
          ? "Bạn làm sai câu này."
          : "Câu này chưa được chấm điểm.";
      card.appendChild(result);

      if (isWrong) {
        const exp = document.createElement("div");
        exp.className = "quiz-review-explain";
        exp.textContent = buildMixedWrongExplanation(q, picked);
        card.appendChild(exp);
      }
      list.appendChild(card);
    });
  }

  wrap.appendChild(list);
  stage.appendChild(wrap);
}

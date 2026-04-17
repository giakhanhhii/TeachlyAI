import { fetchMockResource } from "../services/mockContentApi.js";
import { prepareQuizSessionData } from "../services/sessionContentPrep.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Nhiều đề gộp "A. … B. …" trên một dòng; tách dòng để khớp format đề in.
 * @param {string} s
 */
function insertInlineMcLineBreaks(s) {
  if (!s) return s;
  let t = s.replace(/([:;?])\s+A\.\s/g, "$1\nA. ");
  t = t.replace(/\s+(?=[B-F]\.\s)/g, "\n");
  return t;
}

/**
 * Escape HTML + markdown bold đơn giản (**…**) + xuống dòng.
 * @param {string} s
 */
function quizStemToSafeHtml(s) {
  const withBreaks = insertInlineMcLineBreaks(s);
  const esc = escapeHtml(withBreaks);
  const withBold = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

/**
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void }} deps
 */
function buildAiDraftQuiz(meta, qIndex, question) {
  const topic = meta.topic || "—";
  const count = meta.count || "—";
  const notes = meta.notes || "—";
  const opts = (question.options || []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n");
  return (
    `[Sửa đề quiz — nhờ AI]\n` +
    `Ngữ cảnh người dùng — Chủ đề: ${topic}; Số câu mong muốn: ${count}; Ghi chú: ${notes}\n` +
    `Câu hiện tại (${qIndex + 1}): ${question.text}\n` +
    `${opts}\n\n` +
    `Hãy đề xuất phiên bản câu hỏi và phương án tốt hơn (giữ định dạng trắc nghiệm 4 lựa chọn), kèm đáp án đúng và gợi ý ngắn.`
  );
}

/**
 * @param {{ body: HTMLElement }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "slide"|"quiz"|"flash") => void }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountQuizExperience(layerView, meta, deps, opts = {}) {
  layerView.prepareShow();
  const root = layerView.body;
  const raw = await fetchMockResource("quiz");
  const data = prepareQuizSessionData(raw, meta);
  const titleText = data.title || "Ôn tập trắc nghiệm";
  const questions = Array.isArray(data.questions) ? data.questions : [];

  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  /** @type {number | null} */
  let selected = null;
  /** @type {boolean | null} */
  let lastWasCorrect = null;
  let reviewMode = false;
  /** @type {"all"|"wrong"} */
  let reviewFilter = "all";

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz";

  const onAiForQuestion = () => {
    const q = questions[index];
    if (!q || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftQuiz(meta, index, q));
  };

  shell.appendChild(
    createExperienceTopBar({
      title: titleText,
      onAiEdit: deps?.onAiEdit ? onAiForQuestion : undefined,
    }),
  );

  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  summary.textContent = `Đã ghi nhận — Chủ đề: ${meta.topic || "—"} | Số câu (yêu cầu): ${meta.count || "—"} | Ghi chú: ${meta.notes || "—"}`;
  shell.appendChild(summary);

  const total = Math.max(1, questions.length);
  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  shell.appendChild(progress.wrap);
  /** @type {(number|null)[]} */
  const selectedByIndex = Array.from({ length: questions.length }, (_, i) => {
    const arr = Array.isArray(initial?.selectedByIndex) ? initial.selectedByIndex : [];
    const v = arr[i];
    return Number.isFinite(Number(v)) ? Math.floor(Number(v)) : null;
  });
  /** @type {boolean[]} */
  const gradedByIndex = Array.from({ length: questions.length }, (_, i) => {
    const arr = Array.isArray(initial?.gradedByIndex) ? initial.gradedByIndex : [];
    return Boolean(arr[i]);
  });

  function recomputeScore() {
    correct = 0;
    wrong = 0;
    for (let i = 0; i < questions.length; i += 1) {
      if (!gradedByIndex[i]) continue;
      const q = questions[i];
      const picked = selectedByIndex[i];
      if (!q || picked === null) continue;
      if (picked === q.correctIndex) correct += 1;
      else wrong += 1;
    }
  }

  /**
   * @param {any} question
   * @param {number | null} pickedIndex
   */
  function buildWrongExplanation(question, pickedIndex) {
    const picked = Number.isFinite(Number(pickedIndex)) ? Number(pickedIndex) : -1;
    const pickedText = picked >= 0 ? question?.options?.[picked] : "";
    const correctText = question?.options?.[question?.correctIndex] || "";
    const base = question?.hint ? String(question.hint) : "Cần bám sát nghĩa trọng tâm và loại trừ đáp án nhiễu.";
    return `Bạn chọn "${pickedText || "không chọn"}" nên chưa đúng. Đáp án đúng là "${correctText}". ${base}`;
  }
  index = Math.min(Math.max(0, index), Math.max(0, questions.length - 1));

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "quiz",
      meta: { ...meta },
      title: titleText,
      total: questions.length,
      index,
      selectedByIndex: [...selectedByIndex],
      gradedByIndex: [...gradedByIndex],
      correct,
      wrong,
    });
  }

  const stage = document.createElement("div");
  stage.className = "exp-stage";
  shell.appendChild(stage);

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function renderQuestion() {
    footer.hidden = false;
    const q = questions[index];
    stage.innerHTML = "";
    selected = index < selectedByIndex.length ? selectedByIndex[index] : null;
    lastWasCorrect = gradedByIndex[index] && selected !== null && q ? selected === q.correctIndex : null;
    backBtn.disabled = index <= 0;
    nextBtn.disabled = !gradedByIndex[index] && selected === null;

    if (!q) {
      const empty = document.createElement("p");
      empty.className = "exp-empty";
      empty.textContent = "Không có câu hỏi trong bộ dữ liệu mock.";
      stage.appendChild(empty);
      backBtn.disabled = true;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      return;
    }

    const num = document.createElement("div");
    num.className = "exp-q-number";
    num.textContent = `${index + 1}.`;

    const text = document.createElement("p");
    text.className = "exp-q-text";
    text.innerHTML = quizStemToSafeHtml(q.text || "");

    const optsWrap = document.createElement("div");
    optsWrap.className = "exp-option-grid";

    const letters = ["A", "B", "C", "D", "E", "F"];
    (q.options || []).forEach((opt, j) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "exp-opt-btn";
      b.textContent = `${letters[j] || j}. ${opt}`;
      b.addEventListener("click", () => {
        if (gradedByIndex[index]) return;
        selected = j;
        selectedByIndex[index] = j;
        optsWrap.querySelectorAll(".exp-opt-btn").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
        nextBtn.disabled = false;
        emitState();
      });
      if (selected === j) b.classList.add("selected");
      optsWrap.appendChild(b);
    });

    const hintToggle = document.createElement("button");
    hintToggle.type = "button";
    hintToggle.className = "exp-hint-toggle";
    hintToggle.innerHTML = `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;

    const hintPanel = document.createElement("div");
    hintPanel.className = "exp-hint-panel";
    hintPanel.hidden = true;
    hintPanel.textContent = q.hint || "(Chưa có gợi ý.)";

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
    stage.appendChild(hintToggle);
    stage.appendChild(hintPanel);

    if (gradedByIndex[index]) {
      optsWrap.querySelectorAll(".exp-opt-btn").forEach((btn, j) => {
        if (j === q.correctIndex) btn.classList.add("correct");
        if (j === selected && j !== q.correctIndex) btn.classList.add("wrong");
        /** @type {HTMLButtonElement} */ (btn).disabled = true;
      });
    }

    recomputeScore();
    progress.paint({ total, index, correct, wrong });
    if (!gradedByIndex[index]) nextBtn.textContent = "Tiếp theo";
    else {
      const isLast = index >= questions.length - 1;
      nextBtn.textContent = isLast ? "Tiếp tục tạo" : "Tiếp theo";
    }
    emitState();
  }

  function renderReview() {
    stage.innerHTML = "";
    footer.hidden = true;
    recomputeScore();
    progress.paint({ total, index: Math.max(0, questions.length - 1), correct, wrong });

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
      <p>Bạn làm đúng <strong>${correct}</strong>/<strong>${questions.length}</strong> câu, sai <strong>${wrong}</strong> câu.</p>
    `;
    scoreMain.appendChild(scoreCard);

    const actions = document.createElement("div");
    actions.className = "quiz-review-actions";
    const backBtnInline = document.createElement("button");
    backBtnInline.type = "button";
    backBtnInline.className = "continue-create-btn quiz-review-action-back";
    backBtnInline.textContent = "Quay lại thẻ";
    const otherBtnInline = document.createElement("button");
    otherBtnInline.type = "button";
    otherBtnInline.className = "continue-create-btn continue-create-btn-secondary";
    otherBtnInline.textContent = "Tạo thẻ khác";
    const nextBtnInline = document.createElement("button");
    nextBtnInline.type = "button";
    nextBtnInline.className = "continue-create-btn continue-create-btn-primary";
    nextBtnInline.textContent = "Tiếp tục tạo";

    backBtnInline.addEventListener("click", () => {
      reviewMode = false;
      index = Math.max(0, questions.length - 1);
      backBtn.textContent = "Quay lại";
      renderQuestion();
    });
    otherBtnInline.addEventListener("click", () => {
      deps?.onContinueCreate?.("quiz", { preset: "other" });
    });
    nextBtnInline.addEventListener("click", () => {
      deps?.onContinueCreate?.("quiz");
    });

    actions.appendChild(backBtnInline);
    actions.appendChild(otherBtnInline);
    actions.appendChild(nextBtnInline);

    scoreRow.appendChild(scoreMain);
    scoreRow.appendChild(actions);
    wrap.appendChild(scoreRow);

    const filterRow = document.createElement("div");
    filterRow.className = "quiz-review-filters";
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = `quiz-review-filter-btn${reviewFilter === "all" ? " active" : ""}`;
    allBtn.textContent = "Xem toàn bộ câu";
    const wrongBtn = document.createElement("button");
    wrongBtn.type = "button";
    wrongBtn.className = `quiz-review-filter-btn${reviewFilter === "wrong" ? " active" : ""}`;
    wrongBtn.textContent = "Xem các câu sai";
    filterRow.appendChild(allBtn);
    filterRow.appendChild(wrongBtn);
    wrap.appendChild(filterRow);

    const list = document.createElement("div");
    list.className = "quiz-review-list";

    const visibleIndexes = [];
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const picked = selectedByIndex[i];
      const isWrong = gradedByIndex[i] && picked !== null && picked !== q.correctIndex;
      if (reviewFilter === "wrong" && !isWrong) continue;
      visibleIndexes.push(i);
    }

    if (!visibleIndexes.length) {
      const empty = document.createElement("p");
      empty.className = "exp-empty";
      empty.textContent = reviewFilter === "wrong" ? "Tuyệt vời! Bạn không có câu sai." : "Chưa có dữ liệu để hiển thị.";
      list.appendChild(empty);
    } else {
      visibleIndexes.forEach((i) => {
        const q = questions[i];
        const picked = selectedByIndex[i];
        const isCorrect = gradedByIndex[i] && picked !== null && picked === q.correctIndex;
        const isWrong = gradedByIndex[i] && picked !== null && picked !== q.correctIndex;

        const card = document.createElement("div");
        card.className = "quiz-review-card";
        const title = document.createElement("div");
        title.className = "quiz-review-question";
        title.innerHTML = `<strong>Câu ${i + 1}.</strong> ${quizStemToSafeHtml(q.text || "")}`;
        card.appendChild(title);

        const options = document.createElement("div");
        options.className = "quiz-review-options";
        const letters = ["A", "B", "C", "D", "E", "F"];
        (q.options || []).forEach((opt, j) => {
          const line = document.createElement("div");
          let cls = "quiz-review-option";
          if (j === q.correctIndex) cls += " correct";
          if (j === picked && j !== q.correctIndex) cls += " wrong";
          line.className = cls;
          line.textContent = `${letters[j] || j}. ${opt}`;
          options.appendChild(line);
        });
        card.appendChild(options);

        const result = document.createElement("div");
        result.className = `quiz-review-result ${isCorrect ? "ok" : "bad"}`;
        result.textContent = isCorrect ? "Bạn làm đúng câu này." : "Bạn làm sai câu này.";
        card.appendChild(result);

        if (isWrong) {
          const exp = document.createElement("div");
          exp.className = "quiz-review-explain";
          exp.textContent = buildWrongExplanation(q, picked);
          card.appendChild(exp);
        }
        list.appendChild(card);
      });
    }

    allBtn.addEventListener("click", () => {
      reviewFilter = "all";
      renderReview();
    });
    wrongBtn.addEventListener("click", () => {
      reviewFilter = "wrong";
      renderReview();
    });

    wrap.appendChild(list);
    stage.appendChild(wrap);

    backBtn.textContent = "Quay lại thẻ";
    backBtn.disabled = false;
    nextBtn.textContent = "Tiếp tục tạo";
    nextBtn.disabled = false;
    emitState();
  }

  backBtn.addEventListener("click", () => {
    if (reviewMode) {
      reviewMode = false;
      index = Math.max(0, questions.length - 1);
      backBtn.textContent = "Quay lại";
      renderQuestion();
      return;
    }
    if (index <= 0) return;
    index -= 1;
    renderQuestion();
  });

  nextBtn.addEventListener("click", () => {
    if (reviewMode) {
      deps?.onContinueCreate?.("quiz");
      return;
    }
    const q = questions[index];
    if (!q) return;

    if (!gradedByIndex[index]) {
      if (selected === null) return;
      const ok = selected === q.correctIndex;
      lastWasCorrect = ok;
      gradedByIndex[index] = true;
      selectedByIndex[index] = selected;
      recomputeScore();
      progress.paint({ total, index, correct, wrong });
      const buttons = stage.querySelectorAll(".exp-opt-btn");
      buttons.forEach((btn, j) => {
        if (j === q.correctIndex) btn.classList.add("correct");
        if (j === selected && j !== q.correctIndex) btn.classList.add("wrong");
        /** @type {HTMLButtonElement} */ (btn).disabled = true;
      });
      const isLast = index >= questions.length - 1;
      nextBtn.textContent = isLast ? "Tiếp tục tạo" : "Tiếp theo";
      nextBtn.disabled = false;
      emitState();
      return;
    }

    if (index >= questions.length - 1) {
      reviewMode = true;
      reviewFilter = "all";
      renderReview();
      return;
    }
    index += 1;
    renderQuestion();
  });

  root.appendChild(shell);
  renderQuestion();
}

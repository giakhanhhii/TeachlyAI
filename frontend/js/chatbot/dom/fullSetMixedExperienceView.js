import { fetchMockResource } from "../services/mockContentApi.js";
import {
  prepareQuizSessionData,
  prepareSlideSessionData,
  prepareFlashSessionData,
  shuffleInPlace,
} from "../services/sessionContentPrep.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import {
  buildAiDraftQuiz,
  quizCorrectOptionIndex,
  quizOptionList,
  quizStemToSafeHtml,
} from "../services/fullSetMixedService.js";
import { hookFlashSpeechVoicesOnce } from "../services/speechService.js";
import {
  applyQuizRevealStyles,
  createStepBadge,
  renderFlashStep,
  renderQuizStep,
  renderSlideStep,
} from "./fullSetMixedStepView.js";

/**
 * @typedef {{ topic: string, level: string, slides: string, quiz: string, flash: string, extra?: string }} FullSetMixedSpec
 */

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {{ title?: string, spec: FullSetMixedSpec }} bundle
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "fullset"|"slide"|"quiz"|"flash", opts?: { preset?: "same"|"other" }) => void | Promise<void> }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountFullSetMixedExperience(layerView, bundle, deps, opts = {}) {
  layerView.prepareShow();
  hookFlashSpeechVoicesOnce();
  const root = layerView.body;
  root.innerHTML = "";

  const spec = bundle.spec || {};
  const topic = spec.topic || "—";
  const notesLine = spec.extra ? ` | Yêu cầu thêm: ${spec.extra}` : "";

  const slideMeta = { topic, count: spec.slides, notes: "Full set (demo mock)" };
  const quizMeta = { topic, count: spec.quiz, notes: "Full set (demo mock)" };
  const flashMeta = { source: topic, count: spec.flash, extra: "Full set (demo mock)" };

  const [rawSlide, rawQuiz, rawFlash] = await Promise.all([
    fetchMockResource("slide"),
    fetchMockResource("quiz"),
    fetchMockResource("flashcard"),
  ]);

  const slideData = prepareSlideSessionData(rawSlide, slideMeta);
  const quizData = prepareQuizSessionData(rawQuiz, quizMeta);
  const flashData = prepareFlashSessionData(rawFlash, flashMeta);

  const slides = Array.isArray(slideData.slides) ? slideData.slides : [];
  const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
  const cards = Array.isArray(flashData.cards) ? flashData.cards : [];

  /** @type {{ kind: "slide"|"quiz"|"flash", data: any }[]} */
  const steps = [
    ...slides.map((data) => ({ kind: /** @type {"slide"} */ ("slide"), data })),
    ...questions.map((data) => ({ kind: /** @type {"quiz"} */ ("quiz"), data })),
    ...cards.map((data) => ({ kind: /** @type {"flash"} */ ("flash"), data })),
  ];
  shuffleInPlace(steps);

  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  let reviewMode = Boolean(initial?.reviewMode);
  /** @type {"all"|"wrong"} */
  let reviewFilter = initial?.reviewFilter === "wrong" ? "wrong" : "all";
  /** @type {number | null} */
  let quizSelected = null;
  let quizRevealed = false;
  /** @type {(number | null)[]} */
  const quizSelectedByStep = Array.from({ length: steps.length }, (_, i) => {
    const arr = Array.isArray(initial?.quizSelectedByStep) ? initial.quizSelectedByStep : [];
    const v = arr[i];
    return Number.isFinite(Number(v)) ? Math.floor(Number(v)) : null;
  });
  /** @type {boolean[]} */
  const quizRevealedByStep = Array.from({ length: steps.length }, (_, i) => {
    const arr = Array.isArray(initial?.quizRevealedByStep) ? initial.quizRevealedByStep : [];
    return Boolean(arr[i]);
  });
  /** @type {boolean[]} */
  const quizCountedByStep = Array.from({ length: steps.length }, (_, i) => {
    const arr = Array.isArray(initial?.quizCountedByStep) ? initial.quizCountedByStep : [];
    return Boolean(arr[i]);
  });
  /** @type {boolean[]} */
  const quizCorrectByStep = Array.from({ length: steps.length }, (_, i) => {
    const arr = Array.isArray(initial?.quizCorrectByStep) ? initial.quizCorrectByStep : [];
    return Boolean(arr[i]);
  });
  const quizStepIndexes = [];
  const quizOrderByStep = {};
  for (let i = 0; i < steps.length; i += 1) {
    if (steps[i]?.kind !== "quiz") continue;
    quizOrderByStep[i] = quizStepIndexes.length + 1;
    quizStepIndexes.push(i);
  }
  index = Math.min(Math.max(0, index), Math.max(0, steps.length - 1));

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz exp-shell-mixed";

  const titleText = quizData.title || slideData.title || bundle.title || "Full set — ôn tập trộn";

  const onAi = () => {
    const step = steps[index];
    if (!step || step.kind !== "quiz" || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftQuiz(quizMeta, index, step.data));
  };

  shell.appendChild(
    createExperienceTopBar({
      title: titleText,
      onAiEdit: deps?.onAiEdit ? onAi : undefined,
    }),
  );

  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  const sum = steps.length;
  summary.textContent =
    `Full set — ${topic} | Trình độ: ${spec.level || "—"} | ` +
    `Slide ${spec.slides} + Quiz ${spec.quiz} + Flash ${spec.flash} = ${sum} mục (trộn lẫn)${notesLine}`;

  const total = Math.max(1, steps.length);
  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });

  const stage = document.createElement("div");
  stage.className = "exp-stage";

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);

  function recomputeScore() {
    correct = 0;
    wrong = 0;
    for (let i = 0; i < steps.length; i += 1) {
      if (!quizCountedByStep[i]) continue;
      if (quizCorrectByStep[i]) correct += 1;
      else wrong += 1;
    }
  }

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "fullset",
      title: titleText,
      spec: { ...spec },
      total: steps.length,
      index,
      quizSelectedByStep: [...quizSelectedByStep],
      quizRevealedByStep: [...quizRevealedByStep],
      quizCountedByStep: [...quizCountedByStep],
      quizCorrectByStep: [...quizCorrectByStep],
      reviewMode,
      reviewFilter,
      correct,
      wrong,
    });
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

  function exitReviewToLastStep() {
    reviewMode = false;
    index = Math.max(0, steps.length - 1);
    footer.hidden = false;
    renderStep();
  }

  function renderReview() {
    stage.innerHTML = "";
    footer.hidden = true;
    recomputeScore();
    progress.paint({ total, index: Math.max(0, steps.length - 1), correct, wrong });

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
    const otherInline = document.createElement("button");
    otherInline.type = "button";
    otherInline.className = "continue-create-btn continue-create-btn-secondary";
    otherInline.textContent = "Tạo thẻ khác";
    const sameInline = document.createElement("button");
    sameInline.type = "button";
    sameInline.className = "continue-create-btn continue-create-btn-primary";
    sameInline.textContent = "Tiếp tục tạo";
    backInline.addEventListener("click", () => exitReviewToLastStep());
    otherInline.addEventListener("click", () => {
      void Promise.resolve(deps?.onContinueCreate?.("fullset", { preset: "other" }));
    });
    sameInline.addEventListener("click", () => {
      void Promise.resolve(deps?.onContinueCreate?.("fullset", { preset: "same" }));
    });
    actions.appendChild(backInline);
    actions.appendChild(otherInline);
    actions.appendChild(sameInline);

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

    const visibleStepIndexes = [];
    for (let i = 0; i < quizStepIndexes.length; i += 1) {
      const stepIndex = quizStepIndexes[i];
      if (reviewFilter === "wrong" && quizCorrectByStep[stepIndex]) continue;
      visibleStepIndexes.push(stepIndex);
    }

    if (!visibleStepIndexes.length) {
      const empty = document.createElement("p");
      empty.className = "exp-empty";
      empty.textContent = reviewFilter === "wrong" ? "Tuyệt vời! Bạn không có câu sai." : "Chưa có dữ liệu để hiển thị.";
      list.appendChild(empty);
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

    emitState();
  }

  function renderStep() {
    if (reviewMode) {
      renderReview();
      return;
    }

    footer.hidden = false;
    const step = steps[index];
    stage.innerHTML = "";
    backBtn.textContent = "Quay lại";
    backBtn.disabled = index <= 0;
    quizSelected = quizSelectedByStep[index] ?? null;
    quizRevealed = !!quizRevealedByStep[index];
    recomputeScore();

    if (!step) {
      stage.innerHTML = `<p class="exp-empty">Không có học liệu trong bộ Full set.</p>`;
      backBtn.disabled = true;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      progress.paint({ total, index: Math.max(0, index), correct, wrong });
      return;
    }

    stage.appendChild(createStepBadge(step.kind));

    if (step.kind === "slide") {
      renderSlideStep(stage, step.data);
      nextBtn.disabled = false;
    } else if (step.kind === "flash") {
      renderFlashStep(stage, step.data);
      nextBtn.disabled = false;
    } else {
      const quizUi = renderQuizStep(stage, {
        index,
        question: step.data,
        selected: quizSelected,
        revealed: !!quizRevealedByStep[index],
        onPick: (pickedIndex) => {
          quizSelected = pickedIndex;
          quizSelectedByStep[index] = pickedIndex;
          nextBtn.disabled = false;
          emitState();
        },
      });
      nextBtn.disabled = !quizUi.canProceed;
    }

    progress.paint({ total, index, correct, wrong });
    nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    emitState();
  }

  nextBtn.addEventListener("click", () => {
    if (reviewMode) {
      void Promise.resolve(deps?.onContinueCreate?.("fullset"));
      return;
    }
    const step = steps[index];
    if (!step) return;

    if (step.kind === "quiz") {
      const q = step.data;
      const opts = quizOptionList(q);
      const correctIdx = quizCorrectOptionIndex(q);

      if (opts.length === 0) {
        if (index >= total - 1) {
          nextBtn.disabled = true;
          return;
        }
        index += 1;
        renderStep();
        return;
      }

      if (!quizRevealed) {
        if (quizSelected == null || !Number.isFinite(Number(quizSelected))) return;
        const picked = Number(quizSelected);
        const ok = picked === correctIdx;
        quizRevealed = true;
        quizSelectedByStep[index] = picked;
        quizRevealedByStep[index] = true;
        if (!quizCountedByStep[index]) {
          quizCountedByStep[index] = true;
          quizCorrectByStep[index] = ok;
        }
        recomputeScore();
        progress.paint({ total, index, correct, wrong });
        applyQuizRevealStyles(stage, q, picked);
        nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
        nextBtn.disabled = false;
        emitState();
        return;
      }
      if (index >= total - 1) {
        if (quizStepIndexes.length === 0) {
          deps?.onContinueCreate?.("fullset");
          return;
        }
        reviewMode = true;
        reviewFilter = "all";
        renderReview();
        return;
      }
      index += 1;
      renderStep();
      return;
    }

    if (index >= total - 1) {
      if (quizStepIndexes.length === 0) {
        deps?.onContinueCreate?.("fullset");
        return;
      }
      reviewMode = true;
      reviewFilter = "all";
      renderReview();
      return;
    }
    index += 1;
    renderStep();
  });

  backBtn.addEventListener("click", () => {
    if (reviewMode) {
      exitReviewToLastStep();
      return;
    }
    if (index <= 0) return;
    index -= 1;
    renderStep();
  });

  shell.appendChild(summary);
  shell.appendChild(progress.wrap);
  shell.appendChild(stage);
  shell.appendChild(footer);
  root.appendChild(shell);
  renderStep();
}

import { fetchMockResource } from "../services/mockContentApi.js";
import { isAiModeActive, incrementPlayCount, fetchAiContent, fetchAiFileContent } from "../services/aiContentApi.js";
import { beginDwell } from "../services/dwellStore.js";
import { getFetch, startFetch } from "../services/backgroundFetchStore.js";
import { createAiLoadingOverlay } from "./experienceLoading.js";
import { prepareQuizSessionData } from "../services/sessionContentPrep.js";
import { recomputeScore } from "../services/quizService.js";
import { buildExperienceTitle } from "../services/contentTitles.js";
import { finalizePendingQuizAnswer } from "../services/quizSubmitFlow.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { renderQuizStepView } from "./quizStepView.js";
import { renderQuizReviewView } from "./quizReviewView.js";

/**
 * @param {{ body: HTMLElement }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "slide"|"quiz"|"flash", opts?: { preset?: "same"|"other" }) => void }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountQuizExperience(layerView, meta, deps, opts = {}) {
  layerView.prepareShow();
  const root = layerView.body;
  if (typeof root._kbAbort === "function") { root._kbAbort(); delete root._kbAbort; }
  const _genStamp = Symbol();
  root._genStamp = _genStamp;
  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  const initialQuestions = Array.isArray(initial?.questionsSnapshot) ? initial.questionsSnapshot : null;
  const isRestore = Boolean(initialQuestions);
  const _forceAi = meta?.__forceAi === "1";
  const _forceMock = meta?.__forceMock === "1";
  const _aiTopic = meta?.source || meta?.topic || undefined;
  const _isAutoTopic = !_aiTopic || _aiTopic === "(Teachly tự động)" || meta?.__autoMode === "1";
  const _uploadFile = !isRestore && meta?.__pdfFile instanceof File ? meta.__pdfFile : null;
  const _bgFetch = !isRestore && !_uploadFile && meta?.__bgFetchId ? getFetch(String(meta.__bgFetchId)) : null;
  let raw;
  if (!isRestore) {
    if (_uploadFile || _bgFetch) {
      root.innerHTML = "";
      const loadingState = createAiLoadingOverlay(root, {
        label: "AI đang đọc tài liệu…",
        tip: "Chuyển nội dung sang câu hỏi, vui lòng đợi.",
        estimatedSeconds: 15,
        startedAt: _bgFetch?.startedAt,
      });
      try {
        raw = _bgFetch
          ? await _bgFetch.promise
          : await fetchAiFileContent("quiz", _uploadFile, { count: Number(meta?.count) || 10, notes: meta?.notes || "" });
      } catch (err) {
        loadingState.remove();
        if (root._genStamp !== _genStamp) return;
        root.innerHTML = "";
        const box = document.createElement("div"); box.className = "exp-upload-error";
        box.innerHTML = `<p class="exp-upload-error-msg">${String((err && err.message) || "Không thể xử lý tệp. Vui lòng thử lại.")}</p>`;
        root.appendChild(box);
        return;
      }
      if (root._genStamp !== _genStamp) return;
      loadingState.remove();
      incrementPlayCount("quiz");
      document.dispatchEvent(new CustomEvent("teachly:content-src", { detail: "ai" }));
    } else {
      const _prefetchEntry = meta?.__prefetchId ? getFetch(String(meta.__prefetchId)) : null;
      if (_prefetchEntry) {
        if (_prefetchEntry.status === "pending") {
          root.innerHTML = "";
          const loadingState = createAiLoadingOverlay(root, {
            label: "AI đang tạo câu hỏi…",
            tip: "Vui lòng đợi trong giây lát.",
            estimatedSeconds: 15,
            startedAt: _prefetchEntry.startedAt,
          });
          try {
            raw = await _prefetchEntry.promise;
          } finally {
            loadingState.remove();
          }
          if (root._genStamp !== _genStamp) return;
        } else {
          raw = await _prefetchEntry.promise;
        }
        incrementPlayCount("quiz");
        document.dispatchEvent(new CustomEvent("teachly:content-src", { detail: "ai" }));
      } else {
        const _devSrc = _forceMock
          ? "mock"
          : ((_forceAi || (!meta?.presetId && (isAiModeActive("quiz") || !_isAutoTopic)))) ? "ai" : "mock"; /* DEV-ONLY */
        const _bgKey = (_devSrc === "ai" && meta?.__experienceId) ? `gen_${meta.__experienceId}` : null;
        if (_bgKey && !getFetch(_bgKey)) startFetch(_bgKey, fetchAiContent("quiz", _aiTopic, meta).catch(() => fetchMockResource("quiz")));
        const _bgEntry = _bgKey ? getFetch(_bgKey) : null;
        const loadingState = (_devSrc === "ai" && _bgEntry?.status !== "done")
          ? (() => {
              root.innerHTML = "";
              return createAiLoadingOverlay(root, {
                label: "AI đang tạo câu hỏi…",
                tip: "Vui lòng đợi trong giây lát.",
                estimatedSeconds: 15,
                startedAt: _bgEntry?.startedAt,
              });
            })()
          : null;
        raw = _bgEntry?.status === "done" ? _bgEntry.raw
            : _bgEntry ? await _bgEntry.promise
            : _devSrc === "ai" ? await fetchAiContent("quiz", _aiTopic, meta).catch(() => fetchMockResource("quiz"))
            : await fetchMockResource("quiz");
        loadingState?.remove();
        if (root._genStamp !== _genStamp) return;
        incrementPlayCount("quiz");
        document.dispatchEvent(new CustomEvent("teachly:content-src", { detail: _devSrc }));
      }
    }
  }
  const data = initialQuestions
    ? {
        title: typeof initial?.title === "string" ? initial.title : "",
        questions: initialQuestions,
        sessionMeta: initial?.meta && typeof initial.meta === "object" ? initial.meta : meta,
      }
    : prepareQuizSessionData(raw, meta);
  const sessionMeta = data.sessionMeta && typeof data.sessionMeta === "object" ? data.sessionMeta : meta;
  const metaForTitle =
    initial?.meta && typeof initial.meta === "object" ? { ...sessionMeta, ...initial.meta } : sessionMeta;
  const titleText = buildExperienceTitle("quiz", metaForTitle?.source, metaForTitle?.topic, data.title);
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (!isRestore) beginDwell(metaForTitle?.source || metaForTitle?.list || metaForTitle?.topic || titleText, "quiz");

  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  let selected = null;
  let reviewMode = false;
  /** @type {"all"|"wrong"} */
  let reviewFilter = "all";

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz";
  shell.appendChild(createExperienceTopBar({ title: titleText, onShare: deps?.onShareCurrentExperience }).bar);

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
  /** @type {{ hasQuestion: boolean, applyGrading?: (selectedIndex: number | null) => void } | null} */
  let activeStepView = null;
  index = Math.min(Math.max(0, index), Math.max(0, questions.length - 1));

  function refreshScore() {
    const score = recomputeScore(questions, selectedByIndex, gradedByIndex);
    correct = score.correct;
    wrong = score.wrong;
  }
  function syncScoreAndEmit() {
    refreshScore();
    emitState();
  }

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "quiz",
      meta: { ...sessionMeta },
      title: titleText,
      total: questions.length,
      index,
      questionsSnapshot: questions.map((question) => ({
        ...question,
        options: Array.isArray(question?.options) ? question.options.slice() : [],
      })),
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
  const submitBtn = createPrimaryNavButton({ label: "Nộp bài", disabled: false });
  submitBtn.classList.add("exp-submit-btn");
  const resultBtn = createPrimaryNavButton({ label: "Xem kết quả", disabled: false });
  resultBtn.classList.add("exp-back-btn");
  resultBtn.hidden = true;
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(backBtn);
  footer.appendChild(submitBtn);
  footer.appendChild(resultBtn);
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function renderQuestion() {
    reviewMode = false;
    footer.hidden = false;
    const q = questions[index];
    selected = index < selectedByIndex.length ? selectedByIndex[index] : null;
    activeStepView = renderQuizStepView({
      stage,
      question: q,
      index,
      selected,
      graded: gradedByIndex[index],
      onSelect: (pickedIndex) => {
        selected = pickedIndex;
        selectedByIndex[index] = pickedIndex;
        nextBtn.disabled = false;
        syncScoreAndEmit();
      },
    });

    backBtn.disabled = index <= 0 && !deps?.hasPrevAutoExperience?.();
    submitBtn.hidden = false;
    submitBtn.disabled = false;
    resultBtn.hidden = true;
    resultBtn.disabled = true;
    nextBtn.disabled = !gradedByIndex[index] && selected === null;
    backBtn.textContent = "Quay lại";

    if (!activeStepView?.hasQuestion) {
      backBtn.disabled = true;
      submitBtn.disabled = false;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      refreshScore();
      progress.paint({ total, index, correct, wrong });
      emitState();
      return;
    }
    refreshScore();
    progress.paint({ total, index, correct, wrong });

    if (!gradedByIndex[index]) nextBtn.textContent = "Tiếp theo";
    else {
      const isLast = index >= questions.length - 1;
      nextBtn.textContent = isLast ? "Xem kết quả" : "Tiếp theo";
    }
    emitState();
  }

  function renderReview() {
    reviewMode = true;
    footer.hidden = true;
    activeStepView = null;
    refreshScore();
    progress.paint({ total, index: Math.max(0, questions.length - 1), correct, wrong });
    renderQuizReviewView({
      stage,
      questions,
      selectedByIndex,
      gradedByIndex,
      reviewFilter,
      correct,
      wrong,
      onFilterChange: (filter) => {
        reviewFilter = filter;
        renderReview();
      },
      onBackToCard: () => {
        reviewMode = false;
        index = Math.max(0, questions.length - 1);
        renderQuestion();
      },
      onCreateOther: () => deps?.onContinueCreate?.("quiz", { preset: "other" }),
      onContinueCreate: (kind, options) => deps?.onContinueCreate?.(kind, options),
    });

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
    if (index <= 0) {
      deps?.onGoBackToPrevExperience?.();
      return;
    }
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
      gradedByIndex[index] = true;
      selectedByIndex[index] = selected;
      refreshScore();
      progress.paint({ total, index, correct, wrong });
      activeStepView?.applyGrading?.(selected);
      const isLast = index >= questions.length - 1;
      nextBtn.textContent = isLast ? "Xem kết quả" : "Tiếp theo";
      if (isLast) {
        resultBtn.hidden = true;
      }
      nextBtn.disabled = false;
      emitState();
      return;
    }

    if (index >= questions.length - 1) {
      reviewFilter = "all";
      renderReview();
      return;
    }
    index += 1;
    renderQuestion();
  });

  resultBtn.addEventListener("click", () => {
    if (reviewMode) return;
    reviewMode = true;
    reviewFilter = "all";
    renderReview();
  });

  submitBtn.addEventListener("click", () => {
    if (reviewMode) return;
    const q = questions[index];
    const finalized = finalizePendingQuizAnswer(selected, q?.correctIndex, gradedByIndex[index]);
    if (finalized) {
      gradedByIndex[index] = true;
      selectedByIndex[index] = finalized.picked;
    }
    reviewFilter = "all";
    renderReview();
  });

  function onGlobalKeydown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (!shell.isConnected) return;
    if (reviewMode) return;
    e.preventDefault();
    if (e.key === "ArrowLeft") {
      if (!backBtn.disabled) backBtn.click();
    } else {
      if (!nextBtn.disabled) nextBtn.click();
    }
  }
  root._kbAbort = () => window.removeEventListener("keydown", onGlobalKeydown, true);
  window.addEventListener("keydown", onGlobalKeydown, true);

  root.appendChild(shell);
  renderQuestion();
}

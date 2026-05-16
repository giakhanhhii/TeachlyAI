import { fetchMockResource } from "../services/mockContentApi.js";
import {
  isAiModeActive,
  incrementPlayCount,
  fetchAiContent,
  fetchAiFileContent,
  withMockFallbackOnAiError,
} from "../services/aiContentApi.js";
import { beginDwell } from "../services/dwellStore.js";
import { getFetch, startFetch } from "../services/backgroundFetchStore.js";
import { createAiLoadingOverlay } from "./experienceLoading.js";
import { renderExperienceAiError } from "./experienceAiError.js";
import { prepareQuizSessionData } from "../services/sessionContentPrep.js";
import { recomputeScore } from "../services/quizService.js";
import { buildExperienceTitle } from "../services/contentTitles.js";
import { finalizePendingQuizAnswer } from "../services/quizSubmitFlow.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { renderQuizStepView } from "./quizStepView.js";
import { renderQuizReviewView } from "./quizReviewView.js";

const BOOKMARK_SVG = `
  <svg class="flash-bookmark-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 3.75h10a1.25 1.25 0 0 1 1.25 1.25v15.22L12 16.6 5.75 20.22V5A1.25 1.25 0 0 1 7 3.75z" />
  </svg>
`;

function buildQuestionFingerprint(question) {
  const id = String(question?.id || "").trim();
  if (id) return `id:${id}`;
  const stem = String(question?.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const options = Array.isArray(question?.options)
    ? question.options.map((option) => String(option || "").replace(/\s+/g, " ").trim().toLowerCase()).join("::")
    : "";
  return `${stem}##${options}`;
}

function buildQuestionKeys(questions) {
  const counts = new Map();
  return (Array.isArray(questions) ? questions : []).map((question) => {
    const fingerprint = buildQuestionFingerprint(question);
    const nextCount = (counts.get(fingerprint) || 0) + 1;
    counts.set(fingerprint, nextCount);
    return `${fingerprint}#${nextCount}`;
  });
}

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
        renderExperienceAiError(root, err, "Không thể xử lý tệp. Vui lòng thử lại.");
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
        if (_bgKey && !getFetch(_bgKey)) {
          startFetch(
            _bgKey,
            withMockFallbackOnAiError(fetchAiContent("quiz", _aiTopic, meta), () => fetchMockResource("quiz")),
          );
        }
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
        try {
          raw = _bgEntry?.status === "done" ? _bgEntry.raw
              : _bgEntry ? await _bgEntry.promise
              : _devSrc === "ai"
                ? await withMockFallbackOnAiError(fetchAiContent("quiz", _aiTopic, meta), () => fetchMockResource("quiz"))
                : await fetchMockResource("quiz");
        } catch (err) {
          loadingState?.remove();
          if (root._genStamp !== _genStamp) return;
          renderExperienceAiError(root, err, "Không thể tạo quiz lúc này. Vui lòng thử lại.");
          return;
        }
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
  const questionKeys = buildQuestionKeys(questions);
  const questionKeySet = new Set(questionKeys);
  if (!isRestore) beginDwell(metaForTitle?.source || metaForTitle?.list || metaForTitle?.topic || titleText, "quiz");

  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  let selected = null;
  let reviewMode = false;
  /** @type {"all"|"wrong"} */
  let reviewFilter = "all";
  const initialBookmarkedQuestionKeys = Array.isArray(initial?.bookmarkedQuestionKeys)
    ? initial.bookmarkedQuestionKeys.map(String)
    : [];
  let bookmarkedQuestionKeys = new Set(initialBookmarkedQuestionKeys.filter((key) => questionKeySet.has(key)));
  let bookmarkFilter = Boolean(initial?.bookmarkFilter) && bookmarkedQuestionKeys.size > 0;
  let lastAllQuestionKey =
    typeof initial?.lastAllQuestionKey === "string" && questionKeySet.has(initial.lastAllQuestionKey)
      ? initial.lastAllQuestionKey
      : questionKeys[index] || "";
  let lastBookmarkQuestionKey =
    typeof initial?.lastBookmarkQuestionKey === "string" && questionKeySet.has(initial.lastBookmarkQuestionKey)
      ? initial.lastBookmarkQuestionKey
      : "";

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz";
  const topBar = createExperienceTopBar({ title: titleText, onShare: deps?.onShareCurrentExperience }).bar;
  topBar.classList.add("exp-topbar-flash");
  topBar.addEventListener("animationend", (event) => {
    if (event.target === topBar) topBar.classList.remove("flash-bookmark-feedback");
  });
  const topBarRight = topBar.querySelector(".exp-topbar-right");
  const bookmarkControl = document.createElement("div");
  bookmarkControl.className = "flash-bookmark-control";
  const bookmarkFilterBtn = document.createElement("button");
  bookmarkFilterBtn.type = "button";
  bookmarkFilterBtn.className = "flash-bookmark-filter-btn";
  bookmarkFilterBtn.innerHTML = `
    ${BOOKMARK_SVG}
    <span class="flash-bookmark-filter-text">Bookmark</span>
    <span class="flash-bookmark-filter-badge">0</span>
  `;
  const bookmarkFilterBadge = bookmarkFilterBtn.querySelector(".flash-bookmark-filter-badge");
  bookmarkControl.appendChild(bookmarkFilterBtn);
  topBarRight?.insertBefore(bookmarkControl, topBarRight.firstChild || null);
  shell.appendChild(topBar);

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
      bookmarkedQuestionKeys: [...bookmarkedQuestionKeys],
      bookmarkFilter,
      lastAllQuestionKey,
      lastBookmarkQuestionKey,
    });
  }

  function clampQuestionIndex(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.min(Math.max(0, Math.floor(Number(value))), Math.max(0, questions.length - 1));
  }

  function getVisibleIndices() {
    if (!bookmarkFilter) return questions.map((_, questionIndex) => questionIndex);
    return questionKeys.reduce((acc, key, questionIndex) => {
      if (bookmarkedQuestionKeys.has(key)) acc.push(questionIndex);
      return acc;
    }, []);
  }

  function resolveNearestVisibleIndex(visibleIndices, preferredIndex) {
    const safePreferred = clampQuestionIndex(preferredIndex);
    if (!visibleIndices.length) return 0;
    if (visibleIndices.includes(safePreferred)) return safePreferred;
    const nextVisible = visibleIndices.find((questionIndex) => questionIndex >= safePreferred);
    return Number.isFinite(nextVisible) ? nextVisible : visibleIndices[visibleIndices.length - 1];
  }

  function syncVisibleState(preferredIndex = index) {
    if (bookmarkFilter && bookmarkedQuestionKeys.size === 0) bookmarkFilter = false;
    const visibleIndices = getVisibleIndices();
    if (!visibleIndices.length) {
      index = 0;
      return { visibleIndices, visibleIndex: -1 };
    }
    index = resolveNearestVisibleIndex(visibleIndices, preferredIndex);
    return { visibleIndices, visibleIndex: visibleIndices.indexOf(index) };
  }

  function triggerTopbarBookmarkFeedback() {
    topBar.classList.remove("flash-bookmark-feedback");
    void topBar.offsetWidth;
    topBar.classList.add("flash-bookmark-feedback");
  }

  function renderBookmarkChrome() {
    const bookmarkCount = bookmarkedQuestionKeys.size;
    const hasBookmarks = bookmarkCount > 0;
    bookmarkControl.classList.toggle("has-bookmarks", hasBookmarks);
    if (!hasBookmarks) bookmarkFilter = false;
    bookmarkFilterBtn.classList.toggle("active", bookmarkFilter);
    bookmarkFilterBtn.disabled = !hasBookmarks;
    if (bookmarkFilterBadge) bookmarkFilterBadge.textContent = String(bookmarkCount);
    bookmarkFilterBtn.title = bookmarkFilter
      ? `Đang xem ${bookmarkCount} câu quiz đã bookmark. Bấm lần nữa để quay lại tất cả.`
      : `Chỉ xem ${bookmarkCount} câu quiz đã bookmark`;
  }

  function restoreAllViewIndex() {
    const resumeAllIndex = lastAllQuestionKey ? questionKeys.indexOf(lastAllQuestionKey) : -1;
    if (resumeAllIndex >= 0) index = resumeAllIndex;
  }

  function paintBookmarkedProgressSegments(visibleIndices) {
    const segments = progress.wrap.querySelectorAll(".exp-progress-seg");
    const currentVisibleIndex = visibleIndices.indexOf(index);
    segments.forEach((segment, segmentIndex) => {
      const baseIndex = visibleIndices[segmentIndex];
      const isBookmarked = Number.isFinite(baseIndex) && bookmarkedQuestionKeys.has(questionKeys[baseIndex]);
      const shouldHighlight = bookmarkFilter ? segmentIndex <= currentVisibleIndex : Boolean(isBookmarked);
      segment.classList.toggle("bookmarked", Boolean(isBookmarked && shouldHighlight));
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
    const { visibleIndices, visibleIndex } = syncVisibleState(index);
    const q = questions[index];
    selected = index < selectedByIndex.length ? selectedByIndex[index] : null;
    if (!bookmarkFilter && questionKeys[index]) lastAllQuestionKey = questionKeys[index];
    if (bookmarkFilter && questionKeys[index]) lastBookmarkQuestionKey = questionKeys[index];
    renderBookmarkChrome();
    activeStepView = renderQuizStepView({
      stage,
      question: q,
      index,
      selected,
      graded: gradedByIndex[index],
      isBookmarked: bookmarkedQuestionKeys.has(questionKeys[index]),
      onToggleBookmark: (event) => {
        event.stopPropagation();
        const key = questionKeys[index];
        const wasBookmarked = bookmarkedQuestionKeys.has(key);
        if (wasBookmarked) bookmarkedQuestionKeys.delete(key);
        else {
          bookmarkedQuestionKeys.add(key);
          triggerTopbarBookmarkFeedback();
        }
        renderQuestion();
      },
      onSelect: (pickedIndex) => {
        selected = pickedIndex;
        selectedByIndex[index] = pickedIndex;
        nextBtn.disabled = false;
        syncScoreAndEmit();
      },
    });

    backBtn.disabled = visibleIndex <= 0 && !deps?.hasPrevAutoExperience?.();
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
      progress.paint({ total: Math.max(1, visibleIndices.length), index: Math.max(0, visibleIndex), correct, wrong });
      paintBookmarkedProgressSegments(visibleIndices);
      emitState();
      return;
    }
    refreshScore();
    progress.paint({
      total: Math.max(1, bookmarkFilter ? visibleIndices.length : total),
      index: Math.max(0, bookmarkFilter ? visibleIndex : index),
      correct,
      wrong,
    });
    paintBookmarkedProgressSegments(bookmarkFilter ? visibleIndices : questions.map((_, questionIndex) => questionIndex));

    const isLastVisible = visibleIndex >= visibleIndices.length - 1;
    if (!gradedByIndex[index]) nextBtn.textContent = "Tiếp theo";
    else {
      const isLast = bookmarkFilter ? isLastVisible : index >= questions.length - 1;
      nextBtn.textContent = isLast ? "Xem kết quả" : "Tiếp theo";
    }
    emitState();
  }

  function renderReview() {
    reviewMode = true;
    footer.hidden = true;
    activeStepView = null;
    refreshScore();
    renderBookmarkChrome();
    const visibleIndices = getVisibleIndices();
    const reviewIndex = bookmarkFilter
      ? Math.max(0, visibleIndices.length - 1)
      : Math.max(0, questions.length - 1);
    progress.paint({
      total: Math.max(1, bookmarkFilter ? visibleIndices.length : total),
      index: reviewIndex,
      correct,
      wrong,
    });
    paintBookmarkedProgressSegments(bookmarkFilter ? visibleIndices : questions.map((_, questionIndex) => questionIndex));
    renderQuizReviewView({
      stage,
      questions,
      selectedByIndex,
      gradedByIndex,
      reviewFilter,
      bookmarkFilter,
      bookmarkedQuestionKeys: [...bookmarkedQuestionKeys],
      questionKeys,
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
      const visibleIndices = getVisibleIndices();
      index = bookmarkFilter
        ? Math.max(0, visibleIndices.length ? visibleIndices[visibleIndices.length - 1] : 0)
        : Math.max(0, questions.length - 1);
      backBtn.textContent = "Quay lại";
      renderQuestion();
      return;
    }
    const visibleIndices = getVisibleIndices();
    const visibleIndex = visibleIndices.indexOf(index);
    if (visibleIndex <= 0) {
      deps?.onGoBackToPrevExperience?.();
      return;
    }
    index = visibleIndices[visibleIndex - 1];
    renderQuestion();
  });

  bookmarkFilterBtn.addEventListener("click", () => {
    if (bookmarkedQuestionKeys.size === 0) return;
    if (bookmarkFilter) {
      bookmarkFilter = false;
      restoreAllViewIndex();
      if (reviewMode) renderReview();
      else renderQuestion();
      return;
    }
    bookmarkFilter = true;
    const resumeBookmarkIndex =
      lastBookmarkQuestionKey && bookmarkedQuestionKeys.has(lastBookmarkQuestionKey)
        ? questionKeys.indexOf(lastBookmarkQuestionKey)
        : -1;
    const firstBookmarkedIndex = questionKeys.findIndex((key) => bookmarkedQuestionKeys.has(key));
    if (resumeBookmarkIndex >= 0) index = resumeBookmarkIndex;
    else if (firstBookmarkedIndex >= 0) index = firstBookmarkedIndex;
    if (reviewMode) renderReview();
    else renderQuestion();
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

    const visibleIndices = getVisibleIndices();
    const visibleIndex = visibleIndices.indexOf(index);
    if (bookmarkFilter) {
      if (visibleIndex >= visibleIndices.length - 1) {
        reviewFilter = "all";
        renderReview();
        return;
      }
      index = visibleIndices[visibleIndex + 1];
      renderQuestion();
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

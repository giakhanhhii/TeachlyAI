import { fetchMockResource } from "../services/mockContentApi.js";
import { isAiModeActive, incrementPlayCount, fetchAiFullsetContent, fetchAiFileContent } from "../services/aiContentApi.js";
import { getFetch } from "../services/backgroundFetchStore.js";
import { prepareQuizSessionData, prepareSlideSessionData, prepareFlashSessionData } from "../services/sessionContentPrep.js";
import { resolveSlideShellFilename } from "../data/slideThemeShellMap.js";
import { fetchSlideShellHtml } from "../slide/slideShellLoad.js";
import { buildSlideDeckSrcdoc, setSlideShellNavMode, syncShellSlideNav } from "../slide/slideShellSrcdoc.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { buildQuizStepOrder, initMixedQuizTracking, recomputeMixedQuizScore, quizCorrectOptionIndex, quizOptionList } from "../services/fullSetMixedService.js";
import { hookFlashSpeechVoicesOnce } from "../services/speechService.js";
import { applyQuizRevealStyles, createStepBadge, renderFlashStep, renderQuizStep, renderSlideStep } from "./fullSetMixedStepView.js";
import { renderFullSetMixedReviewView } from "./fullSetMixedReviewView.js";

function cloneMixedStep(step) {
  if (!step || typeof step !== "object") return null;
  const kind = step.kind === "slide_deck" || step.kind === "quiz" || step.kind === "flash" ? step.kind : "";
  if (!kind) return null;
  if (kind === "slide_deck") {
    const slides = Array.isArray(step.data?.slides) ? step.data.slides.map((slide) => ({ ...slide })) : [];
    return { kind, data: { slides } };
  }
  return { kind, data: step.data && typeof step.data === "object" ? { ...step.data } : step.data };
}

function cloneMixedSteps(steps) {
  return Array.isArray(steps) ? steps.map(cloneMixedStep).filter(Boolean) : [];
}

function buildMixedStepFingerprint(step) {
  if (!step || typeof step !== "object") return "";
  if (step.kind === "slide_deck") {
    const slides = Array.isArray(step.data?.slides) ? step.data.slides : [];
    const firstTitle = String(slides[0]?.title || "").trim().toLowerCase();
    return `slide:${slides.length}:${firstTitle}`;
  }
  if (step.kind === "quiz") {
    const text = String(step.data?.text || "").replace(/\s+/g, " ").trim().toLowerCase();
    return `quiz:${text}`;
  }
  if (step.kind === "flash") {
    const id = String(step.data?.id || "").trim();
    if (id) return `flash:id:${id}`;
    const front = String(step.data?.front || "").trim().toLowerCase();
    const back = String(step.data?.back || "").trim().toLowerCase();
    const phonetic = String(step.data?.phonetic || "").trim().toLowerCase();
    const hint = String(step.data?.hint || "").trim().toLowerCase();
    return `flash:${front}::${back}::${phonetic}::${hint}`;
  }
  return "";
}

function buildMixedStepKeys(steps) {
  const counts = new Map();
  return steps.map((step) => {
    const fingerprint = buildMixedStepFingerprint(step);
    const nextCount = (counts.get(fingerprint) || 0) + 1;
    counts.set(fingerprint, nextCount);
    return `${fingerprint}#${nextCount}`;
  });
}

/**
 * @typedef {{ topic: string, level: string, slides: string, quiz: string, flash: string, extra?: string, slideTemplate?: string }} FullSetMixedSpec
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
  if (typeof root._kbAbort === "function") { root._kbAbort(); delete root._kbAbort; }
  const _genStamp = Symbol();
  root._genStamp = _genStamp;
  root.innerHTML = "";
  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  const spec = bundle.spec || {};
  const topic = spec.topic || "—";
  const slideNotes =
    spec.slideTemplate
      ? `Mẫu slide: ${spec.slideTemplate} | Full set (demo mock)`
      : "Full set (demo mock)";
  const slideMeta = { topic, count: spec.slides, notes: slideNotes };
  const quizMeta = { topic, count: spec.quiz, notes: "Full set (demo mock)" };
  const flashMeta = { source: topic, count: spec.flash, extra: "Full set (demo mock)" };
  const restoredSteps = cloneMixedSteps(initial?.stepsSnapshot);
  let titleText = typeof initial?.title === "string" && initial.title.trim() ? initial.title.trim() : bundle.title || "Full set — ôn tập trộn";
  /** @type {{ kind: "slide_deck"|"quiz"|"flash", data: any }[]} */
  let steps = restoredSteps;
  let slides = [];
  let questions = [];
  let cards = [];
  const _aiTopic = spec.topic && spec.topic !== "—" ? spec.topic : undefined;
  const _isAutoTopic = !_aiTopic || _aiTopic === "(Teachly tự động)";
  const _uploadFile = !steps.length && spec.__pdfFile instanceof File ? spec.__pdfFile : null;
  const _bgFetch = !steps.length && !_uploadFile && spec.__bgFetchId ? getFetch(String(spec.__bgFetchId)) : null;
  let _devSrc = (!steps.length && isAiModeActive("fullset")) ? "ai" : "mock"; /* DEV-ONLY */
  if (!steps.length) {
    let rawSlide, rawQuiz, rawFlash;
    if (_uploadFile || _bgFetch) {
      const _loadEl = (() => { const w = document.createElement("div"); w.className = "ai-loading-overlay"; w.innerHTML = '<div class="ai-loading-ring"></div><span class="ai-loading-label">AI đang đọc tài liệu…</span><span class="ai-loading-tip">Tạo slide, câu hỏi và flashcard từ tài liệu</span>'; root.appendChild(w); return w; })();
      try {
        const aiBundle = _bgFetch
          ? await _bgFetch.promise
          : await fetchAiFileContent("fullset", _uploadFile, { notes: spec.extra || "" });
        rawSlide = aiBundle.slide;
        rawQuiz = aiBundle.quiz;
        rawFlash = aiBundle.flashcard;
      } catch (err) {
        if (root._genStamp !== _genStamp) return;
        _loadEl.remove();
        root.innerHTML = "";
        const box = document.createElement("div"); box.className = "exp-upload-error";
        box.innerHTML = `<p class="exp-upload-error-msg">${String((err && err.message) || "Không thể xử lý tệp. Vui lòng thử lại.")}</p>`;
        root.appendChild(box);
        return;
      }
      if (root._genStamp !== _genStamp) return;
      _loadEl.remove();
      _devSrc = "ai";
    } else if (_devSrc === "ai") {
      const _loadEl = (() => { const w = document.createElement("div"); w.className = "ai-loading-overlay"; w.innerHTML = '<div class="ai-loading-ring"></div><span class="ai-loading-label">AI đang tạo full set…</span><span class="ai-loading-tip">Đang tạo slide, câu hỏi và flashcard</span>'; root.appendChild(w); return w; })();
      const aiBundle = await fetchAiFullsetContent(_aiTopic).catch(async () => {
        const [s, q, f] = await Promise.all([fetchMockResource("slide"), fetchMockResource("quiz"), fetchMockResource("flashcard")]);
        return { slide: s, quiz: q, flashcard: f };
      });
      if (root._genStamp !== _genStamp) return;
      rawSlide = aiBundle.slide;
      rawQuiz = aiBundle.quiz;
      rawFlash = aiBundle.flashcard;
      _loadEl.remove();
    } else {
      [rawSlide, rawQuiz, rawFlash] = await Promise.all([fetchMockResource("slide"), fetchMockResource("quiz"), fetchMockResource("flashcard")]);
      if (root._genStamp !== _genStamp) return;
    }
    incrementPlayCount("fullset");
    const slideData = prepareSlideSessionData(rawSlide, slideMeta);
    const quizData = prepareQuizSessionData(rawQuiz, quizMeta);
    const flashData = prepareFlashSessionData(rawFlash, flashMeta);
    titleText = quizData.title || slideData.title || bundle.title || "Full set — ôn tập trộn";
    slides = Array.isArray(slideData.slides) ? slideData.slides : [];
    questions = Array.isArray(quizData.questions) ? quizData.questions : [];
    cards = Array.isArray(flashData.cards) ? flashData.cards : [];
    steps = [
      ...(slides.length ? [{ kind: /** @type {"slide_deck"} */ ("slide_deck"), data: { slides } }] : []),
      ...questions.map((data) => ({ kind: /** @type {"quiz"} */ ("quiz"), data })),
      ...cards.map((data) => ({ kind: /** @type {"flash"} */ ("flash"), data })),
    ];
  }
  if (!slides.length) {
    const slideDeckStep = steps.find((step) => step?.kind === "slide_deck");
    slides = Array.isArray(slideDeckStep?.data?.slides) ? slideDeckStep.data.slides : [];
  }
  if (!questions.length) questions = steps.filter((step) => step?.kind === "quiz").map((step) => step.data);
  if (!cards.length) cards = steps.filter((step) => step?.kind === "flash").map((step) => step.data);
  const stepKeys = buildMixedStepKeys(steps);
  const stepKeySet = new Set(stepKeys);
  const flashStepIndices = steps.reduce((acc, step, stepIndex) => {
    if (step?.kind === "flash") acc.push(stepIndex);
    return acc;
  }, []);
  const initialBookmarkedStepKeys = Array.isArray(initial?.bookmarkedStepKeys) ? initial.bookmarkedStepKeys.map(String) : [];
  let bookmarkedStepKeys = new Set(initialBookmarkedStepKeys.filter((key) => stepKeySet.has(key)));
  let bookmarkFilter = Boolean(initial?.bookmarkFilter) && bookmarkedStepKeys.size > 0;
  let lastAllStepKey =
    typeof initial?.lastAllStepKey === "string" && stepKeySet.has(initial.lastAllStepKey)
      ? initial.lastAllStepKey
      : stepKeys[0] || "";
  let lastBookmarkStepKey =
    typeof initial?.lastBookmarkStepKey === "string" && stepKeySet.has(initial.lastBookmarkStepKey)
      ? initial.lastBookmarkStepKey
      : "";
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  let reviewMode = Boolean(initial?.reviewMode);
  /** @type {"all"|"wrong"} */
  let reviewFilter = initial?.reviewFilter === "wrong" ? "wrong" : "all";
  /** @type {number | null} */
  let quizSelected = null;
  let quizRevealed = false;
  const { quizSelectedByStep, quizRevealedByStep, quizCountedByStep, quizCorrectByStep } = initMixedQuizTracking(steps.length, initial);
  const { quizStepIndexes, quizOrderByStep } = buildQuizStepOrder(steps);
  index = Math.min(Math.max(0, index), Math.max(0, steps.length - 1));
  /** Tăng mỗi lần render bước — hủy tải iframe slide khi đã chuyển bước. */
  let renderStepGen = 0;
  /** Gỡ listener Trình chiếu/Lướt/toàn màn hình của bước slide trước. */
  let slideUiAbort = null;
  /** Chỉ số slide trong bộ khi bước hiện tại là `slide_deck` (0..n-1). */
  let slideDeckIndex = Number.isFinite(Number(initial?.slideDeckIndex))
    ? Math.floor(Number(initial.slideDeckIndex))
    : 0;
  /** Sau khi iframe slide_deck load xong — dùng cho nút footer / đồng bộ. */
  let activeSlideDeckShell = null;
  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz exp-shell-mixed";
  if (restoredSteps.length === 0) document.dispatchEvent(new CustomEvent("teachly:content-src", { detail: _devSrc }));
  const topBar = createExperienceTopBar({ title: titleText }).bar;
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
    <svg class="flash-bookmark-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.75h10a1.25 1.25 0 0 1 1.25 1.25v15.22L12 16.6 5.75 20.22V5A1.25 1.25 0 0 1 7 3.75z" />
    </svg>
    <span class="flash-bookmark-filter-text">Bookmark</span>
    <span class="flash-bookmark-filter-badge">0</span>
  `;
  const bookmarkFilterBadge = bookmarkFilterBtn.querySelector(".flash-bookmark-filter-badge");
  bookmarkControl.appendChild(bookmarkFilterBtn);
  topBarRight?.insertBefore(bookmarkControl, topBarRight.firstChild || null);
  shell.appendChild(topBar);
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
  function refreshScore() {
    const score = recomputeMixedQuizScore(quizCountedByStep, quizCorrectByStep);
    correct = score.correct;
    wrong = score.wrong;
  }
  function syncScoreAndEmit() {
    refreshScore();
    emitState();
  }
  function clampStepIndex(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.min(Math.max(0, Math.floor(Number(value))), Math.max(0, steps.length - 1));
  }
  function getVisibleStepIndices() {
    if (!bookmarkFilter) return steps.map((_, stepIndex) => stepIndex);
    return flashStepIndices.filter((stepIndex) => bookmarkedStepKeys.has(stepKeys[stepIndex]));
  }
  function resolveNearestVisibleStepIndex(visibleIndices, preferredIndex) {
    const safePreferred = clampStepIndex(preferredIndex);
    if (!visibleIndices.length) return 0;
    if (visibleIndices.includes(safePreferred)) return safePreferred;
    const nextVisible = visibleIndices.find((stepIndex) => stepIndex >= safePreferred);
    return Number.isFinite(nextVisible) ? nextVisible : visibleIndices[visibleIndices.length - 1];
  }
  function syncVisibleState(preferredIndex = index) {
    if (bookmarkFilter && bookmarkedStepKeys.size === 0) bookmarkFilter = false;
    const visibleIndices = getVisibleStepIndices();
    if (!visibleIndices.length) {
      index = 0;
      return { visibleIndices, visibleIndex: -1 };
    }
    index = resolveNearestVisibleStepIndex(visibleIndices, preferredIndex);
    return { visibleIndices, visibleIndex: visibleIndices.indexOf(index) };
  }
  function triggerTopbarBookmarkFeedback() {
    topBar.classList.remove("flash-bookmark-feedback");
    void topBar.offsetWidth;
    topBar.classList.add("flash-bookmark-feedback");
  }
  function restoreAllViewIndex() {
    const resumeAllIndex = lastAllStepKey ? stepKeys.indexOf(lastAllStepKey) : -1;
    if (resumeAllIndex >= 0) index = resumeAllIndex;
  }
  function renderBookmarkChrome() {
    const bookmarkCount = bookmarkedStepKeys.size;
    const hasBookmarks = bookmarkCount > 0;
    bookmarkControl.classList.toggle("has-bookmarks", hasBookmarks);
    if (!hasBookmarks) bookmarkFilter = false;
    bookmarkFilterBtn.classList.toggle("active", bookmarkFilter);
    bookmarkFilterBtn.disabled = !hasBookmarks;
    if (bookmarkFilterBadge) bookmarkFilterBadge.textContent = String(bookmarkCount);
    bookmarkFilterBtn.title = bookmarkFilter
      ? `Đang xem ${bookmarkCount} flashcard đã bookmark. Bấm lần nữa để quay lại tất cả.`
      : `Chỉ xem ${bookmarkCount} flashcard đã bookmark`;
  }
  function paintBookmarkedProgressSegments(visibleIndices) {
    const segments = progress.wrap.querySelectorAll(".exp-progress-seg");
    const currentVisibleIndex = visibleIndices.indexOf(index);
    segments.forEach((segment, segmentIndex) => {
      const baseIndex = visibleIndices[segmentIndex];
      const isBookmarkedFlash =
        Number.isFinite(baseIndex) && steps[baseIndex]?.kind === "flash" && bookmarkedStepKeys.has(stepKeys[baseIndex]);
      const shouldHighlight = bookmarkFilter ? segmentIndex <= currentVisibleIndex : Boolean(isBookmarkedFlash);
      segment.classList.toggle("bookmarked", Boolean(isBookmarkedFlash && shouldHighlight));
    });
  }
  function repaintCurrentProgress() {
    const visibleIndices = bookmarkFilter ? getVisibleStepIndices() : steps.map((_, stepIndex) => stepIndex);
    const visibleTotal = Math.max(1, visibleIndices.length);
    const visibleIndex = Math.max(0, visibleIndices.indexOf(index));
    progress.paint({ total: visibleTotal, index: visibleIndex, correct, wrong });
    paintBookmarkedProgressSegments(visibleIndices);
  }
  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "fullset",
      title: titleText,
      spec: { ...spec },
      total: steps.length,
      index,
      currentStepKey: stepKeys[index] || "",
      quizSelectedByStep: [...quizSelectedByStep],
      quizRevealedByStep: [...quizRevealedByStep],
      quizCountedByStep: [...quizCountedByStep],
      quizCorrectByStep: [...quizCorrectByStep],
      reviewMode,
      reviewFilter,
      correct,
      wrong,
      slideDeckIndex,
      stepsSnapshot: cloneMixedSteps(steps),
      bookmarkedStepKeys: [...bookmarkedStepKeys],
      bookmarkFilter,
      lastAllStepKey,
      lastBookmarkStepKey,
    });
  }
  function exitReviewToLastStep() {
    reviewMode = false;
    const visibleIndices = getVisibleStepIndices();
    index = bookmarkFilter
      ? Math.max(0, visibleIndices.length ? visibleIndices[visibleIndices.length - 1] : 0)
      : Math.max(0, steps.length - 1);
    footer.hidden = false;
    renderStep();
  }
  function renderReview() {
    slideUiAbort?.abort();
    slideUiAbort = null;
    activeSlideDeckShell = null;
    shell.classList.remove("exp-shell-slide");
    stage.className = "exp-stage";
    footer.hidden = true;
    refreshScore();
    renderBookmarkChrome();
    repaintCurrentProgress();
    renderFullSetMixedReviewView({
      stage,
      steps,
      quizStepIndexes,
      quizOrderByStep,
      quizSelectedByStep,
      quizCountedByStep,
      quizCorrectByStep,
      reviewFilter,
      correct,
      wrong,
      onBackToStep: exitReviewToLastStep,
      onCreateOther: () => deps?.onContinueCreate?.("fullset", { preset: "other" }),
      onContinueCreate: () => deps?.onContinueCreate?.("fullset", { preset: "same" }),
      onFilterChange: (filter) => {
        reviewFilter = filter;
        renderReview();
      },
    });
    emitState();
  }
  function refreshMixedNavChrome() {
    const st = steps[index];
    if (bookmarkFilter) {
      const visibleIndices = getVisibleStepIndices();
      const visibleIndex = visibleIndices.indexOf(index);
      backBtn.disabled = visibleIndex <= 0;
      nextBtn.textContent = visibleIndex >= visibleIndices.length - 1 ? "Xem tất cả" : "Tiếp theo";
      return;
    }
    if (st?.kind === "slide_deck") {
      const dl = (st.data.slides || []).length;
      const atFirst = dl === 0 || slideDeckIndex <= 0;
      const atLast = dl > 0 && slideDeckIndex >= dl - 1;
      backBtn.disabled = index <= 0 && atFirst;
      nextBtn.textContent = index >= total - 1 && atLast ? "Tiếp tục tạo" : "Tiếp theo";
    } else {
      backBtn.disabled = index <= 0;
      nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    }
  }
  function renderStep() {
    if (reviewMode) {
      renderReview();
      return;
    }
    slideUiAbort?.abort();
    slideUiAbort = null;
    activeSlideDeckShell = null;
    footer.hidden = false;
    syncVisibleState(index);
    const step = steps[index];
    stage.innerHTML = "";
    renderStepGen += 1;
    const myGen = renderStepGen;
    backBtn.textContent = "Quay lại";
    quizSelected = quizSelectedByStep[index] ?? null;
    quizRevealed = !!quizRevealedByStep[index];
    if (!bookmarkFilter && stepKeys[index]) lastAllStepKey = stepKeys[index];
    if (bookmarkFilter && stepKeys[index]) lastBookmarkStepKey = stepKeys[index];
    refreshScore();
    renderBookmarkChrome();
    if (!step) {
      shell.classList.remove("exp-shell-slide");
      stage.className = "exp-stage";
      stage.innerHTML = `<p class="exp-empty">Không có học liệu trong bộ Full set.</p>`;
      backBtn.disabled = true;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      repaintCurrentProgress();
      return;
    }
    stage.appendChild(createStepBadge(step.kind));
    if (step.kind === "slide_deck") {
      shell.classList.add("exp-shell-slide");
      stage.className = "exp-stage exp-slide-stage";
      nextBtn.disabled = true;
      slideUiAbort = new AbortController();
      const uiSignal = slideUiAbort.signal;

      const deckSlides = Array.isArray(step.data?.slides) ? step.data.slides : [];
      if (deckSlides.length) {
        slideDeckIndex = Math.min(Math.max(0, slideDeckIndex), deckSlides.length - 1);
      } else {
        slideDeckIndex = 0;
      }

      const host = document.createElement("div");
      host.className = "exp-mixed-slide-host";

      if (!deckSlides.length) {
        host.innerHTML = `<p class="exp-empty">Không có slide trong bộ.</p>`;
        stage.appendChild(host);
        nextBtn.disabled = false;
        refreshMixedNavChrome();
      } else {
        const loading = document.createElement("p");
        loading.className = "exp-meta-line";
        loading.textContent = "Đang tải giao diện slide…";

        const deckHint = document.createElement("p");
        deckHint.className = "exp-meta-line";
        function paintDeckHint() {
          deckHint.textContent = `Trong bộ: ${slideDeckIndex + 1} / ${deckSlides.length}`;
        }
        paintDeckHint();

        const modeBar = document.createElement("div");
        modeBar.className = "exp-slide-mode-bar";
        modeBar.hidden = true;
        const modePresBtn = document.createElement("button");
        modePresBtn.type = "button";
        modePresBtn.className = "exp-slide-mode-btn";
        modePresBtn.textContent = "Trình chiếu";
        modePresBtn.setAttribute("aria-pressed", "true");
        const modeScrollBtn = document.createElement("button");
        modeScrollBtn.type = "button";
        modeScrollBtn.className = "exp-slide-mode-btn";
        modeScrollBtn.textContent = "Lướt";
        modeScrollBtn.setAttribute("aria-pressed", "false");
        modeBar.append(modePresBtn, modeScrollBtn);

        const viewport = document.createElement("div");
        viewport.className = "exp-slide-viewport";

        const fsBtn = document.createElement("button");
        fsBtn.type = "button";
        fsBtn.className = "exp-slide-fs-btn";
        fsBtn.setAttribute("aria-label", "Toàn màn hình");
        fsBtn.title = "Toàn màn hình (chế độ Trình chiếu)";
        fsBtn.hidden = true;
        fsBtn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10-18h3a2 2 0 0 1 2 2v3M3 8V5a2 2 0 0 1 2-2h3"/></svg>';

        const prevArrow = document.createElement("button");
        prevArrow.type = "button";
        prevArrow.className = "exp-slide-arrow exp-slide-arrow--prev";
        prevArrow.setAttribute("aria-label", "Slide trước");
        prevArrow.textContent = "←";
        prevArrow.hidden = true;

        const nextArrow = document.createElement("button");
        nextArrow.type = "button";
        nextArrow.className = "exp-slide-arrow exp-slide-arrow--next";
        nextArrow.setAttribute("aria-label", "Slide sau");
        nextArrow.textContent = "→";
        nextArrow.hidden = true;

        const iframe = document.createElement("iframe");
        iframe.className = "exp-slide-shell-iframe";
        iframe.setAttribute("title", "Bộ slide");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.style.border = "0";
        iframe.style.display = "none";
        const iframeFrame = document.createElement("div");
        iframeFrame.className = "exp-slide-shell-frame";

        iframeFrame.appendChild(iframe);
        viewport.append(iframeFrame, prevArrow, nextArrow, fsBtn);
        host.append(loading, deckHint, modeBar, viewport);
        stage.appendChild(host);

        let shellReady = false;
        /** @type {"presentation" | "scroll"} */
        let viewMode = "presentation";
        let suppressArrowNavUntil = 0;
        let sharedOuterScrollTop = root.scrollTop;
        let sharedDeckScrollTop = 0;
        let sharedDeckScrollRatio = 0;

        function readDeckScrollState() {
          const doc = iframe.contentDocument;
          if (!doc) return { top: sharedDeckScrollTop, ratio: sharedDeckScrollRatio };
          const scrollingEl = doc.scrollingElement || doc.documentElement || doc.body;
          const top = Math.max(
            Number(scrollingEl?.scrollTop) || 0,
            Number(doc.documentElement?.scrollTop) || 0,
            Number(doc.body?.scrollTop) || 0,
            0,
          );
          const viewportHeight = Math.max(
            Number(scrollingEl?.clientHeight) || 0,
            Number(doc.documentElement?.clientHeight) || 0,
            Number(doc.body?.clientHeight) || 0,
            Number(iframe.contentWindow?.innerHeight) || 0,
            0,
          );
          const scrollHeight = Math.max(
            Number(scrollingEl?.scrollHeight) || 0,
            Number(doc.documentElement?.scrollHeight) || 0,
            Number(doc.body?.scrollHeight) || 0,
            0,
          );
          const max = Math.max(0, scrollHeight - viewportHeight);
          sharedDeckScrollTop = top;
          sharedDeckScrollRatio = max > 0 ? top / max : 0;
          return { top: sharedDeckScrollTop, ratio: sharedDeckScrollRatio };
        }

        function restoreOuterScrollSoon() {
          const restore = () => {
            root.scrollTop = sharedOuterScrollTop;
          };
          restore();
          requestAnimationFrame(restore);
        }

        root.addEventListener(
          "scroll",
          () => {
            sharedOuterScrollTop = root.scrollTop;
          },
          { passive: true, signal: uiSignal },
        );

        function syncViewModeToIframe() {
          if (!shellReady) return;
          setSlideShellNavMode(
            iframe,
            viewMode === "scroll" ? "scroll" : "active",
            slideDeckIndex,
            viewMode === "presentation" ? readDeckScrollState() : undefined,
          );
        }

        window.addEventListener(
          "resize",
          () => {
            if (!shellReady) return;
            syncViewModeToIframe();
            paintSlideChrome();
          },
          { passive: true, signal: uiSignal },
        );

        function paintSlideChrome() {
          const pres = viewMode === "presentation";
          modePresBtn.setAttribute("aria-pressed", pres ? "true" : "false");
          modeScrollBtn.setAttribute("aria-pressed", pres ? "false" : "true");
          modePresBtn.classList.toggle("is-selected", pres);
          modeScrollBtn.classList.toggle("is-selected", !pres);
          prevArrow.disabled = slideDeckIndex <= 0;
          nextArrow.disabled = slideDeckIndex >= deckSlides.length - 1;
          prevArrow.hidden = !pres || !shellReady;
          nextArrow.hidden = !pres || !shellReady;
          fsBtn.hidden = !pres || !shellReady;
          modeBar.hidden = !shellReady;
          paintDeckHint();
        }

        function applyViewMode(next) {
          if (isFauxFs()) viewport.classList.remove("exp-slide-viewport--faux-fs");
          viewMode = next;
          syncViewModeToIframe();
          paintSlideChrome();
        }

        function bumpDeck(delta) {
          const next = slideDeckIndex + delta;
          if (next < 0 || next >= deckSlides.length) return;
          slideDeckIndex = next;
          syncViewModeToIframe();
          syncShellSlideNav(iframe, slideDeckIndex, readDeckScrollState());
          paintSlideChrome();
          emitState();
          restoreOuterScrollSoon();
          refreshMixedNavChrome();
        }

        modePresBtn.addEventListener("click", () => applyViewMode("presentation"), { signal: uiSignal });
        modeScrollBtn.addEventListener("click", () => applyViewMode("scroll"), { signal: uiSignal });

        prevArrow.addEventListener("click", () => bumpDeck(-1), { signal: uiSignal });
        nextArrow.addEventListener("click", () => bumpDeck(1), { signal: uiSignal });

        function isFauxFs() {
          return viewport.classList.contains("exp-slide-viewport--faux-fs");
        }

        function paintFsBtn() {
          const fs = isFauxFs();
          fsBtn.setAttribute("aria-label", fs ? "Thoát toàn màn hình" : "Toàn màn hình");
          fsBtn.title = fs ? "Thoát toàn màn hình" : "Toàn màn hình (chế độ Trình chiếu)";
          fsBtn.innerHTML = fs
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10-18h3a2 2 0 0 1 2 2v3M3 8V5a2 2 0 0 1 2-2h3"/></svg>';
        }

        fsBtn.addEventListener(
          "click",
          () => {
            if (!shellReady || viewMode !== "presentation") return;
            suppressArrowNavUntil = performance.now() + 320;
            viewport.classList.toggle("exp-slide-viewport--faux-fs");
            paintFsBtn();
            syncViewModeToIframe();
          },
          { signal: uiSignal },
        );

        function onFsChange() {
          suppressArrowNavUntil = performance.now() + 320;
          paintFsBtn();
        }
        document.addEventListener("fullscreenchange", onFsChange, { signal: uiSignal });


        (async () => {
          try {
            const file = resolveSlideShellFilename(spec.slideTemplate);
            const html = await fetchSlideShellHtml(file);
            const srcdoc = buildSlideDeckSrcdoc(html, deckSlides, {
              ...slideMeta,
              slideTemplate: String(spec.slideTemplate || ""),
              shellYear: String(new Date().getFullYear()),
              slideNavMode: "active",
            });
            if (myGen !== renderStepGen) return;
            const loadPromise = new Promise((resolve) => {
              iframe.addEventListener("load", resolve, { once: true });
            });
            iframe.srcdoc = srcdoc;
            await Promise.race([
              loadPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("iframe load timeout")), 6000)),
            ]);
            if (myGen !== renderStepGen) return;
            loading.remove();
            // Set correct height BEFORE showing the iframe so 100vh inside = 720px from the first paint.
            // Without this, CSS aspect-ratio:16/9 at < 1280px width gives a short iframe (e.g. 405px),
            // causing the 720px slide to be clipped symmetrically at top and bottom.
            iframe.style.height = "720px";
            iframe.style.aspectRatio = "auto";
            iframe.style.display = "";
            shellReady = true;
            const captureDeckScroll = () => {
              if (!shellReady || viewMode !== "presentation") return;
              readDeckScrollState();
            };
            iframe.contentWindow?.addEventListener("scroll", captureDeckScroll, {
              passive: true,
              signal: uiSignal,
            });
            iframe.contentDocument?.addEventListener("scroll", captureDeckScroll, {
              passive: true,
              capture: true,
              signal: uiSignal,
            });
            iframe.contentWindow?.addEventListener("keydown", onGlobalKeydown, { capture: true, signal: uiSignal });
            viewMode = "presentation";
            syncViewModeToIframe();
            syncShellSlideNav(iframe, slideDeckIndex, readDeckScrollState());
            paintSlideChrome();
            activeSlideDeckShell = {
              iframe,
              bumpDeck,
              syncViewModeToIframe,
              paintChrome: paintSlideChrome,
              deckLen: deckSlides.length,
              getViewMode: () => viewMode,
              getSuppressNavUntil: () => suppressArrowNavUntil,
            };
            nextBtn.disabled = false;
            refreshMixedNavChrome();
          } catch (err) {
            console.warn("[fullset-mixed] slide shell fallback", err);
            if (myGen !== renderStepGen) return;
            host.remove();
            slideUiAbort?.abort();
            slideUiAbort = null;
            shell.classList.remove("exp-shell-slide");
            stage.className = "exp-stage";
            deckSlides.forEach((s) => {
              renderSlideStep(stage, s);
            });
            nextBtn.disabled = false;
            refreshMixedNavChrome();
          }
        })();
      }
    } else if (step.kind === "flash") {
      shell.classList.remove("exp-shell-slide");
      stage.className = "exp-stage";
      renderFlashStep(stage, step.data, {
        isBookmarked: bookmarkedStepKeys.has(stepKeys[index]),
        onToggleBookmark: (event) => {
          event.stopPropagation();
          const key = stepKeys[index];
          const wasBookmarked = bookmarkedStepKeys.has(key);
          if (wasBookmarked) bookmarkedStepKeys.delete(key);
          else {
            bookmarkedStepKeys.add(key);
            triggerTopbarBookmarkFeedback();
          }
          renderStep();
        },
      });
      nextBtn.disabled = false;
    } else {
      shell.classList.remove("exp-shell-slide");
      stage.className = "exp-stage";
      const quizUi = renderQuizStep(stage, {
        index,
        question: step.data,
        selected: quizSelected,
        revealed: !!quizRevealedByStep[index],
        onPick: (pickedIndex) => {
          quizSelected = pickedIndex;
          quizSelectedByStep[index] = pickedIndex;
          nextBtn.disabled = false;
          syncScoreAndEmit();
        },
      });
      nextBtn.disabled = !quizUi.canProceed;
    }
    repaintCurrentProgress();
    refreshMixedNavChrome();
    emitState();
  }
  bookmarkFilterBtn.addEventListener("click", () => {
    if (bookmarkedStepKeys.size === 0) return;
    if (bookmarkFilter) {
      bookmarkFilter = false;
      restoreAllViewIndex();
      renderStep();
      return;
    }
    bookmarkFilter = true;
    const resumeBookmarkIndex =
      lastBookmarkStepKey && bookmarkedStepKeys.has(lastBookmarkStepKey) ? stepKeys.indexOf(lastBookmarkStepKey) : -1;
    const firstBookmarkedIndex = flashStepIndices.find((stepIndex) => bookmarkedStepKeys.has(stepKeys[stepIndex]));
    if (resumeBookmarkIndex >= 0) index = resumeBookmarkIndex;
    else if (Number.isFinite(firstBookmarkedIndex)) index = firstBookmarkedIndex;
    renderStep();
  });
  nextBtn.addEventListener("click", () => {
    if (reviewMode) {
      void Promise.resolve(deps?.onContinueCreate?.("fullset"));
      return;
    }
    const visibleIndices = getVisibleStepIndices();
    const visibleIndex = visibleIndices.indexOf(index);
    if (bookmarkFilter) {
      if (visibleIndex < visibleIndices.length - 1) {
        index = visibleIndices[visibleIndex + 1];
      } else {
        bookmarkFilter = false;
        restoreAllViewIndex();
      }
      renderStep();
      return;
    }
    const step = steps[index];
    if (!step) return;
    if (step.kind === "slide_deck") {
      const ds = step.data.slides || [];
      if (!ds.length) return;
      if (slideDeckIndex < ds.length - 1) {
        if (!activeSlideDeckShell) return;
        activeSlideDeckShell.bumpDeck(1);
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
        refreshScore();
        repaintCurrentProgress();
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
    const visibleIndices = getVisibleStepIndices();
    const visibleIndex = visibleIndices.indexOf(index);
    if (bookmarkFilter) {
      if (visibleIndex <= 0) return;
      index = visibleIndices[visibleIndex - 1];
      renderStep();
      return;
    }
    const step = steps[index];
    if (step?.kind === "slide_deck" && slideDeckIndex > 0) {
      if (!activeSlideDeckShell) return;
      activeSlideDeckShell.bumpDeck(-1);
      return;
    }
    if (index <= 0) return;
    index -= 1;
    renderStep();
  });
  function onGlobalKeydown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (!shell.isConnected) return;
    if (reviewMode) return;
    const step = steps[index];
    if (!step) return;
    if (step.kind === "slide_deck") {
      if (!activeSlideDeckShell) return;
      if (activeSlideDeckShell.getViewMode() !== "presentation") return;
      if (performance.now() < activeSlideDeckShell.getSuppressNavUntil()) return;
      e.preventDefault();
      if (e.key === "ArrowLeft") {
        if (slideDeckIndex <= 0) {
          if (!backBtn.disabled) backBtn.click();
        } else {
          activeSlideDeckShell.bumpDeck(-1);
        }
      } else {
        if (slideDeckIndex >= activeSlideDeckShell.deckLen - 1) {
          if (!nextBtn.disabled) nextBtn.click();
        } else {
          activeSlideDeckShell.bumpDeck(1);
        }
      }
      return;
    }
    e.preventDefault();
    if (e.key === "ArrowLeft") {
      if (!backBtn.disabled) backBtn.click();
    } else {
      if (!nextBtn.disabled) nextBtn.click();
    }
  }
  root._kbAbort = () => window.removeEventListener("keydown", onGlobalKeydown, true);
  window.addEventListener("keydown", onGlobalKeydown, true);

  shell.appendChild(progress.wrap);
  shell.appendChild(stage);
  shell.appendChild(footer);
  root.appendChild(shell);
  renderStep();
}

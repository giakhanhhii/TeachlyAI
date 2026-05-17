import { fetchMockResource } from "../services/mockContentApi.js";
import {
  isAiModeActive,
  incrementPlayCount,
  fetchAiFullsetContent,
  fetchAiFileContent,
  withMockFallbackOnAiError,
} from "../services/aiContentApi.js";
import { beginDwell } from "../services/dwellStore.js";
import { getFetch, startFetch } from "../services/backgroundFetchStore.js";
import { createAiLoadingOverlay } from "./experienceLoading.js";
import { isUploadLimitError, renderExperienceAiError } from "./experienceAiError.js";
import { buildExperienceTitle } from "../services/contentTitles.js";
import { prepareQuizSessionData, prepareSlideSessionData, prepareFlashSessionData } from "../services/sessionContentPrep.js";
import { resolveSlideShellFilename } from "../data/slideThemeShellMap.js";
import { fetchSlideShellHtml } from "../slide/slideShellLoad.js";
import { buildSlideDeckSrcdoc, setSlideShellNavMode, syncShellSlideNav, setSlideVisualEditMode } from "../slide/slideShellSrcdoc.js";
import { exportSlideDeckToPdf, triggerPdfDownload } from "../services/slideExportApi.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import {
  buildQuizStepOrder,
  initMixedQuizTracking,
  recomputeMixedQuizScore,
  quizCorrectOptionIndex,
  quizOptionList,
  resolveMixedSlideDeckArrowAction,
} from "../services/fullSetMixedService.js";
import { finalizePendingQuizAnswer, findNextStepIndexByKind } from "../services/quizSubmitFlow.js";
import { hookFlashSpeechVoicesOnce } from "../services/speechService.js";
import { resolveFullsetContentSource } from "../services/fullsetAutoMode.js";
import { applyQuizRevealStyles, createStepBadge, renderFlashStep, renderQuizStep, renderSlideStep } from "./fullSetMixedStepView.js";
import { renderFullSetMixedReviewView } from "./fullSetMixedReviewView.js";
import { openSlideImagePicker } from "./slideExperienceImagePicker.js";
import { hydrateFlashCardPronunciations } from "../services/flashPronunciationService.js";

function buildPdfDownloadLabel(title) {
  return title && String(title).trim() ? `${String(title).trim()}.pdf` : "teachly-slides.pdf";
}

function serializeSlideExportDocument(doc) {
  const exportDoc = doc.cloneNode(true);
  if (!(exportDoc instanceof Document) || !exportDoc.documentElement) return "";

  exportDoc.body?.classList.remove("slide-visual-edit-on");
  exportDoc
    .querySelectorAll(
      'style[data-slide-visual-editor], script[data-slide-visual-editor], .slide-visual-edit-toolbar, .slide-visual-edit-handles, [data-edit-flow-spacer="1"]',
    )
    .forEach((node) => node.remove());
  exportDoc.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
  exportDoc
    .querySelectorAll("[data-edit-selected], [data-edit-text-active], [data-edit-flow-spacer], [spellcheck]")
    .forEach((node) => {
      node.removeAttribute("data-edit-selected");
      node.removeAttribute("data-edit-text-active");
      node.removeAttribute("data-edit-flow-spacer");
      node.removeAttribute("spellcheck");
    });
  const master = exportDoc.querySelector("#slides-master-container");
  if (master) {
    master.setAttribute("data-nav-mode", "scroll");
  }
  exportDoc.querySelectorAll(".shell-slide-instance").forEach((node) => node.classList.add("active"));
  return `<!DOCTYPE html>\n${exportDoc.documentElement.outerHTML}`;
}

function getMixedStepRenderCount(step) {
  if (step?.kind === "slide_deck") {
    const slideCount = Array.isArray(step.data?.slides) ? step.data.slides.length : 0;
    return Math.max(0, slideCount);
  }
  return step ? 1 : 0;
}

function buildMixedProgressSlots(steps) {
  const slots = [];
  steps.forEach((step, stepIndex) => {
    const count = getMixedStepRenderCount(step);
    if (step?.kind === "slide_deck") {
      for (let i = 0; i < count; i += 1) {
        slots.push({ stepIndex, slideIndex: i });
      }
      return;
    }
    if (count > 0) slots.push({ stepIndex, slideIndex: 0 });
  });
  return slots;
}

function resolveMixedProgressIndex(steps, stepIndex, slideDeckIndex) {
  let logicalIndex = 0;
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const count = getMixedStepRenderCount(step);
    if (i === stepIndex) {
      if (step?.kind === "slide_deck") {
        return logicalIndex + Math.min(Math.max(0, slideDeckIndex), Math.max(0, count - 1));
      }
      return logicalIndex;
    }
    logicalIndex += count;
  }
  return 0;
}

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
  const globalUiAbort = new AbortController();
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
  let titleText = buildExperienceTitle(
    "fullset",
    spec.topic,
    typeof initial?.title === "string" ? initial.title : "",
    bundle.title,
  );
  /** @type {{ kind: "slide_deck"|"quiz"|"flash", data: any }[]} */
  let steps = restoredSteps;
  let slides = [];
  let questions = [];
  let cards = [];
  if (steps.length) {
    await hydrateFlashCardPronunciations(
      steps.filter((step) => step?.kind === "flash").map((step) => step.data),
    );
  }
  const _aiTopic = spec.topic && spec.topic !== "—" ? spec.topic : undefined;
  const _uploadFile = !steps.length && spec.__pdfFile instanceof File ? spec.__pdfFile : null;
  const _bgFetch = !steps.length && !_uploadFile && spec.__bgFetchId ? getFetch(String(spec.__bgFetchId)) : null;
  const _forceAi = spec.__forceAi === "1";
  const _forceMock = spec.__forceMock === "1";
  const _isAutoMode = spec.__autoMode === "1";
  const _isAutoTopic = !_aiTopic || _aiTopic === "(Teachly tự động)" || _isAutoMode;
  let _devSrc = resolveFullsetContentSource({
    forceAi: _forceAi,
    forceMock: _forceMock,
    autoMode: _isAutoMode,
    aiModeActive: isAiModeActive("fullset"),
    topic: _isAutoTopic ? "" : _aiTopic,
  }); /* DEV-ONLY */
  if (!steps.length) {
    let rawSlide, rawQuiz, rawFlash;
    if (_uploadFile || _bgFetch) {
      const loadingState = createAiLoadingOverlay(root, {
        label: "AI đang đọc tài liệu…",
        tip: "Tạo slide, câu hỏi và flashcard từ tài liệu.",
        estimatedSeconds: 35,
        startedAt: _bgFetch?.startedAt,
      });
      try {
        const aiBundle = _bgFetch
          ? await _bgFetch.promise
          : await fetchAiFileContent("fullset", _uploadFile, { notes: spec.extra || "" });
        rawSlide = aiBundle.slide;
        rawQuiz = aiBundle.quiz;
        rawFlash = aiBundle.flashcard;
      } catch (err) {
        loadingState.remove();
        if (root._genStamp !== _genStamp) return;
        const rejected = isUploadLimitError(err)
          ? await Promise.resolve(
              deps?.onUploadRejected?.({
                kind: "fullset",
                experienceId: String(spec.__experienceId || ""),
                error: err,
              }),
            )
          : false;
        if (rejected) return;
        renderExperienceAiError(root, err, "Không thể xử lý tệp. Vui lòng thử lại.");
        return;
      }
      if (root._genStamp !== _genStamp) return;
      loadingState.remove();
      _devSrc = "ai";
    } else if (_devSrc === "ai") {
      const _bgKey = spec.__experienceId ? `gen_${spec.__experienceId}` : null;
      if (_bgKey && !getFetch(_bgKey)) {
        startFetch(
          _bgKey,
          withMockFallbackOnAiError(fetchAiFullsetContent(_aiTopic, spec), async () => {
            const [s, q, f] = await Promise.all([
              fetchMockResource("slide"),
              fetchMockResource("quiz"),
              fetchMockResource("flashcard"),
            ]);
            return { slide: s, quiz: q, flashcard: f };
          }),
        );
      }
      const _bgEntryFs = _bgKey ? getFetch(_bgKey) : null;
      const loadingState = _bgEntryFs?.status !== "done"
        ? createAiLoadingOverlay(root, {
            label: "AI đang tạo full set…",
            tip: "Đang tạo slide, câu hỏi và flashcard.",
            estimatedSeconds: 30,
            startedAt: _bgEntryFs?.startedAt,
          })
        : null;
      let aiBundle;
      try {
        if (_bgEntryFs?.status === "done") {
          aiBundle = _bgEntryFs.raw;
        } else if (_bgEntryFs) {
          aiBundle = await _bgEntryFs.promise;
        } else {
          aiBundle = await withMockFallbackOnAiError(fetchAiFullsetContent(_aiTopic, spec), async () => {
            const [s, q, f] = await Promise.all([
              fetchMockResource("slide"),
              fetchMockResource("quiz"),
              fetchMockResource("flashcard"),
            ]);
            return { slide: s, quiz: q, flashcard: f };
          });
        }
      } catch (err) {
        loadingState?.remove();
        if (root._genStamp !== _genStamp) return;
        renderExperienceAiError(root, err, "Không thể tạo full set lúc này. Vui lòng thử lại.");
        return;
      }
      loadingState?.remove();
      if (root._genStamp !== _genStamp) return;
      rawSlide = aiBundle.slide;
      rawQuiz = aiBundle.quiz;
      rawFlash = aiBundle.flashcard;
    } else {
      const loadingState = createAiLoadingOverlay(root, {
        label: "Đang tải nội dung…",
        tip: "Vui lòng đợi trong giây lát.",
        estimatedSeconds: 8,
      });
      [rawSlide, rawQuiz, rawFlash] = await Promise.all([fetchMockResource("slide"), fetchMockResource("quiz"), fetchMockResource("flashcard")]);
      if (root._genStamp !== _genStamp) return;
      loadingState.remove();
    }
    incrementPlayCount("fullset");
    const slideData = prepareSlideSessionData(rawSlide, slideMeta);
    const quizData = prepareQuizSessionData(rawQuiz, quizMeta);
    const flashData = prepareFlashSessionData(rawFlash, flashMeta);
    titleText = buildExperienceTitle("fullset", spec.topic, quizData.title, slideData.title, bundle.title);
    slides = Array.isArray(slideData.slides) ? slideData.slides : [];
    questions = Array.isArray(quizData.questions) ? quizData.questions : [];
    cards = Array.isArray(flashData.cards) ? flashData.cards : [];
    await hydrateFlashCardPronunciations(cards);
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
  const bookmarkableStepIndices = steps.reduce((acc, step, stepIndex) => {
    if (step?.kind === "flash" || step?.kind === "quiz") acc.push(stepIndex);
    return acc;
  }, []);
  const initialBookmarkedStepKeys = Array.isArray(initial?.bookmarkedStepKeys) ? initial.bookmarkedStepKeys.map(String) : [];
  let bookmarkedStepKeys = new Set(initialBookmarkedStepKeys.filter((key) => stepKeySet.has(key)));
  let bookmarkFilter = Boolean(initial?.bookmarkFilter) && bookmarkedStepKeys.size > 0;
  /** @type {"all"|"quiz"|"flash"} */
  let bookmarkFilterKind =
    initial?.bookmarkFilterKind === "quiz" || initial?.bookmarkFilterKind === "flash"
      ? initial.bookmarkFilterKind
      : "all";
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
  let exportInFlight = false;
  let lastRenderedSlideSrcdoc = "";
  /** @type {Promise<string> | null} */
  let exportSrcdocPrefetch = null;
  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz exp-shell-mixed";
  if (restoredSteps.length === 0) {
    document.dispatchEvent(new CustomEvent("teachly:content-src", { detail: _devSrc }));
    beginDwell(spec?.topic || titleText, "fullset");
  }
  const topBarChrome = createExperienceTopBar({
    title: titleText,
    onShare: deps?.onShareCurrentExperience,
    actionButton: {
      label: "Tải xuống PDF",
      title: "Tải toàn bộ slide của fullset dưới dạng PDF",
      ariaLabel: "Tải toàn bộ slide của fullset dưới dạng PDF",
      icon: "download",
      onClick: () => {
        void handlePdfDownload();
      },
    },
  });
  const topBar = topBarChrome.bar;
  const exportBtn = topBarChrome.actionButton;
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
  const bookmarkMenu = document.createElement("div");
  bookmarkMenu.className = "flash-bookmark-menu";
  bookmarkControl.appendChild(bookmarkMenu);
  bookmarkControl.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.addEventListener("click", () => {
    closeBookmarkMenu();
  }, { signal: globalUiAbort.signal });
  topBarRight?.insertBefore(bookmarkControl, topBarRight.firstChild || null);
  shell.appendChild(topBar);

  function setExportButtonBusy(busy) {
    if (!exportBtn) return;
    exportBtn.disabled = busy;
    exportBtn.setAttribute("aria-busy", busy ? "true" : "false");
    const label = exportBtn.querySelector("span");
    if (label) {
      label.textContent = busy ? " Đang tạo PDF..." : " Tải xuống PDF";
    }
  }

  function startExportSrcdocPrefetch() {
    if (lastRenderedSlideSrcdoc) return Promise.resolve(lastRenderedSlideSrcdoc);
    if (exportSrcdocPrefetch) return exportSrcdocPrefetch;
    if (!slides.length) return Promise.resolve("");
    exportSrcdocPrefetch = (async () => {
      try {
        const file = resolveSlideShellFilename(spec.slideTemplate);
        const html = await fetchSlideShellHtml(file);
        const sessionShellSubtitle = (() => {
          const auto = "(Teachly tự động)";
          const tt = String(topic || "").replace(/\s+/g, " ").trim();
          if (tt && tt !== auto && tt !== "—") return tt;
          return String(titleText || "").replace(/\s+/g, " ").trim();
        })();
        const srcdoc = buildSlideDeckSrcdoc(html, slides, {
          ...slideMeta,
          deckTitle: String(titleText || "").trim(),
          sessionShellSubtitle,
          slideTemplate: String(spec.slideTemplate || ""),
          shellYear: String(new Date().getFullYear()),
          slideNavMode: "scroll",
        });
        lastRenderedSlideSrcdoc = srcdoc;
        return srcdoc;
      } finally {
        exportSrcdocPrefetch = null;
      }
    })();
    return exportSrcdocPrefetch;
  }

  async function buildFullsetExportSrcdoc() {
    const iframeDoc = activeSlideDeckShell?.iframe?.contentDocument;
    if (iframeDoc?.documentElement) {
      const current = serializeSlideExportDocument(iframeDoc);
      if (current) return current;
    }
    if (lastRenderedSlideSrcdoc) return lastRenderedSlideSrcdoc;
    return startExportSrcdocPrefetch();
  }

  // Prefetch export srcdoc ngay khi view mount để Tải PDF instant
  // dù user đang ở tab quiz/flashcard (chưa mount slide iframe).
  void startExportSrcdocPrefetch().catch((err) => {
    console.warn("[fullset-export] prefetch failed", err);
  });

  async function handlePdfDownload() {
    if (exportInFlight) return;
    if (!slides.length) {
      window.alert("Fullset này chưa có slide để tải xuống.");
      return;
    }

    exportInFlight = true;
    setExportButtonBusy(true);
    try {
      const srcdoc = await buildFullsetExportSrcdoc();
      if (!srcdoc) {
        window.alert("Chưa sẵn sàng để tải PDF. Hãy đợi slide tải xong rồi thử lại.");
        return;
      }
      const { blob, fileName } = await exportSlideDeckToPdf({
        title: titleText,
        srcdoc,
      });
      triggerPdfDownload(blob, fileName || buildPdfDownloadLabel(titleText));
    } catch (err) {
      console.error("[fullset-export] pdf export failed", err);
      window.alert(err instanceof Error ? err.message : "Không thể tạo PDF lúc này.");
    } finally {
      exportInFlight = false;
      setExportButtonBusy(false);
    }
  }

  const total = Math.max(1, steps.length);
  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  const stage = document.createElement("div");
  stage.className = "exp-stage";
  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const submitBtn = createPrimaryNavButton({ label: "Nộp bài", disabled: false });
  submitBtn.classList.add("exp-submit-btn");
  submitBtn.hidden = true;
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(backBtn);
  footer.appendChild(submitBtn);
  footer.appendChild(nextBtn);
  let bookmarkMenuOpen = false;
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
  function getBookmarkedStepIndexesByKind(kind = "all") {
    if (kind === "quiz") return quizStepIndexes.filter((stepIndex) => bookmarkedStepKeys.has(stepKeys[stepIndex]));
    if (kind === "flash") return flashStepIndices.filter((stepIndex) => bookmarkedStepKeys.has(stepKeys[stepIndex]));
    return bookmarkableStepIndices.filter((stepIndex) => bookmarkedStepKeys.has(stepKeys[stepIndex]));
  }
  function getAvailableBookmarkKinds() {
    /** @type {("quiz"|"flash")[]} */
    const kinds = [];
    if (getBookmarkedStepIndexesByKind("quiz").length > 0) kinds.push("quiz");
    if (getBookmarkedStepIndexesByKind("flash").length > 0) kinds.push("flash");
    return kinds;
  }
  function normalizeBookmarkFilterKind() {
    const availableKinds = getAvailableBookmarkKinds();
    if (availableKinds.length === 0) {
      bookmarkFilterKind = "all";
      return;
    }
    if (bookmarkFilterKind === "all") return;
    if (!availableKinds.includes(bookmarkFilterKind)) {
      bookmarkFilterKind = availableKinds[0];
    }
  }
  function getVisibleStepIndices() {
    if (!bookmarkFilter) return steps.map((_, stepIndex) => stepIndex);
    normalizeBookmarkFilterKind();
    return getBookmarkedStepIndexesByKind(bookmarkFilterKind);
  }
  function getBookmarkedQuizStepIndexes() {
    return getBookmarkedStepIndexesByKind("quiz");
  }
  function getBookmarkedFlashStepIndexes() {
    return getBookmarkedStepIndexesByKind("flash");
  }
  function getBookmarkCountForCurrentView() {
    if (!reviewMode) return bookmarkedStepKeys.size;
    if (!bookmarkFilter) return bookmarkedStepKeys.size;
    if (bookmarkFilterKind === "flash") return getBookmarkedFlashStepIndexes().length;
    if (bookmarkFilterKind === "quiz") return getBookmarkedQuizStepIndexes().length;
    return bookmarkedStepKeys.size;
  }
  function resolveNearestVisibleStepIndex(visibleIndices, preferredIndex) {
    const safePreferred = clampStepIndex(preferredIndex);
    if (!visibleIndices.length) return 0;
    if (visibleIndices.includes(safePreferred)) return safePreferred;
    const nextVisible = visibleIndices.find((stepIndex) => stepIndex >= safePreferred);
    return Number.isFinite(nextVisible) ? nextVisible : visibleIndices[visibleIndices.length - 1];
  }
  function syncVisibleState(preferredIndex = index) {
    if (bookmarkFilter) {
      normalizeBookmarkFilterKind();
      if (getBookmarkedStepIndexesByKind(bookmarkFilterKind).length === 0) bookmarkFilter = false;
    }
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
  function closeBookmarkMenu() {
    bookmarkMenuOpen = false;
    bookmarkMenu.classList.remove("open");
  }
  function openBookmarkMenu() {
    bookmarkMenuOpen = true;
    bookmarkMenu.classList.add("open");
  }
  function applyBookmarkFilter(kind) {
    bookmarkFilter = true;
    bookmarkFilterKind = kind;
    normalizeBookmarkFilterKind();
    const visibleBookmarks = getBookmarkedStepIndexesByKind(bookmarkFilterKind);
    const resumeBookmarkIndex =
      lastBookmarkStepKey && bookmarkedStepKeys.has(lastBookmarkStepKey) && visibleBookmarks.includes(stepKeys.indexOf(lastBookmarkStepKey))
        ? stepKeys.indexOf(lastBookmarkStepKey)
        : -1;
    const firstBookmarkedIndex = visibleBookmarks[0];
    if (resumeBookmarkIndex >= 0) index = resumeBookmarkIndex;
    else if (Number.isFinite(firstBookmarkedIndex)) index = firstBookmarkedIndex;
    if (reviewMode) renderReview();
    else renderStep();
  }
  function rebuildBookmarkMenu() {
    const availableKinds = getAvailableBookmarkKinds();
    bookmarkMenu.innerHTML = "";
    if (reviewMode || availableKinds.length < 2) {
      closeBookmarkMenu();
      return;
    }
    const options = [
      { kind: "all", label: `Tất cả bookmark (${bookmarkedStepKeys.size})` },
      ...(availableKinds.includes("quiz") ? [{ kind: "quiz", label: `Bookmark quiz (${getBookmarkedQuizStepIndexes().length})` }] : []),
      ...(availableKinds.includes("flash") ? [{ kind: "flash", label: `Bookmark flashcard (${getBookmarkedFlashStepIndexes().length})` }] : []),
    ];
    options.forEach((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `flash-bookmark-menu-item${bookmarkFilter && bookmarkFilterKind === option.kind ? " active" : ""}`;
      btn.textContent = option.label;
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        closeBookmarkMenu();
        applyBookmarkFilter(option.kind);
      });
      bookmarkMenu.appendChild(btn);
    });
    bookmarkMenu.classList.toggle("open", bookmarkMenuOpen);
  }
  function restoreAllViewIndex() {
    const resumeAllIndex = lastAllStepKey ? stepKeys.indexOf(lastAllStepKey) : -1;
    if (resumeAllIndex >= 0) index = resumeAllIndex;
  }
  function renderBookmarkChrome() {
    const bookmarkCount = getBookmarkCountForCurrentView();
    const hasBookmarks = bookmarkCount > 0;
    bookmarkControl.classList.toggle("has-bookmarks", hasBookmarks);
    if (!hasBookmarks) {
      bookmarkFilter = false;
      bookmarkFilterKind = "all";
      closeBookmarkMenu();
    }
    bookmarkFilterBtn.classList.toggle("active", bookmarkFilter);
    bookmarkFilterBtn.disabled = !hasBookmarks;
    if (bookmarkFilterBadge) bookmarkFilterBadge.textContent = String(bookmarkCount);
    if (reviewMode) {
      closeBookmarkMenu();
      bookmarkFilterBtn.title = bookmarkFilter
        ? `Đang xem ${bookmarkCount} câu quiz đã bookmark. Bấm lần nữa để quay lại tất cả.`
        : `Chỉ xem ${bookmarkCount} câu quiz đã bookmark`;
      return;
    }
    bookmarkFilterBtn.title = bookmarkFilter
      ? `Đang xem ${bookmarkCount} mục đã bookmark. Bấm lần nữa để quay lại tất cả.`
      : `Chỉ xem ${bookmarkCount} mục đã bookmark`;
    rebuildBookmarkMenu();
  }
  function paintBookmarkedProgressSegments(visibleIndices) {
    const segments = progress.wrap.querySelectorAll(".exp-progress-seg");
    const currentVisibleIndex = visibleIndices.indexOf(index);
    segments.forEach((segment, segmentIndex) => {
      const baseIndex = visibleIndices[segmentIndex];
      const isBookmarkedStep =
        Number.isFinite(baseIndex)
        && (steps[baseIndex]?.kind === "flash" || steps[baseIndex]?.kind === "quiz")
        && bookmarkedStepKeys.has(stepKeys[baseIndex]);
      const shouldHighlight = bookmarkFilter ? segmentIndex <= currentVisibleIndex : Boolean(isBookmarkedStep);
      segment.classList.toggle("bookmarked", Boolean(isBookmarkedStep && shouldHighlight));
    });
  }
  function repaintCurrentProgress() {
    if (bookmarkFilter) {
      const visibleIndices = getVisibleStepIndices();
      const visibleTotal = Math.max(1, visibleIndices.length);
      const visibleIndex = Math.max(0, visibleIndices.indexOf(index));
      progress.paint({ total: visibleTotal, index: visibleIndex, correct, wrong });
      paintBookmarkedProgressSegments(visibleIndices);
      return;
    }

    const progressSlots = buildMixedProgressSlots(steps);
    const logicalTotal = Math.max(1, progressSlots.length);
    const logicalIndex = Math.max(0, resolveMixedProgressIndex(steps, index, slideDeckIndex));
    progress.paint({ total: logicalTotal, index: logicalIndex, correct, wrong });
    const segments = progress.wrap.querySelectorAll(".exp-progress-seg");
    segments.forEach((segment, segmentIndex) => {
      const slot = progressSlots[segmentIndex];
      const isBookmarkedStep =
        slot
        && (steps[slot.stepIndex]?.kind === "flash" || steps[slot.stepIndex]?.kind === "quiz")
        && bookmarkedStepKeys.has(stepKeys[slot.stepIndex]);
      const shouldHighlight = segmentIndex <= logicalIndex;
      segment.classList.toggle("bookmarked", Boolean(isBookmarkedStep && shouldHighlight));
    });
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
      bookmarkFilterKind,
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
  function submitMixedQuizNow() {
    const step = steps[index];
    if (reviewMode || step?.kind !== "quiz") return;
    const finalized = finalizePendingQuizAnswer(quizSelected, quizCorrectOptionIndex(step.data), quizCountedByStep[index]);
    if (finalized) {
      quizSelected = finalized.picked;
      quizSelectedByStep[index] = finalized.picked;
      quizRevealed = true;
      quizRevealedByStep[index] = true;
      quizCountedByStep[index] = true;
      quizCorrectByStep[index] = finalized.isCorrect;
    }
    refreshScore();
    const flashIndex = findNextStepIndexByKind(steps, index, "flash");
    if (flashIndex >= 0) {
      index = flashIndex;
      renderStep();
      return;
    }
    reviewMode = true;
    reviewFilter = "all";
    renderReview();
  }
  function renderReview() {
    slideUiAbort?.abort();
    slideUiAbort = null;
    activeSlideDeckShell = null;
    shell.classList.remove("exp-shell-slide");
    stage.className = "exp-stage";
    footer.hidden = true;
    if (exportBtn) exportBtn.hidden = true;
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
      bookmarkedStepKeys: [...bookmarkedStepKeys],
      stepKeys,
      bookmarkFilter,
      bookmarkFilterKind,
      bookmarkedQuizCount: getBookmarkedQuizStepIndexes().length,
      bookmarkedFlashCount: getBookmarkedFlashStepIndexes().length,
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
      onBookmarkKindChange: (kind) => {
        if (kind !== "quiz" && kind !== "flash") return;
        bookmarkFilter = true;
        bookmarkFilterKind = kind;
        renderReview();
      },
    });
    emitState();
  }
  function refreshMixedNavChrome() {
    const st = steps[index];
    const hasPrev = Boolean(deps?.hasPrevAutoExperience?.());
    if (bookmarkFilter) {
      const visibleIndices = getVisibleStepIndices();
      const visibleIndex = visibleIndices.indexOf(index);
      backBtn.disabled = visibleIndex <= 0 && !hasPrev;
      nextBtn.textContent = visibleIndex >= visibleIndices.length - 1 ? "Xem tất cả" : "Tiếp theo";
      return;
    }
    if (st?.kind === "slide_deck") {
      const dl = (st.data.slides || []).length;
      const atFirst = dl === 0 || slideDeckIndex <= 0;
      const atLast = dl > 0 && slideDeckIndex >= dl - 1;
      backBtn.disabled = index <= 0 && atFirst && !hasPrev;
      nextBtn.textContent = index >= total - 1 && atLast ? "Tiếp tục tạo" : "Tiếp theo";
    } else {
      backBtn.disabled = index <= 0 && !hasPrev;
      nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    }
  }

  function runSlideDeckArrowAction(action) {
    if (action === "deck-prev") {
      activeSlideDeckShell?.bumpDeck(-1);
      return;
    }
    if (action === "deck-next") {
      activeSlideDeckShell?.bumpDeck(1);
      return;
    }
    if (action === "step-prev") {
      if (!backBtn.disabled) backBtn.click();
      return;
    }
    if (!nextBtn.disabled) nextBtn.click();
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
    if (exportBtn) exportBtn.hidden = step?.kind !== "slide_deck";
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
    submitBtn.hidden = step.kind !== "quiz";
    submitBtn.disabled = false;
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

        let visualEditOn = false;
        const visualEditBtn = document.createElement("button");
        visualEditBtn.type = "button";
        visualEditBtn.className = "exp-slide-visual-edit-btn";
        visualEditBtn.disabled = true;
        visualEditBtn.hidden = true;
        visualEditBtn.title = "Chỉnh sửa trên slide (kéo, màu, font, ảnh)";
        visualEditBtn.setAttribute("aria-label", "Chế độ chỉnh sửa slide");
        visualEditBtn.setAttribute("aria-pressed", "false");
        visualEditBtn.innerHTML = `<svg class="exp-slide-visual-edit-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg><span>Sửa</span>`;
        visualEditBtn.addEventListener("click", () => {
          if (!shellReady) return;
          visualEditOn = !visualEditOn;
          visualEditBtn.classList.toggle("is-active", visualEditOn);
          visualEditBtn.setAttribute("aria-pressed", visualEditOn ? "true" : "false");
          setSlideVisualEditMode(iframe, visualEditOn);
        }, { signal: uiSignal });

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
        viewport.append(iframeFrame, visualEditBtn, prevArrow, nextArrow, fsBtn);
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
          const prevArrowAction = resolveMixedSlideDeckArrowAction("ArrowLeft", slideDeckIndex, deckSlides.length);
          const nextArrowAction = resolveMixedSlideDeckArrowAction("ArrowRight", slideDeckIndex, deckSlides.length);
          const canLeaveDeckBackward = index > 0 || Boolean(deps?.hasPrevAutoExperience?.());
          const canLeaveDeckForward =
            index < total - 1 || quizStepIndexes.length > 0 || typeof deps?.onContinueCreate === "function";
          modePresBtn.setAttribute("aria-pressed", pres ? "true" : "false");
          modeScrollBtn.setAttribute("aria-pressed", pres ? "false" : "true");
          modePresBtn.classList.toggle("is-selected", pres);
          modeScrollBtn.classList.toggle("is-selected", !pres);
          prevArrow.disabled = prevArrowAction === "step-prev" ? !canLeaveDeckBackward : false;
          nextArrow.disabled = nextArrowAction === "step-next" ? !canLeaveDeckForward : false;
          prevArrow.hidden = !pres || !shellReady;
          nextArrow.hidden = !pres || !shellReady;
          fsBtn.hidden = !pres || !shellReady;
          visualEditBtn.hidden = !pres || !shellReady;
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
          repaintCurrentProgress();
          emitState();
          restoreOuterScrollSoon();
          refreshMixedNavChrome();
        }

        modePresBtn.addEventListener("click", () => applyViewMode("presentation"), { signal: uiSignal });
        modeScrollBtn.addEventListener("click", () => applyViewMode("scroll"), { signal: uiSignal });

        prevArrow.addEventListener(
          "click",
          () => runSlideDeckArrowAction(resolveMixedSlideDeckArrowAction("ArrowLeft", slideDeckIndex, deckSlides.length)),
          { signal: uiSignal },
        );
        nextArrow.addEventListener(
          "click",
          () => runSlideDeckArrowAction(resolveMixedSlideDeckArrowAction("ArrowRight", slideDeckIndex, deckSlides.length)),
          { signal: uiSignal },
        );

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
            const sessionShellSubtitle = (() => {
              const auto = "(Teachly tự động)";
              const tt = String(topic || "").replace(/\s+/g, " ").trim();
              if (tt && tt !== auto && tt !== "—") return tt;
              return String(titleText || "").replace(/\s+/g, " ").trim();
            })();
            const srcdoc = buildSlideDeckSrcdoc(html, deckSlides, {
              ...slideMeta,
              deckTitle: String(titleText || "").trim(),
              sessionShellSubtitle,
              slideTemplate: String(spec.slideTemplate || ""),
              shellYear: String(new Date().getFullYear()),
              slideNavMode: "active",
            });
            lastRenderedSlideSrcdoc = srcdoc;
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
            visualEditBtn.disabled = false;
            window.addEventListener("message", (e) => {
              if (!e.data || e.data.type !== "a20-slide-edit" || e.data.action !== "open-image-picker") return;
              if (e.source !== iframe.contentWindow) return;
              const mountEl = isFauxFs() ? viewport : document.body;
              openSlideImagePicker((url) => {
                try {
                  iframe.contentWindow?.postMessage({ type: "a20-slide-edit", action: "set-image-url", url }, "*");
                } catch (_) {}
              }, mountEl);
            }, { signal: uiSignal });
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
    const availableKinds = getAvailableBookmarkKinds();
    const availableBookmarkIndexes = reviewMode
      ? (bookmarkFilterKind === "flash" ? getBookmarkedFlashStepIndexes() : getBookmarkedQuizStepIndexes())
      : getBookmarkedStepIndexesByKind("all");
    if (availableBookmarkIndexes.length === 0 && availableKinds.length === 0) return;
    if (bookmarkFilter) {
      bookmarkFilter = false;
      bookmarkFilterKind = "all";
      closeBookmarkMenu();
      restoreAllViewIndex();
      if (reviewMode) renderReview();
      else renderStep();
      return;
    }
    if (reviewMode) {
      bookmarkFilter = true;
      if (availableKinds.length === 1) bookmarkFilterKind = availableKinds[0];
      else if (bookmarkFilterKind === "all") bookmarkFilterKind = "quiz";
      renderReview();
      return;
    }
    if (availableKinds.length > 1) {
      bookmarkMenuOpen = !bookmarkMenuOpen;
      rebuildBookmarkMenu();
      if (bookmarkMenuOpen) openBookmarkMenu();
      else closeBookmarkMenu();
      return;
    }
    applyBookmarkFilter(availableKinds[0] || "all");
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
  submitBtn.addEventListener("click", () => {
    submitMixedQuizNow();
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
    if (index <= 0) {
      deps?.onGoBackToPrevExperience?.();
      return;
    }
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
      runSlideDeckArrowAction(resolveMixedSlideDeckArrowAction(e.key, slideDeckIndex, activeSlideDeckShell.deckLen));
      return;
    }
    e.preventDefault();
    if (e.key === "ArrowLeft") {
      if (!backBtn.disabled) backBtn.click();
    } else {
      if (!nextBtn.disabled) nextBtn.click();
    }
  }
  root._kbAbort = () => globalUiAbort.abort();
  window.addEventListener("keydown", onGlobalKeydown, { capture: true, signal: globalUiAbort.signal });

  shell.appendChild(progress.wrap);
  shell.appendChild(stage);
  shell.appendChild(footer);
  root.appendChild(shell);
  renderStep();
}

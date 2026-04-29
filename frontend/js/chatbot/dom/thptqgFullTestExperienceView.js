import { fetchMockResource } from "../services/mockContentApi.js";
import { renderQuizStemRichText } from "../services/quizService.js";
import { createExperienceTopBar } from "./experienceChrome.js";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function cloneRecord(input) {
  if (!input || typeof input !== "object") return {};
  return { ...input };
}

function formatMinutes(minutes) {
  const safe = Number.isFinite(Number(minutes)) ? Math.max(0, Math.floor(Number(minutes))) : 0;
  return `${safe} phút`;
}

function formatElapsed(seconds) {
  const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Math.floor(Number(seconds))) : 0;
  const hh = String(Math.floor(safe / 3600)).padStart(2, "0");
  const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function answerLetter(index) {
  return Number.isFinite(Number(index)) && Number(index) >= 0 ? OPTION_LETTERS[Number(index)] || "?" : "—";
}

function toValidAnswerIndex(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function deepCopyBundle(bundle) {
  try {
    return structuredClone(bundle);
  } catch {
    return JSON.parse(JSON.stringify(bundle));
  }
}

function normalizeCatalog(data) {
  const safe = data && typeof data === "object" ? deepCopyBundle(data) : {};
  const catalog = safe.catalog && typeof safe.catalog === "object" ? safe.catalog : {};
  const tests = Array.isArray(safe.tests) ? safe.tests : [];
  return {
    catalog: {
      title: String(catalog.title || "THPTQG simulation tests"),
      subtitle: String(catalog.subtitle || "Thư viện đề giả lập THPTQG Tiếng Anh"),
      ctaLabel: String(catalog.ctaLabel || "Làm full đề THPTQG"),
    },
    tests: tests.map((test) => ({
      ...test,
      id: String(test?.id || ""),
      title: String(test?.title || "THPTQG simulation test"),
      status: String(test?.status || "locked"),
      durationMinutes: Number.isFinite(Number(test?.durationMinutes)) ? Math.max(0, Math.floor(Number(test.durationMinutes))) : 60,
      questionCount: Number.isFinite(Number(test?.questionCount)) ? Math.max(0, Math.floor(Number(test.questionCount))) : 0,
      yearLabel: String(test?.yearLabel || ""),
      source: String(test?.source || ""),
      parts: Array.isArray(test?.parts) ? test.parts : [],
      questions: Array.isArray(test?.questions) ? test.questions : [],
    })),
  };
}

function computeResultSummary(test, answersByQuestion) {
  const summary = {
    total: Array.isArray(test?.questions) ? test.questions.length : 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    invalid: 0,
    partStats: [],
  };
  const questions = Array.isArray(test?.questions) ? test.questions : [];
  const parts = Array.isArray(test?.parts) ? test.parts : [];
  const questionsByPart = new Map();
  questions.forEach((question) => {
    const key = String(question?.partId || "");
    if (!questionsByPart.has(key)) questionsByPart.set(key, []);
    questionsByPart.get(key).push(question);
  });

  parts.forEach((part) => {
    const partQuestions = questionsByPart.get(String(part?.id || "")) || [];
    const stat = {
      partId: String(part?.id || ""),
      label: String(part?.label || ""),
      title: String(part?.title || ""),
      total: partQuestions.length,
      correct: 0,
      wrong: 0,
      skipped: 0,
      invalid: 0,
      questionIds: partQuestions.map((question) => String(question?.id || "")),
    };
    partQuestions.forEach((question) => {
      const pickedIndex = toValidAnswerIndex(answersByQuestion[String(question?.id || "")]);
      const correctIndex = toValidAnswerIndex(question?.correctIndex);
      if (correctIndex === null) {
        stat.invalid += 1;
        summary.invalid += 1;
      } else if (pickedIndex === null) {
        stat.skipped += 1;
        summary.skipped += 1;
      } else if (pickedIndex === correctIndex) {
        stat.correct += 1;
        summary.correct += 1;
      } else {
        stat.wrong += 1;
        summary.wrong += 1;
      }
    });
    stat.gradableTotal = Math.max(0, stat.total - stat.invalid);
    stat.accuracy = stat.gradableTotal ? (stat.correct / stat.gradableTotal) * 100 : 0;
    summary.partStats.push(stat);
  });

  summary.gradableTotal = Math.max(0, summary.total - summary.invalid);
  summary.score10 = summary.gradableTotal ? (summary.correct / summary.gradableTotal) * 10 : 0;
  return summary;
}

function getQuestionAnswerState(question, answersByQuestion) {
  const pickedIndex = toValidAnswerIndex(answersByQuestion[String(question?.id || "")]);
  const correctIndex = toValidAnswerIndex(question?.correctIndex);
  if (correctIndex === null) return "invalid";
  if (pickedIndex === null) return "unanswered";
  return pickedIndex === correctIndex ? "correct" : "wrong";
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  if (typeof onClick === "function") button.addEventListener("click", onClick);
  return button;
}

function appendTextBlock(parent, tagName, className, text) {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  el.textContent = text;
  parent.appendChild(el);
  return el;
}

function isLongReadingGroup(group) {
  const context = Array.isArray(group?.context) ? group.context : [];
  const joined = context.join(" ").trim();
  const questionCount = Array.isArray(group?.questionNumbers) ? group.questionNumbers.length : 0;
  return context.length >= 3 || joined.length >= 850 || (context.length >= 2 && questionCount >= 6);
}

function stripQuestionLabel(prompt) {
  return String(prompt || "").replace(/^Question\s+\d+\.\s*/i, "");
}

function buildQuestionsByPart(test) {
  const map = new Map();
  (Array.isArray(test?.questions) ? test.questions : []).forEach((question) => {
    const partId = String(question?.partId || "");
    if (!map.has(partId)) map.set(partId, []);
    map.get(partId).push(question);
  });
  return map;
}

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {Record<string, string>} meta
 * @param {any} deps
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountThptqgFullTestExperience(layerView, meta, deps, opts = {}) {
  void deps;
  layerView.prepareShow();
  layerView.setVariant?.("thptqg-fullpage");
  const root = layerView.body;
  root.innerHTML = "";

  const bundle = normalizeCatalog(await fetchMockResource("thptqg_fulltest"));
  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : {};

  let view = initial?.view === "attempt" || initial?.view === "result" ? initial.view : "catalog";
  let selectedTestId = typeof initial?.testId === "string" ? initial.testId : "";
  let answersByQuestion = cloneRecord(initial?.answersByQuestion);
  let flaggedQuestions = new Set(Array.isArray(initial?.flaggedQuestions) ? initial.flaggedQuestions.map(String) : []);
  let currentPartId = typeof initial?.currentPartId === "string" ? initial.currentPartId : "";
  let currentQuestion = typeof initial?.currentQuestion === "string" ? initial.currentQuestion : "";
  let startedAt = typeof initial?.startedAt === "string" ? initial.startedAt : "";
  let elapsedSeconds = Number.isFinite(Number(initial?.elapsedSeconds)) ? Math.max(0, Math.floor(Number(initial.elapsedSeconds))) : 0;
  let submittedAt = typeof initial?.submittedAt === "string" ? initial.submittedAt : "";
  let reviewMode = Boolean(initial?.reviewMode);
  let activeResultPartId = typeof initial?.activeResultPartId === "string" ? initial.activeResultPartId : "overview";
  let resultReviewFilter = initial?.resultReviewFilter === "wrong" ? "wrong" : "all";
  let detailQuestionId = typeof initial?.detailQuestionId === "string" ? initial.detailQuestionId : "";
  let elapsedBaseSeconds = elapsedSeconds;
  let elapsedBaseTick = Date.now();
  let timerValueEl = null;
  let pendingScrollQuestionId = "";
  const historyAbort = new AbortController();
  let timer = 0;
  let removalObserver = null;
  let disposed = false;
  let detailCardCacheTestId = "";
  /** @type {Map<string, { signature: string, element: HTMLDivElement }>} */
  const detailCardCache = new Map();

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-thptqg";
  shell.appendChild(createExperienceTopBar({ title: meta.catalogTitle || bundle.catalog.title }).bar);

  const summaryLine = document.createElement("p");
  summaryLine.className = "exp-meta-line";
  summaryLine.textContent = `Mode mới: ${bundle.catalog.ctaLabel} | Dữ liệu mock: ${meta.source || "mockdata_40.md"} | Bản v1: 4 part, mỗi part 10 câu.`;
  shell.appendChild(summaryLine);

  const stage = document.createElement("div");
  stage.className = "exp-stage";
  shell.appendChild(stage);
  root.appendChild(shell);

  function getActiveTest() {
    return bundle.tests.find((test) => test.id === selectedTestId) || null;
  }

  function getQuestionMap(test) {
    const map = new Map();
    (Array.isArray(test?.questions) ? test.questions : []).forEach((question) => {
      map.set(String(question?.id || ""), question);
    });
    return map;
  }

  function resetDetailCardCache() {
    detailCardCacheTestId = "";
    detailCardCache.clear();
  }

  function ensureDetailCardCache(testId) {
    const safeTestId = String(testId || "");
    if (detailCardCacheTestId === safeTestId) return;
    detailCardCacheTestId = safeTestId;
    detailCardCache.clear();
  }

  function buildDetailCardSignature(question, picked, answerState) {
    return JSON.stringify({
      picked: toValidAnswerIndex(picked),
      answerState,
      correctIndex: toValidAnswerIndex(question?.correctIndex),
    });
  }

  function createDetailCard(question, state) {
    const questionId = String(question?.id || "");
    const picked = state.answersByQuestion[questionId];
    const answerState = getQuestionAnswerState(question, state.answersByQuestion);
    const isCorrect = answerState === "correct";
    const isInvalid = answerState === "invalid";
    const correctIndex = toValidAnswerIndex(question.correctIndex);
    const statusText =
      answerState === "correct"
        ? "Bạn làm đúng câu này."
        : answerState === "wrong"
          ? "Bạn làm sai câu này."
          : isInvalid
            ? "Câu này chưa thể chấm do thiếu đáp án chuẩn."
            : "Bạn chưa trả lời câu này.";
    const detailCard = document.createElement("div");
    detailCard.className = `thptqg-answer-detail-card quiz-review-card${state.detailQuestionId === questionId ? " active" : ""}`;
    const detailHead = document.createElement("div");
    detailHead.className = "thptqg-answer-detail-head";
    const detailHeadInner = document.createElement("div");
    const partLabel = document.createElement("div");
    partLabel.className = "thptqg-part-label";
    partLabel.textContent = String(question.partId || "").toUpperCase();
    const detailHeading = document.createElement("h4");
    detailHeading.textContent = `Đáp án chi tiết câu ${question.number}`;
    detailHeadInner.appendChild(partLabel);
    detailHeadInner.appendChild(detailHeading);
    detailHead.appendChild(detailHeadInner);
    detailCard.appendChild(detailHead);

    const detailPrompt = document.createElement("p");
    detailPrompt.className = "exp-q-text";
    renderQuizStemRichText(detailPrompt, stripQuestionLabel(question.prompt));
    detailCard.appendChild(detailPrompt);

    const answerRow = document.createElement("div");
    answerRow.className = "thptqg-answer-row";
    const pickedSpan = document.createElement("span");
    pickedSpan.textContent = "Bạn chọn: ";
    const pickedStrong = document.createElement("strong");
    pickedStrong.textContent = answerLetter(picked);
    pickedSpan.appendChild(pickedStrong);
    const correctSpan = document.createElement("span");
    correctSpan.textContent = "Đáp án đúng: ";
    const correctStrong = document.createElement("strong");
    correctStrong.textContent = answerLetter(question.correctIndex);
    correctSpan.appendChild(correctStrong);
    answerRow.appendChild(pickedSpan);
    answerRow.appendChild(correctSpan);
    detailCard.appendChild(answerRow);

    const optionList = document.createElement("div");
    optionList.className = "quiz-review-options";
    (Array.isArray(question.options) ? question.options : []).forEach((option, index) => {
      const line = document.createElement("div");
      let className = "quiz-review-option";
      if (correctIndex !== null && index === correctIndex) className += " correct";
      if (correctIndex !== null && Number(picked) === index && Number(picked) !== correctIndex) className += " wrong";
      line.className = className;
      line.textContent = `${OPTION_LETTERS[index] || index}. ${option}`;
      optionList.appendChild(line);
    });
    detailCard.appendChild(optionList);

    const resultLine = document.createElement("div");
    resultLine.className = `quiz-review-result ${isCorrect ? "ok" : answerState === "wrong" ? "bad" : isInvalid ? "invalid" : ""}`.trim();
    resultLine.textContent = statusText;
    detailCard.appendChild(resultLine);

    const evidence = document.createElement("div");
    evidence.className = "thptqg-evidence";
    const evidenceLabel = document.createElement("strong");
    evidenceLabel.textContent = "Trích đoạn chứa đáp án:";
    evidence.appendChild(evidenceLabel);
    evidence.appendChild(document.createTextNode(` ${question.explanationEvidence || "Không có."}`));
    detailCard.appendChild(evidence);

    const details = document.createElement("details");
    details.className = "thptqg-explanation-details";
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Giải thích chi tiết đáp án";
    const body = document.createElement("div");
    body.className = "thptqg-explanation-body";
    body.textContent = String(question.explanation || "");
    details.appendChild(summary);
    details.appendChild(body);
    detailCard.appendChild(details);
    return detailCard;
  }

  function getOrCreateDetailCard(question) {
    const questionId = String(question?.id || "");
    const answerState = getQuestionAnswerState(question, answersByQuestion);
    const signature = buildDetailCardSignature(question, answersByQuestion[questionId], answerState);
    const cached = detailCardCache.get(questionId);
    if (!cached || cached.signature !== signature) {
      const element = createDetailCard(question, { answersByQuestion, detailQuestionId });
      detailCardCache.set(questionId, { signature, element });
      return element;
    }
    cached.element.classList.toggle("active", detailQuestionId === questionId);
    return cached.element;
  }

  function getCurrentElapsedSeconds() {
    if (submittedAt) return elapsedSeconds;
    return Math.max(0, elapsedBaseSeconds + Math.floor((Date.now() - elapsedBaseTick) / 1000));
  }

  function snapshotElapsed() {
    if (submittedAt) return elapsedSeconds;
    elapsedSeconds = getCurrentElapsedSeconds();
    elapsedBaseSeconds = elapsedSeconds;
    elapsedBaseTick = Date.now();
    return elapsedSeconds;
  }

  function ensureSelectionForTest(test) {
    if (!test) return;
    const parts = Array.isArray(test.parts) ? test.parts : [];
    if (!currentPartId || !parts.some((part) => String(part?.id || "") === currentPartId)) {
      currentPartId = String(parts[0]?.id || "");
    }
    const questions = Array.isArray(test.questions) ? test.questions : [];
    if (!currentQuestion || !questions.some((question) => String(question?.id || "") === currentQuestion)) {
      currentQuestion = String(questions[0]?.id || "");
    }
  }

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    const activeTest = getActiveTest();
    ensureSelectionForTest(activeTest);
    const questions = Array.isArray(activeTest?.questions) ? activeTest.questions : [];
    const questionIndex = questions.findIndex((question) => String(question?.id || "") === currentQuestion);
    opts.onStateChange({
      kind: "thptqg_fulltest",
      meta: {
        ...meta,
        ...(activeTest ? { testId: activeTest.id, testTitle: activeTest.title } : {}),
      },
      title: activeTest?.title || meta.catalogTitle || bundle.catalog.title,
      total: activeTest?.questionCount || bundle.tests.length || 1,
      index: questionIndex >= 0 ? questionIndex : 0,
      view,
      testId: selectedTestId,
      answersByQuestion: { ...answersByQuestion },
      flaggedQuestions: [...flaggedQuestions],
      currentPartId,
      currentQuestion,
      startedAt,
      elapsedSeconds: snapshotElapsed(),
      submittedAt,
      reviewMode,
      activeResultPartId,
      resultReviewFilter,
      detailQuestionId,
    });
  }

  function updateTimer() {
    if (!timerValueEl) return;
    timerValueEl.textContent = formatElapsed(getCurrentElapsedSeconds());
  }

  function clearTimerSchedule() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }

  function scheduleTimerTick() {
    clearTimerSchedule();
    if (disposed) return;
    updateTimer();
    if (!startedAt || submittedAt || view !== "attempt") return;
    const elapsedMs = Math.max(0, Date.now() - elapsedBaseTick);
    const remainderMs = elapsedMs % 1000;
    const msUntilNextSecond = remainderMs === 0 ? 1000 : 1000 - remainderMs;
    timer = setTimeout(() => {
      scheduleTimerTick();
    }, Math.max(32, msUntilNextSecond));
  }

  function persistLiveProgress() {
    if (disposed) return;
    if (!startedAt || submittedAt || view !== "attempt") return;
    snapshotElapsed();
    emitState();
  }

  function disposeExperience() {
    if (disposed) return;
    persistLiveProgress();
    disposed = true;
    clearTimerSchedule();
    resetDetailCardCache();
    removalObserver?.disconnect();
    removalObserver = null;
    historyAbort.abort();
  }

  function captureAttemptScrollState() {
    const activeTest = getActiveTest();
    if (view !== "attempt" || !activeTest) return null;
    return {
      bodyScrollTop: root.scrollTop,
      passageScrollTops: Array.from(stage.querySelectorAll(".thptqg-passage-scroll")).map((el) =>
        el instanceof HTMLElement ? el.scrollTop : 0,
      ),
      questionScrollTops: Array.from(stage.querySelectorAll(".thptqg-question-scroll")).map((el) =>
        el instanceof HTMLElement ? el.scrollTop : 0,
      ),
    };
  }

  function restoreAttemptScrollState(scrollState) {
    if (!scrollState || typeof scrollState !== "object") return;
    if (Number.isFinite(Number(scrollState.bodyScrollTop))) {
      root.scrollTop = Math.max(0, Number(scrollState.bodyScrollTop));
    }
    Array.from(stage.querySelectorAll(".thptqg-passage-scroll")).forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      const top = Array.isArray(scrollState.passageScrollTops) ? scrollState.passageScrollTops[index] : null;
      if (Number.isFinite(Number(top))) el.scrollTop = Math.max(0, Number(top));
    });
    Array.from(stage.querySelectorAll(".thptqg-question-scroll")).forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      const top = Array.isArray(scrollState.questionScrollTops) ? scrollState.questionScrollTops[index] : null;
      if (Number.isFinite(Number(top))) el.scrollTop = Math.max(0, Number(top));
    });
  }

  function buildHistorySnapshot() {
    return {
      view,
      testId: selectedTestId,
      currentPartId,
      currentQuestion,
      startedAt,
      submittedAt,
      reviewMode,
      activeResultPartId,
      resultReviewFilter,
      detailQuestionId,
    };
  }

  function writeHistory(mode = "replace") {
    void mode;
    void buildHistorySnapshot;
  }

  function restoreFromHistorySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;
    view = snapshot.view === "attempt" || snapshot.view === "result" ? snapshot.view : "catalog";
    selectedTestId = typeof snapshot.testId === "string" ? snapshot.testId : "";
    currentPartId = typeof snapshot.currentPartId === "string" ? snapshot.currentPartId : "";
    currentQuestion = typeof snapshot.currentQuestion === "string" ? snapshot.currentQuestion : "";
    startedAt = typeof snapshot.startedAt === "string" ? snapshot.startedAt : startedAt;
    submittedAt = typeof snapshot.submittedAt === "string" ? snapshot.submittedAt : "";
    reviewMode = Boolean(snapshot.reviewMode);
    activeResultPartId = typeof snapshot.activeResultPartId === "string" ? snapshot.activeResultPartId : "overview";
    resultReviewFilter = snapshot.resultReviewFilter === "wrong" ? "wrong" : "all";
    detailQuestionId = typeof snapshot.detailQuestionId === "string" ? snapshot.detailQuestionId : "";
    return true;
  }

  function openCatalog(historyMode = "replace") {
    snapshotElapsed();
    view = "catalog";
    resetDetailCardCache();
    activeResultPartId = "overview";
    resultReviewFilter = "all";
    detailQuestionId = "";
    emitState();
    render();
    writeHistory(historyMode);
  }

  function startOrResumeTest(test, historyMode = "replace") {
    if (!test || test.status !== "available") return;
    selectedTestId = test.id;
    resetDetailCardCache();
    ensureSelectionForTest(test);
    if (!startedAt) {
      startedAt = new Date().toISOString();
      elapsedBaseSeconds = 0;
      elapsedSeconds = 0;
    }
    elapsedBaseTick = Date.now();
    detailQuestionId = "";
    activeResultPartId = "overview";
    resultReviewFilter = "all";
    reviewMode = Boolean(submittedAt);
    view = submittedAt ? "result" : "attempt";
    emitState();
    render();
    scheduleTimerTick();
    writeHistory(historyMode);
  }

  function restartTest(test, historyMode = "replace") {
    if (!test || test.status !== "available") return;
    if (!window.confirm("Làm lại đề này từ đầu? Các đáp án và đánh dấu hiện tại sẽ bị xóa.")) return;
    selectedTestId = test.id;
    answersByQuestion = {};
    flaggedQuestions = new Set();
    startedAt = "";
    elapsedSeconds = 0;
    elapsedBaseSeconds = 0;
    elapsedBaseTick = Date.now();
    submittedAt = "";
    reviewMode = false;
    activeResultPartId = "overview";
    resultReviewFilter = "all";
    detailQuestionId = "";
    startOrResumeTest(test, historyMode);
  }

  function jumpToQuestion(test, questionId) {
    const questionMap = getQuestionMap(test);
    const question = questionMap.get(questionId);
    if (!question) return;
    currentQuestion = questionId;
    currentPartId = String(question.partId || currentPartId);
    pendingScrollQuestionId = questionId;
    emitState();
    render();
    writeHistory("replace");
  }

  function toggleFlag(questionId) {
    if (flaggedQuestions.has(questionId)) flaggedQuestions.delete(questionId);
    else flaggedQuestions.add(questionId);
    currentQuestion = questionId;
    emitState();
    render();
    writeHistory("replace");
  }

  function pickAnswer(questionId, optionIndex) {
    if (submittedAt) return;
    answersByQuestion = {
      ...answersByQuestion,
      [questionId]: optionIndex,
    };
    currentQuestion = questionId;
    emitState();
    render();
    writeHistory("replace");
  }

  function submitTest(test, historyMode = "replace") {
    if (!test || submittedAt) return;
    if (!window.confirm("Nộp bài ngay bây giờ?")) return;
    elapsedSeconds = snapshotElapsed();
    submittedAt = new Date().toISOString();
    reviewMode = true;
    view = "result";
    activeResultPartId = "overview";
    resultReviewFilter = "all";
    detailQuestionId = "";
    emitState();
    render();
    writeHistory(historyMode);
  }

  function renderCatalog() {
    stage.innerHTML = "";
    const head = document.createElement("div");
    head.className = "thptqg-catalog-head";
    const headCopy = document.createElement("div");
    appendTextBlock(headCopy, "h2", "thptqg-title", bundle.catalog.title);
    appendTextBlock(headCopy, "p", "thptqg-subtitle", bundle.catalog.subtitle);
    head.appendChild(headCopy);
    const note = document.createElement("div");
    note.className = "thptqg-inline-note";
    note.appendChild(document.createTextNode("Hiện có 1 đề thật từ "));
    appendTextBlock(note, "strong", "", meta.source || "mockdata_40.md");
    note.appendChild(document.createTextNode(", các đề còn lại đang khóa."));
    head.appendChild(note);
    stage.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "thptqg-test-grid";
    bundle.tests.forEach((test) => {
      const isSelected = test.id === selectedTestId;
      const isLocked = test.status !== "available";
      const isSubmitted = Boolean(isSelected && submittedAt);
      const isInProgress = Boolean(isSelected && !submittedAt && Object.keys(answersByQuestion).length > 0);
      const buttonLabel = isLocked ? "Sắp có" : isSubmitted ? "Xem kết quả" : isInProgress ? "Tiếp tục làm" : "Làm đề";
      const card = document.createElement("article");
      card.className = `thptqg-test-card${isLocked ? " locked" : ""}${isSelected ? " active" : ""}`;
      const badges = document.createElement("div");
      badges.className = "thptqg-test-badges";
      appendTextBlock(badges, "span", "thptqg-tag", test.yearLabel || "Mock");
      appendTextBlock(badges, "span", "thptqg-tag", test.status === "available" ? "Khả dụng" : "Sắp có");
      card.appendChild(badges);
      appendTextBlock(card, "h3", "", test.title);
      appendTextBlock(card, "div", "thptqg-test-meta", `⏱ ${formatMinutes(test.durationMinutes)} | ${test.questionCount} câu`);
      appendTextBlock(card, "div", "thptqg-test-meta", "📚 4 part | 10 câu / part");
      const action = createButton(buttonLabel, `thptqg-test-btn${isLocked ? " disabled" : ""}`, () => {
        if (isLocked) return;
        if (isSubmitted) {
          view = "result";
          selectedTestId = test.id;
          reviewMode = true;
          render();
          emitState();
          writeHistory("replace");
          return;
        }
        startOrResumeTest(test);
      });
      action.disabled = isLocked;
      card.appendChild(action);
      grid.appendChild(card);
    });
    stage.appendChild(grid);
  }

  function renderAttempt(test) {
    const previousScrollState = captureAttemptScrollState();
    stage.innerHTML = "";
    const parts = Array.isArray(test.parts) ? test.parts : [];
    const activePart = parts.find((part) => String(part?.id || "") === currentPartId) || parts[0] || null;
    ensureSelectionForTest(test);

    const examHead = document.createElement("div");
    examHead.className = "thptqg-exam-head";
    const examHeadCopy = document.createElement("div");
    appendTextBlock(examHeadCopy, "h2", "thptqg-exam-title", test.title);
    appendTextBlock(
      examHeadCopy,
      "p",
      "thptqg-exam-subtitle",
      "Mỗi part gồm 10 câu. Chọn part để chuyển nhanh giữa các phần của đề.",
    );
    examHead.appendChild(examHeadCopy);
    examHead.appendChild(createButton("Danh sách đề", "thptqg-secondary-btn", () => openCatalog("replace")));
    stage.appendChild(examHead);

    const layout = document.createElement("div");
    layout.className = "thptqg-exam-layout";
    const workspace = document.createElement("div");
    workspace.className = "thptqg-exam-workspace";
    const sidebar = document.createElement("aside");
    sidebar.className = "thptqg-side-panel";

    const workspaceTop = document.createElement("div");
    workspaceTop.className = "thptqg-exam-workspace-top";
    const workspaceCopy = document.createElement("div");
    workspaceCopy.className = "thptqg-exam-workspace-copy";
    appendTextBlock(workspaceCopy, "div", "thptqg-part-label", activePart?.label || "Part");
    appendTextBlock(workspaceCopy, "h3", "", activePart?.title || "Làm đề");
    workspaceTop.appendChild(workspaceCopy);
    const topPartTabs = document.createElement("div");
    topPartTabs.className = "thptqg-exam-part-tabs";
    parts.forEach((part) => {
      const button = createButton(String(part?.label || ""), `thptqg-part-btn${currentPartId === part.id ? " active" : ""}`, () => {
        currentPartId = String(part.id || "");
        const firstQuestionNumber = Number(part?.questionStart || 0);
        const firstQuestion = (Array.isArray(test.questions) ? test.questions : []).find((question) => Number(question?.number) === firstQuestionNumber);
        currentQuestion = String(firstQuestion?.id || currentQuestion);
        emitState();
        render();
        writeHistory("replace");
      });
      topPartTabs.appendChild(button);
    });
    workspaceTop.appendChild(topPartTabs);
    workspace.appendChild(workspaceTop);

    const groupsWrap = document.createElement("div");
    groupsWrap.className = "thptqg-exam-groups";
    (Array.isArray(activePart?.groups) ? activePart.groups : []).forEach((group) => {
      const questionNumbers = Array.isArray(group?.questionNumbers) ? group.questionNumbers : [];
      const longReading = isLongReadingGroup(group);
      const section = document.createElement("section");
      section.className = longReading ? "thptqg-exam-group-layout" : "thptqg-compact-group";

      function appendQuestionCard(question, container, variant = "default") {
        const questionId = String(question.id || "");
        const pickedIndex = answersByQuestion[questionId];
        const answered = Number.isFinite(Number(pickedIndex));
        const card = document.createElement("article");
        card.className = `thptqg-question-card${currentQuestion === questionId ? " current" : ""}${variant === "compact" ? " compact" : ""}`;
        card.dataset.questionId = questionId;

        const header = document.createElement("div");
        header.className = `thptqg-question-head${variant === "compact" ? " compact" : ""}`;
        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "thptqg-question-badge";
        badge.textContent = String(question.number);
        badge.addEventListener("click", () => {
          currentQuestion = questionId;
          pendingScrollQuestionId = questionId;
          emitState();
          render();
          writeHistory("replace");
        });
        header.appendChild(badge);

        if (variant !== "compact") {
          const status = document.createElement("div");
          status.className = `thptqg-question-status${answered ? " answered" : ""}`;
          status.textContent = answered ? `Đã chọn ${answerLetter(pickedIndex)}` : "Chưa chọn";
          header.appendChild(status);
          const flagBtn = createButton(flaggedQuestions.has(questionId) ? "Bỏ đánh dấu" : "Đánh dấu", "thptqg-flag-btn", () => toggleFlag(questionId));
          if (flaggedQuestions.has(questionId)) flagBtn.classList.add("active");
          header.appendChild(flagBtn);
        }

        card.appendChild(header);

        const prompt = document.createElement("p");
        prompt.className = `exp-q-text${variant === "compact" ? " compact" : ""}`;
        renderQuizStemRichText(prompt, stripQuestionLabel(question.prompt));
        card.appendChild(prompt);

        const optionsWrap = document.createElement("div");
        optionsWrap.className = variant === "compact" ? "exp-option-grid compact" : "exp-option-grid";
        (Array.isArray(question.options) ? question.options : []).forEach((option, optionIndex) => {
          const optionBtn = document.createElement("button");
          optionBtn.type = "button";
          optionBtn.className = `exp-opt-btn${Number(pickedIndex) === optionIndex ? " selected" : ""}${variant === "compact" ? " compact" : ""}`;
          optionBtn.textContent = `${OPTION_LETTERS[optionIndex] || optionIndex}. ${option}`;
          optionBtn.addEventListener("click", () => pickAnswer(questionId, optionIndex));
          optionsWrap.appendChild(optionBtn);
        });
        card.appendChild(optionsWrap);
        container.appendChild(card);
      }

      if (longReading) {
        const passagePane = document.createElement("div");
        passagePane.className = "thptqg-passage-pane";
        const title = document.createElement("h3");
        title.className = "thptqg-group-title";
        title.textContent = String(group?.title || "");
        passagePane.appendChild(title);
        if (group?.instruction) {
          const instruction = document.createElement("p");
          instruction.className = "thptqg-group-instruction";
          instruction.textContent = String(group.instruction);
          passagePane.appendChild(instruction);
        }
        if (Array.isArray(group?.context) && group.context.length) {
          const contextWrap = document.createElement("div");
          contextWrap.className = "thptqg-context thptqg-passage-scroll";
          group.context.forEach((line) => {
            const paragraph = document.createElement("p");
            paragraph.textContent = String(line);
            contextWrap.appendChild(paragraph);
          });
          passagePane.appendChild(contextWrap);
        }

        const questionPane = document.createElement("div");
        questionPane.className = "thptqg-question-pane";
        const questionPaneHead = document.createElement("div");
        questionPaneHead.className = "thptqg-question-pane-head";
        questionPaneHead.innerHTML = `
          <div class="thptqg-question-pane-title">Câu hỏi</div>
          <div class="thptqg-inline-note">Chọn đáp án và dùng sidebar bên phải để nhảy nhanh tới câu cần làm.</div>
        `;
        questionPane.appendChild(questionPaneHead);
        const questionScroll = document.createElement("div");
        questionScroll.className = "thptqg-question-scroll";
        questionNumbers.forEach((questionNumber) => {
          const question = (Array.isArray(test.questions) ? test.questions : []).find((item) => Number(item?.number) === Number(questionNumber));
          if (!question) return;
          appendQuestionCard(question, questionScroll);
        });
        questionPane.appendChild(questionScroll);
        section.appendChild(passagePane);
        section.appendChild(questionPane);
      } else {
        const compactHead = document.createElement("div");
        compactHead.className = "thptqg-compact-head";
        const compactTitle = document.createElement("h3");
        compactTitle.className = "thptqg-group-title";
        compactTitle.textContent = String(group?.title || "");
        compactHead.appendChild(compactTitle);
        if (group?.instruction) {
          const compactInstruction = document.createElement("p");
          compactInstruction.className = "thptqg-group-instruction";
          compactInstruction.textContent = String(group.instruction);
          compactHead.appendChild(compactInstruction);
        }
        section.appendChild(compactHead);

        if (Array.isArray(group?.context) && group.context.length) {
          const compactContext = document.createElement("div");
          compactContext.className = "thptqg-compact-context";
          group.context.forEach((line) => {
            const paragraph = document.createElement("p");
            paragraph.textContent = String(line);
            compactContext.appendChild(paragraph);
          });
          section.appendChild(compactContext);
        }

        const compactList = document.createElement("div");
        compactList.className = "thptqg-compact-list";
        questionNumbers.forEach((questionNumber) => {
          const question = (Array.isArray(test.questions) ? test.questions : []).find((item) => Number(item?.number) === Number(questionNumber));
          if (!question) return;
          appendQuestionCard(question, compactList, "compact");
        });
        section.appendChild(compactList);
      }
      groupsWrap.appendChild(section);
    });
    workspace.appendChild(groupsWrap);

    const timerCard = document.createElement("div");
    timerCard.className = "thptqg-side-card";
    timerCard.innerHTML = `<div class="thptqg-side-title">${reviewMode && submittedAt ? "Thời gian làm bài tổng" : "Thời gian làm bài"}</div>`;
    timerValueEl = document.createElement("div");
    timerValueEl.className = "thptqg-timer";
    timerValueEl.textContent = formatElapsed(getCurrentElapsedSeconds());
    timerCard.appendChild(timerValueEl);
    timerCard.appendChild(
      reviewMode && submittedAt
        ? createButton("Xem kết quả", "thptqg-submit-btn", () => {
            view = "result";
            emitState();
            render();
            writeHistory("replace");
          })
        : createButton("Nộp bài", "thptqg-submit-btn", () => submitTest(test, "replace")),
    );
    sidebar.appendChild(timerCard);

    const partsCard = document.createElement("div");
    partsCard.className = "thptqg-side-card";
    partsCard.innerHTML = `<div class="thptqg-side-title">Danh sách part</div>`;
    const partList = document.createElement("div");
    partList.className = "thptqg-part-switches";
    parts.forEach((part) => {
      const button = createButton(String(part?.label || ""), `thptqg-part-btn${currentPartId === part.id ? " active" : ""}`, () => {
        currentPartId = String(part.id || "");
        const firstQuestionNumber = Number(part?.questionStart || 0);
        const firstQuestion = (Array.isArray(test.questions) ? test.questions : []).find((question) => Number(question?.number) === firstQuestionNumber);
        currentQuestion = String(firstQuestion?.id || currentQuestion);
        emitState();
        render();
        writeHistory("replace");
      });
      partList.appendChild(button);
    });
    partsCard.appendChild(partList);
    sidebar.appendChild(partsCard);

    const mapCard = document.createElement("div");
    mapCard.className = "thptqg-side-card";
    mapCard.innerHTML = `<div class="thptqg-side-title">Question map</div>`;
    parts.forEach((part) => {
      const title = document.createElement("div");
      title.className = "thptqg-map-part-title";
      title.textContent = String(part?.label || "");
      mapCard.appendChild(title);
      const mapGrid = document.createElement("div");
      mapGrid.className = "thptqg-question-map";
      const start = Number(part?.questionStart || 0);
      const end = Number(part?.questionEnd || 0);
      for (let questionNumber = start; questionNumber <= end; questionNumber += 1) {
        const question = (Array.isArray(test.questions) ? test.questions : []).find((item) => Number(item?.number) === questionNumber);
        if (!question) continue;
        const questionId = String(question.id || "");
        const mapBtn = document.createElement("button");
        mapBtn.type = "button";
        const answered = Number.isFinite(Number(answersByQuestion[questionId]));
        mapBtn.className = "thptqg-map-btn";
        if (questionId === currentQuestion) mapBtn.classList.add("active");
        if (answered) mapBtn.classList.add("answered");
        if (flaggedQuestions.has(questionId)) mapBtn.classList.add("flagged");
        mapBtn.textContent = String(question.number);
        mapBtn.addEventListener("click", () => jumpToQuestion(test, questionId));
        mapGrid.appendChild(mapBtn);
      }
      mapCard.appendChild(mapGrid);
    });
    sidebar.appendChild(mapCard);

    layout.appendChild(workspace);
    layout.appendChild(sidebar);
    stage.appendChild(layout);

    if (pendingScrollQuestionId) {
      const target = stage.querySelector(`[data-question-id="${pendingScrollQuestionId}"]`);
      if (target instanceof HTMLElement) target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      pendingScrollQuestionId = "";
    } else {
      restoreAttemptScrollState(previousScrollState);
    }
  }

  function renderResult(test) {
    stage.innerHTML = "";
    const result = computeResultSummary(test, answersByQuestion);
    const parts = Array.isArray(test.parts) ? test.parts : [];
    const questionMap = getQuestionMap(test);
    const visiblePartStats =
      activeResultPartId === "overview"
        ? result.partStats
        : result.partStats.filter((item) => item.partId === activeResultPartId);

    const actionRow = document.createElement("div");
    actionRow.className = "thptqg-action-row";
    actionRow.appendChild(createButton("Danh sách đề", "thptqg-secondary-btn", () => openCatalog("replace")));
    actionRow.appendChild(createButton("Xem lại bài làm", "thptqg-secondary-btn", () => {
      view = "attempt";
      render();
      emitState();
      writeHistory("replace");
    }));
    actionRow.appendChild(createButton("Làm lại đề", "thptqg-secondary-btn", () => restartTest(test, "replace")));
    stage.appendChild(actionRow);

    const scoreRow = document.createElement("div");
    scoreRow.className = "thptqg-result-cards";
    const cards = [
      { label: "Đúng", value: `${result.correct}/${result.total}`, tone: "ok" },
      { label: "Sai", value: String(result.wrong), tone: "bad" },
      { label: "Bỏ qua", value: String(result.skipped), tone: "muted" },
      { label: "Không chấm", value: String(result.invalid), tone: "muted" },
      { label: "Điểm 10", value: result.score10.toFixed(1), tone: "accent" },
    ];
    cards.forEach((item) => {
      const card = document.createElement("div");
      card.className = `thptqg-result-card ${item.tone}`;
      card.innerHTML = `<div class="thptqg-result-label">${item.label}</div><div class="thptqg-result-value">${item.value}</div>`;
      scoreRow.appendChild(card);
    });
    stage.appendChild(scoreRow);

    const summaryCard = document.createElement("div");
    summaryCard.className = "thptqg-summary-card";
    const summaryTitle = document.createElement("div");
    appendTextBlock(summaryTitle, "strong", "", test.title);
    summaryCard.appendChild(summaryTitle);
    appendTextBlock(summaryCard, "div", "", `Thời gian hoàn thành: ${formatElapsed(elapsedSeconds)}`);
    appendTextBlock(summaryCard, "div", "", "Trạng thái: Đã nộp bài");
    stage.appendChild(summaryCard);

    const filterRow = document.createElement("div");
    filterRow.className = "thptqg-result-tabs";
    const overviewBtn = createButton("Tổng quát", `thptqg-result-tab${activeResultPartId === "overview" ? " active" : ""}`, () => {
      activeResultPartId = "overview";
      emitState();
      render();
      writeHistory("replace");
    });
    filterRow.appendChild(overviewBtn);
    parts.forEach((part) => {
      const partId = String(part?.id || "");
      const button = createButton(String(part?.label || ""), `thptqg-result-tab${activeResultPartId === partId ? " active" : ""}`, () => {
        activeResultPartId = partId || "overview";
        emitState();
        render();
        writeHistory("replace");
      });
      filterRow.appendChild(button);
    });
    stage.appendChild(filterRow);

    const tableWrap = document.createElement("div");
    tableWrap.className = "thptqg-table-wrap";
    const table = document.createElement("table");
    table.className = "thptqg-result-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Part</th>
          <th>Số câu đúng</th>
          <th>Số câu sai</th>
          <th>Số câu bỏ qua</th>
          <th>Không thể chấm</th>
          <th>Độ chính xác</th>
          <th>Danh sách câu hỏi</th>
        </tr>
      </thead>
    `;
    const tbody = document.createElement("tbody");
    visiblePartStats.forEach((stat) => {
      const row = document.createElement("tr");
      const questionsCell = document.createElement("td");
      questionsCell.className = "thptqg-cell-questions";
      stat.questionIds.forEach((questionId) => {
        const question = questionMap.get(questionId);
        const chipState = question ? getQuestionAnswerState(question, answersByQuestion) : "unanswered";
        const chip = createButton(String(question?.number || ""), `thptqg-chip-btn ${chipState}`, () => {
          resultReviewFilter = "all";
          detailQuestionId = questionId;
          emitState();
          render();
          writeHistory("replace");
        });
        questionsCell.appendChild(chip);
      });
      [
        `${stat.label} - ${stat.title}`,
        String(stat.correct),
        String(stat.wrong),
        String(stat.skipped),
        String(stat.invalid),
        `${stat.accuracy.toFixed(2)}%`,
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      row.appendChild(questionsCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    stage.appendChild(tableWrap);

    const detailSection = document.createElement("section");
    detailSection.className = "thptqg-detail-section";
    const detailTitle = document.createElement("h3");
    detailTitle.className = "thptqg-detail-title";
    detailTitle.textContent = "Đáp án chi tiết";
    detailSection.appendChild(detailTitle);

    const detailFilterRow = document.createElement("div");
    detailFilterRow.className = "quiz-review-filters";
    const allQuestionsBtn = createButton(
      "Tất cả câu",
      `quiz-review-filter-btn${resultReviewFilter === "all" ? " active" : ""}`,
      () => {
        resultReviewFilter = "all";
        detailQuestionId = "";
        emitState();
        render();
        writeHistory("replace");
      },
    );
    const wrongQuestionsBtn = createButton(
      "Các câu sai",
      `quiz-review-filter-btn${resultReviewFilter === "wrong" ? " active" : ""}`,
      () => {
        resultReviewFilter = "wrong";
        detailQuestionId = "";
        emitState();
        render();
        writeHistory("replace");
      },
    );
    detailFilterRow.appendChild(allQuestionsBtn);
    detailFilterRow.appendChild(wrongQuestionsBtn);
    detailSection.appendChild(detailFilterRow);

    const partFilter = activeResultPartId === "overview" ? null : activeResultPartId;
    ensureDetailCardCache(selectedTestId);
    const questionsByPart = buildQuestionsByPart(test);
    const detailQuestion = detailQuestionId ? questionMap.get(detailQuestionId) || null : null;
    const prioritizedPartId = !partFilter ? String(detailQuestion?.partId || "") : "";
    const orderedParts = !prioritizedPartId
      ? parts
      : [
          ...parts.filter((part) => String(part?.id || "") === prioritizedPartId),
          ...parts.filter((part) => String(part?.id || "") !== prioritizedPartId),
        ];
    let hasVisibleQuestions = false;
    orderedParts
      .filter((part) => !partFilter || String(part?.id || "") === partFilter)
      .forEach((part) => {
        const questions = questionsByPart.get(String(part?.id || "")) || [];
        const visibleQuestions = questions.filter((question) => {
          if (resultReviewFilter !== "wrong") return true;
          return getQuestionAnswerState(question, answersByQuestion) === "wrong";
        });
        if (!visibleQuestions.length) return;
        hasVisibleQuestions = true;
        const orderedQuestions =
          detailQuestionId && visibleQuestions.some((question) => String(question?.id || "") === detailQuestionId)
            ? [
                visibleQuestions.find((question) => String(question?.id || "") === detailQuestionId),
                ...visibleQuestions.filter((question) => String(question?.id || "") !== detailQuestionId),
              ].filter(Boolean)
            : visibleQuestions;

        const block = document.createElement("div");
        block.className = "thptqg-detail-block";
        const blockTitle = document.createElement("h4");
        blockTitle.textContent = `${part.label} - ${part.title}`;
        block.appendChild(blockTitle);
        const list = document.createElement("div");
        list.className = "thptqg-detail-cards";
        orderedQuestions.forEach((question) => {
          list.appendChild(getOrCreateDetailCard(question));
        });
        block.appendChild(list);
        detailSection.appendChild(block);
      });

    if (!hasVisibleQuestions) {
      const empty = document.createElement("p");
      empty.className = "exp-empty thptqg-detail-empty";
      empty.textContent =
        resultReviewFilter === "wrong"
          ? "Tuyệt vời! Phần này không có câu sai để xem đáp án chi tiết."
          : "Chưa có dữ liệu để hiển thị.";
      detailSection.appendChild(empty);
    }

    stage.appendChild(detailSection);
  }

  function render() {
    const activeTest = getActiveTest();
    shell.classList.toggle("thptqg-attempt-screen", view === "attempt" && Boolean(activeTest));
    shell.classList.toggle("thptqg-result-screen", view === "result" && Boolean(activeTest));
    shell.classList.toggle("thptqg-catalog-screen", view === "catalog" || !activeTest);
    if (view === "catalog" || !activeTest) {
      renderCatalog();
      timerValueEl = null;
      return;
    }
    ensureSelectionForTest(activeTest);
    if (view === "result") renderResult(activeTest);
    else renderAttempt(activeTest);
    updateTimer();
  }

  scheduleTimerTick();

  removalObserver = new MutationObserver(() => {
    if (!root.contains(shell)) {
      disposeExperience();
    }
  });
  removalObserver.observe(root, { childList: true });

  const restoredTest = getActiveTest();
  if (restoredTest && !reviewMode && submittedAt) {
    view = "result";
  }
  if (restoredTest) ensureSelectionForTest(restoredTest);
  emitState();
  render();
  writeHistory("replace");
}

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

function toValidMinutes(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : null;
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

function appendRichTextBlock(parent, tagName, className, text) {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  renderQuizStemRichText(el, text);
  parent.appendChild(el);
  return el;
}

function isLongReadingGroup(group) {
  const normalizedGroup = splitEmbeddedInstructionContext(group);
  const context = normalizedGroup.context;
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

function normalizeTestProgressEntry(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    answersByQuestion: cloneRecord(safe.answersByQuestion),
    flaggedQuestions: Array.isArray(safe.flaggedQuestions) ? safe.flaggedQuestions.map(String) : [],
    selectedPartIds: Array.isArray(safe.selectedPartIds) ? safe.selectedPartIds.map(String) : [],
    configuredDurationMinutes: toValidMinutes(safe.configuredDurationMinutes),
    currentPartId: typeof safe.currentPartId === "string" ? safe.currentPartId : "",
    currentQuestion: typeof safe.currentQuestion === "string" ? safe.currentQuestion : "",
    startedAt: typeof safe.startedAt === "string" ? safe.startedAt : "",
    elapsedSeconds: Number.isFinite(Number(safe.elapsedSeconds)) ? Math.max(0, Math.floor(Number(safe.elapsedSeconds))) : 0,
    submittedAt: typeof safe.submittedAt === "string" ? safe.submittedAt : "",
    reviewMode: Boolean(safe.reviewMode),
    activeResultPartId: typeof safe.activeResultPartId === "string" ? safe.activeResultPartId : "overview",
    resultReviewFilter: safe.resultReviewFilter === "wrong" ? "wrong" : "all",
    detailQuestionId: typeof safe.detailQuestionId === "string" ? safe.detailQuestionId : "",
  };
}

function normalizeTestProgressById(input) {
  if (!input || typeof input !== "object") return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([testId]) => typeof testId === "string" && testId)
      .map(([testId, value]) => [testId, normalizeTestProgressEntry(value)]),
  );
}

function splitEmbeddedInstructionContext(group) {
  const rawInstruction = String(group?.instruction || "").trim();
  const rawContext = Array.isArray(group?.context) ? group.context.map((line) => String(line || "").trim()).filter(Boolean) : [];
  if (rawContext.length || !rawInstruction) {
    return {
      instruction: rawInstruction,
      context: rawContext,
    };
  }

  const embeddedPassageMatch = rawInstruction.match(/^(.*?\bfrom\s+\d+\s+to\s+\d+\.\s*)(.+)$/i);
  if (!embeddedPassageMatch) {
    return {
      instruction: rawInstruction,
      context: rawContext,
    };
  }

  return {
    instruction: embeddedPassageMatch[1].trim(),
    context: [embeddedPassageMatch[2].trim()],
  };
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPromptFocus(prompt) {
  const text = String(prompt || "");
  const paragraphMatch = text.match(/\bparagraph\s+(\d+)/i);
  const quotedMatch = text.match(/["“]([^"”]{1,80})["”]/) || text.match(/'([^']{1,80})'/);
  const explicitWordMatch =
    text.match(/\b(?:word|pronoun|phrase)\s+([A-Za-z][A-Za-z'’-]{1,40}(?:\s+[A-Za-z][A-Za-z'’-]{1,40}){0,4})\s+in\s+paragraph\b/i)
    || text.match(/\b(?:word|pronoun|phrase)\s+([A-Za-z][A-Za-z'’-]{1,40}(?:\s+[A-Za-z][A-Za-z'’-]{1,40}){0,4})\s+refers?\b/i);
  const term = quotedMatch?.[1] || explicitWordMatch?.[1] || "";
  return {
    paragraphNumber: paragraphMatch ? Number(paragraphMatch[1]) : null,
    term: String(term || "").trim(),
    underline: /\bunderlined\b/i.test(text),
  };
}

function emphasizePromptReferences(prompt) {
  let next = String(prompt || "");
  next = next.replace(/\bparagraph\s+(\d+)/gi, "**paragraph $1**");
  const focus = extractPromptFocus(next);
  if (!focus.term) return next;

  if (next.includes(`"${focus.term}"`)) {
    return next.replace(`"${focus.term}"`, `"**${focus.term}**"`);
  }
  if (next.includes(`'${focus.term}'`)) {
    return next.replace(`'${focus.term}'`, `'**${focus.term}**'`);
  }
  const termPattern = new RegExp(`\\b${escapeRegExp(focus.term)}\\b`, "i");
  return next.replace(termPattern, `**${focus.term}**`);
}

function appendHighlightedPassageLine(target, line, focus) {
  if (!(target instanceof HTMLElement)) return;
  const text = String(line || "");
  if (!focus?.term) {
    target.appendChild(document.createTextNode(text));
    return;
  }
  const pattern = focus.term.includes(" ")
    ? new RegExp(escapeRegExp(focus.term), "ig")
    : new RegExp(`\\b${escapeRegExp(focus.term)}\\b`, "ig");
  let lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    const [token] = match;
    const tokenIndex = match.index;
    if (tokenIndex > lastIndex) {
      target.appendChild(document.createTextNode(text.slice(lastIndex, tokenIndex)));
    }
    const mark = document.createElement("mark");
    mark.className = `thptqg-focus-term${focus.underline ? " underline" : ""}`;
    mark.textContent = token;
    target.appendChild(mark);
    lastIndex = tokenIndex + token.length;
    match = pattern.exec(text);
  }
  if (lastIndex < text.length) {
    target.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function renderPassageParagraph(target, text, focus, paragraphIndex, paragraphCount) {
  if (!(target instanceof HTMLElement)) return;
  target.replaceChildren();
  if (paragraphCount > 1) {
    const label = document.createElement("span");
    label.className = "thptqg-paragraph-label";
    label.textContent = `Paragraph ${paragraphIndex + 1}`;
    target.appendChild(label);
  }
  const effectiveFocus =
    focus?.paragraphNumber && focus.paragraphNumber !== paragraphIndex + 1
      ? null
      : focus;
  const lines = String(text || "").split("\n");
  lines.forEach((line, lineIndex) => {
    appendHighlightedPassageLine(target, line, effectiveFocus);
    if (lineIndex < lines.length - 1) {
      target.appendChild(document.createElement("br"));
    }
  });
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
  let testProgressById = normalizeTestProgressById(initial?.testProgressById);

  let view = initial?.view === "config" || initial?.view === "attempt" || initial?.view === "result" ? initial.view : "catalog";
  let selectedTestId =
    typeof initial?.testId === "string" && initial.testId
      ? initial.testId
      : typeof meta?.testId === "string" && meta.testId
        ? meta.testId
        : "";
  let answersByQuestion = cloneRecord(initial?.answersByQuestion);
  let flaggedQuestions = new Set(Array.isArray(initial?.flaggedQuestions) ? initial.flaggedQuestions.map(String) : []);
  let selectedPartIds = Array.isArray(initial?.selectedPartIds) ? initial.selectedPartIds.map(String) : [];
  let configuredDurationMinutes = toValidMinutes(initial?.configuredDurationMinutes);
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
  let pendingRestartTestId = "";
  const historyAbort = new AbortController();
  let timer = 0;
  let removalObserver = null;
  let disposed = false;
  let detailCardCacheTestId = "";
  /** @type {Map<string, { signature: string, element: HTMLDivElement }>} */
  const detailCardCache = new Map();

  if (selectedTestId && !testProgressById[selectedTestId]) {
    testProgressById[selectedTestId] = normalizeTestProgressEntry({
      answersByQuestion,
      flaggedQuestions: [...flaggedQuestions],
      selectedPartIds,
      configuredDurationMinutes,
      currentPartId,
      currentQuestion,
      startedAt,
      elapsedSeconds,
      submittedAt,
      reviewMode,
      activeResultPartId,
      resultReviewFilter,
      detailQuestionId,
    });
  }

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-thptqg";
  shell.appendChild(createExperienceTopBar({ title: meta.catalogTitle || bundle.catalog.title }).bar);

  const stage = document.createElement("div");
  stage.className = "exp-stage";
  shell.appendChild(stage);
  root.appendChild(shell);

  function getActiveTest() {
    return bundle.tests.find((test) => test.id === selectedTestId) || null;
  }

  function getSelectedPartIdsForTest(test) {
    const availableIds = (Array.isArray(test?.parts) ? test.parts : []).map((part) => String(part?.id || "")).filter(Boolean);
    const nextSelected = selectedPartIds.filter((partId) => availableIds.includes(partId));
    if (nextSelected.length) return nextSelected;
    return availableIds;
  }

  function ensureSelectedPartsForTest(test) {
    selectedPartIds = getSelectedPartIdsForTest(test);
  }

  function getConfiguredParts(test) {
    const selectedIds = getSelectedPartIdsForTest(test);
    return (Array.isArray(test?.parts) ? test.parts : []).filter((part) => selectedIds.includes(String(part?.id || "")));
  }

  function getConfiguredQuestions(test) {
    const selectedIds = new Set(getSelectedPartIdsForTest(test));
    return (Array.isArray(test?.questions) ? test.questions : []).filter((question) => selectedIds.has(String(question?.partId || "")));
  }

  function getConfiguredTest(test) {
    if (!test) return null;
    const questions = getConfiguredQuestions(test);
    return {
      ...test,
      parts: getConfiguredParts(test),
      questions,
      questionCount: questions.length,
    };
  }

  function getQuestionMap(test) {
    const map = new Map();
    (Array.isArray(test?.questions) ? test.questions : []).forEach((question) => {
      map.set(String(question?.id || ""), question);
    });
    return map;
  }

  function buildCurrentTestProgressSnapshot() {
    return normalizeTestProgressEntry({
      answersByQuestion,
      flaggedQuestions: [...flaggedQuestions],
      selectedPartIds,
      configuredDurationMinutes,
      currentPartId,
      currentQuestion,
      startedAt,
      elapsedSeconds: getCurrentElapsedSeconds(),
      submittedAt,
      reviewMode,
      activeResultPartId,
      resultReviewFilter,
      detailQuestionId,
    });
  }

  function syncCurrentTestProgress() {
    if (!selectedTestId) return;
    testProgressById = {
      ...testProgressById,
      [selectedTestId]: buildCurrentTestProgressSnapshot(),
    };
  }

  function applyTestProgress(test, snapshot) {
    const progress = normalizeTestProgressEntry(snapshot);
    selectedTestId = String(test?.id || "");
    answersByQuestion = cloneRecord(progress.answersByQuestion);
    flaggedQuestions = new Set(progress.flaggedQuestions);
    selectedPartIds = progress.selectedPartIds;
    configuredDurationMinutes = progress.configuredDurationMinutes;
    currentPartId = progress.currentPartId;
    currentQuestion = progress.currentQuestion;
    startedAt = progress.startedAt;
    elapsedSeconds = progress.elapsedSeconds;
    submittedAt = progress.submittedAt;
    reviewMode = progress.reviewMode;
    activeResultPartId = progress.activeResultPartId;
    resultReviewFilter = progress.resultReviewFilter;
    detailQuestionId = progress.detailQuestionId;
    elapsedBaseSeconds = elapsedSeconds;
    elapsedBaseTick = Date.now();
    ensureSelectedPartsForTest(test);
    ensureSelectionForTest(test);
  }

  function loadTestProgress(test) {
    if (!test) return;
    const saved = testProgressById[String(test.id || "")];
    if (saved) {
      applyTestProgress(test, saved);
      return;
    }
    applyTestProgress(test, {
      selectedPartIds: (Array.isArray(test?.parts) ? test.parts : []).map((part) => String(part?.id || "")).filter(Boolean),
    });
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
    ensureSelectedPartsForTest(test);
    const parts = getConfiguredParts(test);
    if (!currentPartId || !parts.some((part) => String(part?.id || "") === currentPartId)) {
      currentPartId = String(parts[0]?.id || "");
    }
    const questions = getConfiguredQuestions(test);
    if (!currentQuestion || !questions.some((question) => String(question?.id || "") === currentQuestion)) {
      currentQuestion = String(questions[0]?.id || "");
    }
  }

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    const activeTest = getActiveTest();
    ensureSelectionForTest(activeTest);
    syncCurrentTestProgress();
    const questions = Array.isArray(activeTest?.questions) ? getConfiguredQuestions(activeTest) : [];
    const questionIndex = questions.findIndex((question) => String(question?.id || "") === currentQuestion);
    opts.onStateChange({
      kind: "thptqg_fulltest",
      meta: {
        ...meta,
        ...(activeTest ? { testId: activeTest.id, testTitle: activeTest.title } : {}),
      },
      title: activeTest?.title || meta.catalogTitle || bundle.catalog.title,
      total: activeTest ? getConfiguredQuestions(activeTest).length || 1 : bundle.tests.length || 1,
      index: questionIndex >= 0 ? questionIndex : 0,
      view,
      testId: selectedTestId,
      answersByQuestion: { ...answersByQuestion },
      flaggedQuestions: [...flaggedQuestions],
      selectedPartIds: [...selectedPartIds],
      configuredDurationMinutes,
      currentPartId,
      currentQuestion,
      startedAt,
      elapsedSeconds: snapshotElapsed(),
      submittedAt,
      reviewMode,
      activeResultPartId,
      resultReviewFilter,
      detailQuestionId,
      testProgressById,
    });
  }

  function updateTimer() {
    if (!timerValueEl) return;
    const currentElapsed = getCurrentElapsedSeconds();
    if (view === "attempt" && !submittedAt && Number.isFinite(Number(configuredDurationMinutes)) && Number(configuredDurationMinutes) > 0) {
      const remainingSeconds = Math.max(0, Number(configuredDurationMinutes) * 60 - currentElapsed);
      timerValueEl.textContent = formatElapsed(remainingSeconds);
      return;
    }
    timerValueEl.textContent = formatElapsed(currentElapsed);
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
    if (Number.isFinite(Number(configuredDurationMinutes)) && Number(configuredDurationMinutes) > 0) {
      const limitSeconds = Number(configuredDurationMinutes) * 60;
      if (getCurrentElapsedSeconds() >= limitSeconds) {
        elapsedSeconds = limitSeconds;
        elapsedBaseSeconds = limitSeconds;
        elapsedBaseTick = Date.now();
        submittedAt = new Date().toISOString();
        reviewMode = true;
        view = "result";
        activeResultPartId = "overview";
        resultReviewFilter = "all";
        detailQuestionId = "";
        emitState();
        render();
        return;
      }
    }
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
      selectedPartIds: [...selectedPartIds],
      configuredDurationMinutes,
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
    view = snapshot.view === "config" || snapshot.view === "attempt" || snapshot.view === "result" ? snapshot.view : "catalog";
    selectedTestId = typeof snapshot.testId === "string" ? snapshot.testId : "";
    selectedPartIds = Array.isArray(snapshot.selectedPartIds) ? snapshot.selectedPartIds.map(String) : selectedPartIds;
    configuredDurationMinutes = toValidMinutes(snapshot.configuredDurationMinutes);
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
    syncCurrentTestProgress();
    view = "catalog";
    resetDetailCardCache();
    activeResultPartId = "overview";
    resultReviewFilter = "all";
    detailQuestionId = "";
    emitState();
    render();
    writeHistory(historyMode);
  }

  function openTestConfig(test, historyMode = "replace") {
    if (!test || test.status !== "available") return;
    if (String(test.id || "") !== String(selectedTestId || "")) syncCurrentTestProgress();
    loadTestProgress(test);
    resetDetailCardCache();
    view = "config";
    activeResultPartId = "overview";
    resultReviewFilter = "all";
    detailQuestionId = "";
    ensureSelectionForTest(test);
    emitState();
    render();
    writeHistory(historyMode);
  }

  function queueRestartAttempt(test) {
    pendingRestartTestId = test && test.status === "available" ? String(test.id || "") : "";
  }

  function resetAttemptProgress(test) {
    if (!test || test.status !== "available") return;
    applyTestProgress(test, {
      selectedPartIds: (Array.isArray(test?.parts) ? test.parts : []).map((part) => String(part?.id || "")).filter(Boolean),
    });
    syncCurrentTestProgress();
    resetDetailCardCache();
  }

  function startOrResumeTest(test, historyMode = "replace") {
    if (!test || test.status !== "available") return;
    if (String(test.id || "") !== String(selectedTestId || "")) syncCurrentTestProgress();
    loadTestProgress(test);
    if (pendingRestartTestId && pendingRestartTestId === String(test.id || "")) {
      resetAttemptProgress(test);
      pendingRestartTestId = "";
    }
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
    queueRestartAttempt(test);
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

  function jumpToPartStart(test, part) {
    const nextPartId = String(part?.id || "");
    if (!nextPartId) return;
    const firstQuestionNumber = Number(part?.questionStart || 0);
    const configuredQuestions = getConfiguredQuestions(test);
    const partQuestions = configuredQuestions
      .filter((question) => String(question?.partId || "") === nextPartId)
      .sort((a, b) => Number(a?.number || 0) - Number(b?.number || 0));
    const firstQuestion =
      (firstQuestionNumber > 0
        ? configuredQuestions.find((question) => Number(question?.number) === firstQuestionNumber)
        : null)
      || partQuestions[0]
      || null;
    currentPartId = nextPartId;
    if (firstQuestion?.id) {
      currentQuestion = String(firstQuestion.id);
      pendingScrollQuestionId = currentQuestion;
    }
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
      const testProgress = testProgressById[String(test.id || "")] || null;
      const isSelected = test.id === selectedTestId;
      const isLocked = test.status !== "available";
      const isSubmitted = Boolean(testProgress?.submittedAt);
      const isInProgress = Boolean(
        testProgress
        && !testProgress.submittedAt
        && (testProgress.startedAt || Object.keys(testProgress.answersByQuestion || {}).length > 0),
      );
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
          syncCurrentTestProgress();
          loadTestProgress(test);
          view = "result";
          reviewMode = true;
          render();
          emitState();
          writeHistory("replace");
          return;
        }
        openTestConfig(test);
      });
      action.disabled = isLocked;
      card.appendChild(action);
      grid.appendChild(card);
    });
    stage.appendChild(grid);
  }

  function renderTestConfig(test) {
    stage.innerHTML = "";
    const configuredParts = getConfiguredParts(test);

    const wrap = document.createElement("section");
    wrap.className = "thptqg-config-card";

    appendTextBlock(wrap, "h2", "thptqg-title", test.title);

    const tabs = document.createElement("div");
    tabs.className = "thptqg-config-tabs";
    appendTextBlock(tabs, "button", "thptqg-config-tab active", "Thông tin đề thi");
    wrap.appendChild(tabs);

    const metaBlock = document.createElement("div");
    metaBlock.className = "thptqg-config-meta";
    appendTextBlock(
      metaBlock,
      "div",
      "thptqg-test-meta",
      `⏱ Thời gian làm bài: ${formatMinutes(test.durationMinutes)} | ${test.parts.length} phần thi | ${test.questionCount} câu`,
    );
    wrap.appendChild(metaBlock);

    const note = document.createElement("p");
    note.className = "thptqg-config-note";
    note.textContent = "Pro tips: Hình thức luyện tập từng phần và chọn thời gian phù hợp sẽ giúp bạn tập trung hơn khi làm bài.";
    wrap.appendChild(note);

    appendTextBlock(wrap, "h3", "thptqg-config-section-title", "Chọn part thi bạn muốn làm");
    const partList = document.createElement("div");
    partList.className = "thptqg-config-parts";
    (Array.isArray(test.parts) ? test.parts : []).forEach((part) => {
      const partId = String(part?.id || "");
      const row = document.createElement("label");
      row.className = "thptqg-config-part-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedPartIds.includes(partId);
      checkbox.addEventListener("change", () => {
        const nextSet = new Set(selectedPartIds);
        if (checkbox.checked) nextSet.add(partId);
        else nextSet.delete(partId);
        if (!nextSet.size) {
          checkbox.checked = true;
          return;
        }
        selectedPartIds = Array.from(nextSet);
        ensureSelectionForTest(test);
        emitState();
        render();
        writeHistory("replace");
      });
      const copy = document.createElement("div");
      copy.className = "thptqg-config-part-copy";
      appendTextBlock(copy, "div", "thptqg-config-part-title", `${part.label} (10 câu hỏi)`);
      appendTextBlock(copy, "div", "thptqg-inline-note", part.title || "Phần luyện đề");
      row.append(checkbox, copy);
      partList.appendChild(row);
    });
    wrap.appendChild(partList);

    appendTextBlock(wrap, "h3", "thptqg-config-section-title", "Giới hạn thời gian (Để trống để làm bài không giới hạn)");
    const select = document.createElement("select");
    select.className = "thptqg-config-duration";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn thời gian --";
    placeholder.selected = configuredDurationMinutes == null;
    select.appendChild(placeholder);
    [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].forEach((minutes) => {
      const option = document.createElement("option");
      option.value = String(minutes);
      option.textContent = formatMinutes(minutes);
      if (configuredDurationMinutes === minutes) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      configuredDurationMinutes = toValidMinutes(select.value);
      emitState();
      writeHistory("replace");
    });
    wrap.appendChild(select);

    const summary = document.createElement("div");
    summary.className = "thptqg-config-summary";
    appendTextBlock(summary, "strong", "", `Bạn đang chọn ${configuredParts.length}/${test.parts.length} part`);
    appendTextBlock(summary, "span", "", `${getConfiguredQuestions(test).length} câu sẽ hiển thị trong bài làm.`);
    wrap.appendChild(summary);

    const footer = document.createElement("div");
    footer.className = "thptqg-config-actions";
    footer.appendChild(createButton("Danh sách đề", "thptqg-secondary-btn", () => openCatalog("replace")));
    footer.appendChild(
      createButton(
        startedAt && !submittedAt ? "Tiếp tục làm bài" : "Làm đề",
        "thptqg-test-btn",
        () => startOrResumeTest(test, "replace"),
      ),
    );
    wrap.appendChild(footer);

    stage.appendChild(wrap);
  }

  function renderAttempt(test) {
    const previousScrollState = captureAttemptScrollState();
    stage.innerHTML = "";
    const parts = getConfiguredParts(test);
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
      const button = createButton(String(part?.label || ""), `thptqg-part-btn${currentPartId === part.id ? " active" : ""}`, () => jumpToPartStart(test, part));
      topPartTabs.appendChild(button);
    });
    workspaceTop.appendChild(topPartTabs);
    workspace.appendChild(workspaceTop);

    const groupsWrap = document.createElement("div");
    groupsWrap.className = "thptqg-exam-groups";
    (Array.isArray(activePart?.groups) ? activePart.groups : []).forEach((group) => {
      const questionNumbers = Array.isArray(group?.questionNumbers) ? group.questionNumbers : [];
      const groupCopy = splitEmbeddedInstructionContext(group);
      const currentGroupQuestion = getConfiguredQuestions(test).find((question) => (
        String(question?.id || "") === currentQuestion
        && questionNumbers.includes(Number(question?.number || 0))
      )) || null;
      const promptFocus = currentGroupQuestion ? extractPromptFocus(currentGroupQuestion.prompt) : null;
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
        renderQuizStemRichText(prompt, emphasizePromptReferences(stripQuestionLabel(question.prompt)));
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
        if (groupCopy.instruction) {
          appendRichTextBlock(passagePane, "p", "thptqg-group-instruction", groupCopy.instruction);
        }
        if (groupCopy.context.length) {
          const contextWrap = document.createElement("div");
          contextWrap.className = "thptqg-context thptqg-passage-scroll";
          groupCopy.context.forEach((line, index) => {
            const paragraph = document.createElement("p");
            renderPassageParagraph(paragraph, String(line), promptFocus, index, groupCopy.context.length);
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
          const question = getConfiguredQuestions(test).find((item) => Number(item?.number) === Number(questionNumber));
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
        if (groupCopy.instruction) {
          appendRichTextBlock(compactHead, "p", "thptqg-group-instruction", groupCopy.instruction);
        }
        section.appendChild(compactHead);

        if (groupCopy.context.length) {
          const compactContext = document.createElement("div");
          compactContext.className = "thptqg-compact-context";
          groupCopy.context.forEach((line, index) => {
            const paragraph = document.createElement("p");
            renderPassageParagraph(paragraph, String(line), promptFocus, index, groupCopy.context.length);
            compactContext.appendChild(paragraph);
          });
          section.appendChild(compactContext);
        }

        const compactList = document.createElement("div");
        compactList.className = "thptqg-compact-list";
        questionNumbers.forEach((questionNumber) => {
          const question = getConfiguredQuestions(test).find((item) => Number(item?.number) === Number(questionNumber));
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
    timerCard.innerHTML = `<div class="thptqg-side-title">${
      reviewMode && submittedAt
        ? "Thời gian làm bài tổng"
        : Number.isFinite(Number(configuredDurationMinutes)) && Number(configuredDurationMinutes) > 0
          ? "Thời gian còn lại"
          : "Thời gian làm bài"
    }</div>`;
    timerValueEl = document.createElement("div");
    timerValueEl.className = "thptqg-timer";
    timerValueEl.textContent = formatElapsed(getCurrentElapsedSeconds());
    timerCard.appendChild(timerValueEl);
    if (Number.isFinite(Number(configuredDurationMinutes)) && Number(configuredDurationMinutes) > 0 && !submittedAt) {
      appendTextBlock(timerCard, "div", "thptqg-inline-note", `Giới hạn: ${formatMinutes(configuredDurationMinutes)}`);
    }
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
      const button = createButton(String(part?.label || ""), `thptqg-part-btn${currentPartId === part.id ? " active" : ""}`, () => jumpToPartStart(test, part));
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
      restoreAttemptScrollState(previousScrollState);
      const target = stage.querySelector(`[data-question-id="${pendingScrollQuestionId}"]`);
      if (target instanceof HTMLElement) target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      pendingScrollQuestionId = "";
    } else {
      restoreAttemptScrollState(previousScrollState);
    }
  }

  function renderResult(test) {
    stage.innerHTML = "";
    const result = computeResultSummary(getConfiguredTest(test), answersByQuestion);
    const parts = getConfiguredParts(test);
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
    const hasPrioritizedPart = prioritizedPartId && parts.some((part) => String(part?.id || "") === prioritizedPartId);
    const orderedParts = !hasPrioritizedPart
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
    shell.classList.toggle("thptqg-config-screen", view === "config" && Boolean(activeTest));
    shell.classList.toggle("thptqg-result-screen", view === "result" && Boolean(activeTest));
    shell.classList.toggle("thptqg-catalog-screen", view === "catalog" || !activeTest);
    if (view === "catalog" || !activeTest) {
      renderCatalog();
      timerValueEl = null;
      return;
    }
    ensureSelectionForTest(activeTest);
    if (view === "config") {
      renderTestConfig(activeTest);
      timerValueEl = null;
      return;
    }
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
  if (restoredTest) loadTestProgress(restoredTest);
  if (
    restoredTest
    && view === "catalog"
    && !reviewMode
    && !submittedAt
    && !startedAt
    && !Object.keys(answersByQuestion).length
  ) {
    view = "config";
  }
  if (restoredTest && !reviewMode && submittedAt) {
    view = "result";
  }
  if (restoredTest) ensureSelectionForTest(restoredTest);
  emitState();
  render();
  writeHistory("replace");
}

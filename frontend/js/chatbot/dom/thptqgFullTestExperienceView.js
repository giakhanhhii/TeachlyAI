import { fetchMockResource } from "../services/mockContentApi.js";
import { quizStemToSafeHtml } from "../services/quizService.js";
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
      questionIds: partQuestions.map((question) => String(question?.id || "")),
    };
    partQuestions.forEach((question) => {
      const picked = answersByQuestion[String(question?.id || "")];
      if (!Number.isFinite(Number(picked))) {
        stat.skipped += 1;
        summary.skipped += 1;
      } else if (Number(picked) === Number(question?.correctIndex)) {
        stat.correct += 1;
        summary.correct += 1;
      } else {
        stat.wrong += 1;
        summary.wrong += 1;
      }
    });
    stat.accuracy = stat.total ? (stat.correct / stat.total) * 100 : 0;
    summary.partStats.push(stat);
  });

  summary.score10 = summary.total ? (summary.correct / summary.total) * 10 : 0;
  return summary;
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  if (typeof onClick === "function") button.addEventListener("click", onClick);
  return button;
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
  let detailQuestionId = typeof initial?.detailQuestionId === "string" ? initial.detailQuestionId : "";
  let elapsedBaseSeconds = elapsedSeconds;
  let elapsedBaseTick = Date.now();
  let timerValueEl = null;
  let pendingScrollQuestionId = "";
  const historyAbort = new AbortController();

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
      detailQuestionId,
    });
  }

  function updateTimer() {
    if (!timerValueEl) return;
    timerValueEl.textContent = formatElapsed(getCurrentElapsedSeconds());
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
    detailQuestionId = typeof snapshot.detailQuestionId === "string" ? snapshot.detailQuestionId : "";
    return true;
  }

  function openCatalog(historyMode = "replace") {
    snapshotElapsed();
    view = "catalog";
    activeResultPartId = "overview";
    detailQuestionId = "";
    emitState();
    render();
    writeHistory(historyMode);
  }

  function startOrResumeTest(test, historyMode = "replace") {
    if (!test || test.status !== "available") return;
    selectedTestId = test.id;
    ensureSelectionForTest(test);
    if (!startedAt) {
      startedAt = new Date().toISOString();
      elapsedBaseSeconds = 0;
      elapsedSeconds = 0;
    }
    elapsedBaseTick = Date.now();
    detailQuestionId = "";
    activeResultPartId = "overview";
    reviewMode = Boolean(submittedAt);
    view = submittedAt ? "result" : "attempt";
    emitState();
    render();
    writeHistory(historyMode);
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
    pendingScrollQuestionId = questionId;
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
    pendingScrollQuestionId = questionId;
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
    detailQuestionId = "";
    emitState();
    render();
    writeHistory(historyMode);
  }

  function renderCatalog() {
    stage.innerHTML = "";
    const head = document.createElement("div");
    head.className = "thptqg-catalog-head";
    head.innerHTML = `
      <div>
        <h2 class="thptqg-title">${bundle.catalog.title}</h2>
        <p class="thptqg-subtitle">${bundle.catalog.subtitle}</p>
      </div>
      <div class="thptqg-inline-note">Hiện có 1 đề thật từ <strong>${meta.source || "mockdata_40.md"}</strong>, các đề còn lại đang khóa.</div>
    `;
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
      card.innerHTML = `
        <div class="thptqg-test-badges">
          <span class="thptqg-tag">${test.yearLabel || "Mock"}</span>
          <span class="thptqg-tag">${test.status === "available" ? "Khả dụng" : "Sắp có"}</span>
        </div>
        <h3>${test.title}</h3>
        <div class="thptqg-test-meta">⏱ ${formatMinutes(test.durationMinutes)} | ${test.questionCount} câu</div>
        <div class="thptqg-test-meta">📚 4 part | 10 câu / part</div>
        <div class="thptqg-test-meta">📄 Nguồn: ${test.source || "mockdata_40.md"}</div>
      `;
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
    stage.innerHTML = "";
    const parts = Array.isArray(test.parts) ? test.parts : [];
    const activePart = parts.find((part) => String(part?.id || "") === currentPartId) || parts[0] || null;
    ensureSelectionForTest(test);

    const examHead = document.createElement("div");
    examHead.className = "thptqg-exam-head";
    examHead.innerHTML = `
      <div>
        <h2 class="thptqg-exam-title">${test.title}</h2>
        <p class="thptqg-exam-subtitle">Mỗi part gồm 10 câu. Chọn part để chuyển nhanh giữa các phần của đề.</p>
      </div>
    `;
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
    workspaceTop.innerHTML = `
      <div class="thptqg-exam-workspace-copy">
        <div class="thptqg-part-label">${activePart?.label || "Part"}</div>
        <h3>${activePart?.title || "Làm đề"}</h3>
      </div>
    `;
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
        prompt.innerHTML = quizStemToSafeHtml(stripQuestionLabel(question.prompt));
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
        compactHead.innerHTML = `
          <h3 class="thptqg-group-title">${String(group?.title || "")}</h3>
          ${group?.instruction ? `<p class="thptqg-group-instruction">${String(group.instruction)}</p>` : ""}
        `;
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
    timerCard.innerHTML = `<div class="thptqg-side-title">Thời gian làm bài</div>`;
    timerValueEl = document.createElement("div");
    timerValueEl.className = "thptqg-timer";
    timerValueEl.textContent = formatElapsed(getCurrentElapsedSeconds());
    timerCard.appendChild(timerValueEl);
    timerCard.appendChild(createButton("NỘP BÀI", "thptqg-submit-btn", () => submitTest(test, "replace")));
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
    stage.appendChild(actionRow);

    const scoreRow = document.createElement("div");
    scoreRow.className = "thptqg-result-cards";
    const cards = [
      { label: "Đúng", value: `${result.correct}/${result.total}`, tone: "ok" },
      { label: "Sai", value: String(result.wrong), tone: "bad" },
      { label: "Bỏ qua", value: String(result.skipped), tone: "muted" },
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
    summaryCard.innerHTML = `
      <div><strong>${test.title}</strong></div>
      <div>Thời gian hoàn thành: ${formatElapsed(elapsedSeconds)}</div>
      <div>Trạng thái: Đã nộp bài</div>
    `;
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
      const button = createButton(String(part?.label || ""), `thptqg-result-tab${activeResultPartId === part.id ? " active" : ""}`, () => {
        activeResultPartId = String(part.id || "overview");
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
        const chip = createButton(String(question?.number || ""), "thptqg-chip-btn", () => {
          activeResultPartId = stat.partId;
          detailQuestionId = questionId;
          emitState();
          render();
          writeHistory("replace");
        });
        questionsCell.appendChild(chip);
      });
      row.innerHTML = `
        <td>${stat.label} - ${stat.title}</td>
        <td>${stat.correct}</td>
        <td>${stat.wrong}</td>
        <td>${stat.skipped}</td>
        <td>${stat.accuracy.toFixed(2)}%</td>
      `;
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
    detailTitle.textContent = "Chi tiết từng câu";
    detailSection.appendChild(detailTitle);

    const partFilter = activeResultPartId === "overview" ? null : activeResultPartId;
    parts
      .filter((part) => !partFilter || String(part?.id || "") === partFilter)
      .forEach((part) => {
        const block = document.createElement("div");
        block.className = "thptqg-detail-block";
        block.innerHTML = `<h4>${part.label} - ${part.title}</h4>`;
        const list = document.createElement("div");
        list.className = "thptqg-detail-list";
        const questions = (Array.isArray(test.questions) ? test.questions : []).filter((question) => String(question?.partId || "") === String(part?.id || ""));
        questions.forEach((question) => {
          const questionId = String(question.id || "");
          const picked = answersByQuestion[questionId];
          const answered = Number.isFinite(Number(picked));
          const isCorrect = answered && Number(picked) === Number(question.correctIndex);
          const statusText = !answered ? "Bỏ qua" : isCorrect ? "Trả lời đúng" : "Trả lời sai";
          const item = document.createElement("div");
          item.className = `thptqg-detail-item${detailQuestionId === questionId ? " active" : ""}`;
          item.innerHTML = `
            <div class="thptqg-detail-item-main">
              <div class="thptqg-detail-item-number">Câu ${question.number}</div>
              <div class="thptqg-detail-item-status">${statusText}</div>
              <div class="thptqg-detail-item-answer">Bạn chọn: ${answerLetter(picked)} | Đáp án đúng: ${answerLetter(question.correctIndex)}</div>
            </div>
          `;
          const action = createButton("Chi tiết", "thptqg-secondary-btn small", () => {
            detailQuestionId = questionId;
            emitState();
            render();
            writeHistory("replace");
          });
          item.appendChild(action);
          list.appendChild(item);
        });
        block.appendChild(list);
        detailSection.appendChild(block);
      });

    if (detailQuestionId) {
      const detailQuestion = questionMap.get(detailQuestionId);
      if (detailQuestion) {
        const detailCard = document.createElement("div");
        detailCard.className = "thptqg-answer-detail-card";
        const picked = answersByQuestion[detailQuestionId];
        detailCard.innerHTML = `
          <div class="thptqg-answer-detail-head">
            <div>
              <div class="thptqg-part-label">${detailQuestion.partId.toUpperCase()}</div>
              <h4>Đáp án chi tiết câu ${detailQuestion.number}</h4>
            </div>
          </div>
          <p class="exp-q-text">${quizStemToSafeHtml(stripQuestionLabel(detailQuestion.prompt))}</p>
          <div class="thptqg-answer-row">
            <span>Bạn chọn: <strong>${answerLetter(picked)}</strong></span>
            <span>Đáp án đúng: <strong>${answerLetter(detailQuestion.correctIndex)}</strong></span>
          </div>
        `;

        const optionList = document.createElement("div");
        optionList.className = "quiz-review-options";
        (Array.isArray(detailQuestion.options) ? detailQuestion.options : []).forEach((option, index) => {
          const line = document.createElement("div");
          let className = "quiz-review-option";
          if (index === Number(detailQuestion.correctIndex)) className += " correct";
          if (Number(picked) === index && Number(picked) !== Number(detailQuestion.correctIndex)) className += " wrong";
          line.className = className;
          line.textContent = `${OPTION_LETTERS[index] || index}. ${option}`;
          optionList.appendChild(line);
        });
        detailCard.appendChild(optionList);

        const evidence = document.createElement("div");
        evidence.className = "thptqg-evidence";
        evidence.innerHTML = `<strong>Trích đoạn chứa đáp án:</strong> ${detailQuestion.explanationEvidence || "Không có."}`;
        detailCard.appendChild(evidence);

        const details = document.createElement("details");
        details.className = "thptqg-explanation-details";
        details.open = true;
        const summary = document.createElement("summary");
        summary.textContent = "Giải thích chi tiết đáp án";
        const body = document.createElement("div");
        body.className = "thptqg-explanation-body";
        body.textContent = String(detailQuestion.explanation || "");
        details.appendChild(summary);
        details.appendChild(body);
        detailCard.appendChild(details);
        detailSection.appendChild(detailCard);
      }
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

  const timer = setInterval(() => {
    if (!document.body.contains(shell)) {
      clearInterval(timer);
      historyAbort.abort();
      return;
    }
    updateTimer();
  }, 1000);

  const restoredTest = getActiveTest();
  if (restoredTest && !reviewMode && submittedAt) {
    view = "result";
  }
  if (restoredTest) ensureSelectionForTest(restoredTest);
  emitState();
  render();
  writeHistory("replace");
}

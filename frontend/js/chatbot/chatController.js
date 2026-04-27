import { getChatApiUrl } from "./config.js";
import { getSessionMessages, postChat } from "./chatApi.js";
import {
  ensureSessions,
  saveSessions,
  getCurrentSession,
  getCurrentExperienceState,
  getActiveSessionIndex,
  getCurrentSessionId,
  setActiveSessionIndex,
  getSessionsSnapshot,
  exportCurrentSessionState,
  createSession,
  renameSession,
  togglePinSession,
  deleteSession,
  setCurrentExperienceState,
  getSessionByIndex,
  setSessionMessages,
  prependSessionMessages,
  restoreSessionStateById,
  restoreSessionsState,
} from "./sessionStore.js";
import { computeStartFlow } from "./guidedFlow.js";
import { createExperienceLayerView } from "./dom/experienceLayerView.js";
import { mountQuizExperience } from "./dom/quizExperienceView.js";
import { mountFlashExperience } from "./dom/flashExperienceView.js";
import { mountSlideExperience } from "./dom/slideExperienceView.js";
import { mountFullSetHubExperience } from "./dom/fullSetHubExperienceView.js";
import { mountFullSetMixedExperience } from "./dom/fullSetMixedExperienceView.js";
import { mountThptqgFullTestExperience } from "./dom/thptqgFullTestExperienceView.js";
import { createMessageView } from "./dom/messageView.js";
import { createMessageController } from "./controllers/messageController.js";
import { createExperienceController } from "./controllers/experienceController.js";
import { createGuidedInteractionController } from "./controllers/guidedInteractionController.js";
import { createChatSessionListRenderer } from "./controllers/chatSessionListController.js";
import {
  HISTORY_APP_NAV_KEY,
  HISTORY_CAN_BACK_TO_CHAT_KEY,
  HISTORY_CHAT_PHASE,
  HISTORY_EXPERIENCE_PHASE,
} from "./services/historyService.js";
import { createFlowService } from "./services/flowService.js";
import { createMessageHistoryService } from "./services/messageHistoryService.js";
import { createStartupHubElement } from "./dom/startupHubCards.js";
import { resolveChatDomElements, setupChatEventManager } from "./dom/chatEventManager.js";

/** @type {any} */
let guided = null;
let suppressNavigationSnapshotWrite = false;
/** @type {null | ((mode?: "push"|"replace") => void)} */
let commitNavigationSnapshot = null;

function setGuidedState(next) {
  guided = next;
  if (!suppressNavigationSnapshotWrite) {
    commitNavigationSnapshot?.("replace");
  }
}

/** Tránh chồng chéo khi chuyển session quá nhanh. */
let isSwitchingSession = false;

const REMOTE_MESSAGE_PAGE_SIZE = 20;
const HISTORY_NAV_SEQ_KEY = "__teachlyNavSeq";
const HISTORY_SESSION_ID_KEY = "__teachlySessionId";

function getBrowserHistoryIndex() {
  try {
    const entryIndex = globalThis.navigation?.currentEntry?.index;
    return Number.isFinite(Number(entryIndex)) ? Math.floor(Number(entryIndex)) : null;
  } catch {
    return null;
  }
}

function initializeBrowserBackBridge() {
  // Disabled: this bridge rewrote browser history and could trap Back/Forward.
}

export function init() {
  console.log("[chatController] init started");
  const domEls = resolveChatDomElements();
  if (!domEls) return;
  const { messages, messagesInner, form, input, sendBtn, threadLabel, chatList, newChatBtn, chatPhase, experienceLayer, experienceBody, backToChatBtn, toggleSidebarBtn, topHomeBtn } = domEls;
  const messageScroller = /** @type {HTMLElement} */ (messages);

  const apiUrl = getChatApiUrl();
  console.log("[chatController] DOM references resolved");
  initializeBrowserBackBridge();
  let currentHistoryNavSeq =
    Number.isFinite(Number(history.state?.[HISTORY_NAV_SEQ_KEY])) ? Math.floor(Number(history.state[HISTORY_NAV_SEQ_KEY])) : 0;
  let currentBrowserHistoryIndex = getBrowserHistoryIndex();

  function resolveCurrentPhase() {
    return experienceLayer.classList.contains("visible") ? HISTORY_EXPERIENCE_PHASE : HISTORY_CHAT_PHASE;
  }

  function buildAppNavigationSnapshot() {
    return {
      session: exportCurrentSessionState(),
      activeSessionId: getCurrentSessionId(),
      guided,
    };
  }

  function writeAppNavigationState(mode = "replace", phase = resolveCurrentPhase(), opts = {}) {
    if (suppressNavigationSnapshotWrite) return;
    const current = history.state && typeof history.state === "object" ? history.state : {};
    const explicitCanBack =
      opts && typeof opts === "object" && Object.prototype.hasOwnProperty.call(opts, "canBackToChat")
        ? Boolean(opts.canBackToChat)
        : null;
    const canBackToChat =
      phase === HISTORY_EXPERIENCE_PHASE
        ? explicitCanBack ?? current[HISTORY_CAN_BACK_TO_CHAT_KEY] === true
        : false;
    const nextNavSeq =
      mode === "push"
        ? currentHistoryNavSeq + 1
        : Number.isFinite(Number(current[HISTORY_NAV_SEQ_KEY]))
          ? Math.floor(Number(current[HISTORY_NAV_SEQ_KEY]))
          : currentHistoryNavSeq;
    const next = {
      ...current,
      phase,
      [HISTORY_CAN_BACK_TO_CHAT_KEY]: canBackToChat,
      [HISTORY_NAV_SEQ_KEY]: nextNavSeq,
      [HISTORY_SESSION_ID_KEY]: getCurrentSessionId(),
      [HISTORY_APP_NAV_KEY]: buildAppNavigationSnapshot(),
    };
    if (mode === "push") history.pushState(next, "", location.href);
    else history.replaceState(next, "", location.href);
    currentHistoryNavSeq = nextNavSeq;
    currentBrowserHistoryIndex = getBrowserHistoryIndex();
  }

  commitNavigationSnapshot = writeAppNavigationState;
  const ensureExperienceHistoryEntry = (opts = {}) => {
    const mode = opts?.mode === "replace" ? "replace" : "push";
    writeAppNavigationState(mode, HISTORY_EXPERIENCE_PHASE, {
      canBackToChat: opts?.canBackToChat !== false,
    });
  };

  const layerView = createExperienceLayerView({
    experienceLayer,
    experienceBody,
    chatPhase,
  });
  const baseLayerHide = layerView.hide.bind(layerView);
  layerView.hide = () => {
    baseLayerHide();
    /** @type {HTMLElement} */ (messagesInner).querySelectorAll(".flow-card").forEach((root) => {
      reenableFlowCard(/** @type {HTMLElement} */ (root));
    });
  };
  console.log("[chatController] experience layer view created");

  /** @type {ReturnType<typeof createMessageView>} */
  let msgView;
  /** @type {ReturnType<typeof createMessageController>} */
  let messageController;
  /** @type {ReturnType<typeof createExperienceController>} */
  let experienceController;
  /** @type {ReturnType<typeof createGuidedInteractionController>} */
  let guidedController;
  let isSending = false;

  messageController = createMessageController({
    getCurrentSession,
    saveSessions,
    getMessageView: () => msgView,
    postChat,
    apiUrl,
    sendBtn,
    inputEl: input,
    onConversationMutation: (mode = "push") => writeAppNavigationState(mode),
  });

  const experienceHooks = { onAiEdit: openChatWithAiDraft, onContinueCreate: continueCreateFromExperience };
  experienceController = createExperienceController({
    getCurrentSession,
    getCurrentExperienceState,
    setCurrentExperienceState,
    saveSessions,
    ensureExperienceHistoryEntry,
    layerView,
    mountQuizExperience,
    mountSlideExperience,
    mountFlashExperience,
    mountFullSetHubExperience,
    mountFullSetMixedExperience,
    mountThptqgFullTestExperience,
    experienceHooks,
    pushBot,
    onExperienceStateChange: () => writeAppNavigationState("replace", HISTORY_EXPERIENCE_PHASE),
  });

  function setStartupUiState(active) {
    const isActive = Boolean(active);
    chatPhase.classList.toggle("startup-mode", isActive);
    messages.classList.toggle("startup-mode", isActive);
  }

  function reattachStartupActionHandlers() {
    msgView.reattachFlowActionHandlers?.();
  }

  function setSendingState(next) {
    isSending = Boolean(next);
    messageController.setSendingState(isSending);
  }

  function pushResumeDockFromLastOpened() {
    experienceController.pushResumeDockFromLastOpened();
  }

  function pushUser(text) {
    if (!messageController) return;
    messageController.pushUser(text);
  }

  function pushQuickResumeDock(kind, meta, experienceId) {
    if (!experienceController) return;
    experienceController.pushQuickResumeDock(kind, meta, experienceId);
  }

  function reenableFlowCard(cardRoot) {
    if (!cardRoot) return;
    cardRoot.querySelectorAll("button").forEach((btn) => {
      /** @type {HTMLButtonElement} */ (btn).disabled = false;
    });
  }

  function pushBot(text, opts) {
    if (!messageController) return;
    messageController.pushBot(text, opts);
  }

  function openChatWithAiDraft(text) {
    layerView.hide();
    writeAppNavigationState("replace", HISTORY_CHAT_PHASE);
    input.value = text;
    input.focus();
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flash"} kind
   * @returns {Promise<"same"|"other"|null>}
   */
  function openContinueCreateDialog(kind) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "continue-create-overlay";
      const dialog = document.createElement("div");
      dialog.className = "continue-create-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");

      const kindLabel =
        kind === "fullset"
          ? "full set"
          : kind === "quiz"
            ? "quiz"
            : kind === "slide"
              ? "slide"
              : "flashcard";
      const title = document.createElement("h3");
      title.className = "continue-create-title";
      title.textContent = `Bạn có chắc chắn muốn tiếp tục tạo ${kindLabel}?`;

      const actions = document.createElement("div");
      actions.className = "continue-create-actions";
      const otherBtn = document.createElement("button");
      otherBtn.type = "button";
      otherBtn.className = "continue-create-btn continue-create-btn-secondary";
      otherBtn.textContent = "Tạo thẻ khác";
      const sameBtn = document.createElement("button");
      sameBtn.type = "button";
      sameBtn.className = "continue-create-btn continue-create-btn-primary";
      sameBtn.textContent = `Tiếp tục tạo ${kindLabel}`;
      actions.appendChild(otherBtn);
      actions.appendChild(sameBtn);

      dialog.appendChild(title);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const keydownAbort = new AbortController();

      const close = (result) => {
        keydownAbort.abort();
        overlay.remove();
        resolve(result);
      };

      const onKeyDown = (e) => {
        if (e.key === "Escape") close(null);
      };
      document.addEventListener("keydown", onKeyDown, { signal: keydownAbort.signal });
      otherBtn.addEventListener("click", () => close("other"));
      sameBtn.addEventListener("click", () => close("same"));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close(null);
      });
    });
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flash"} kind
   * @param {{ preset?: "same"|"other" }} [opts]
   *   Khi có `preset`, bỏ qua hộp thoại và áp dụng luôn (dùng cho nút inline trên màn hình kết quả).
   */
  async function continueCreateFromExperience(kind, opts) {
    const validKind =
      kind === "fullset" || kind === "quiz" || kind === "slide" || kind === "flash" ? kind : null;
    if (!validKind) return;
    const preset = opts && typeof opts === "object" ? opts.preset : undefined;
    const selected =
      preset === "same" || preset === "other" ? preset : await openContinueCreateDialog(validKind);
    if (!selected) {
      input.focus();
      return;
    }
    layerView.hide();
    writeAppNavigationState("replace", HISTORY_CHAT_PHASE);
    if (selected === "same") {
      experienceController.resetResumeState();
      experienceController.persistActiveExperience();
      setGuidedState({ kind: validKind, step: "await_topic_form", data: {} });
      const cardType =
        validKind === "fullset"
          ? "fullset_topic"
          : validKind === "quiz"
            ? "quiz_form"
            : validKind === "slide"
              ? "slide_form"
              : "flash_form";
      const intro =
        validKind === "fullset"
          ? "Tuyệt vời! Điền nhanh thông tin để Teachly tạo Full Set mới:"
          : validKind === "quiz"
          ? "Tuyệt vời! Thiết lập thông số cho bộ câu hỏi mới tại đây:"
          : validKind === "slide"
            ? "Tuyệt vời! Điền thông tin để Teachly thiết kế bộ slide mới:"
            : "Tuyệt vời! Cung cấp thông tin để Teachly tạo bộ Flashcard mới:";
      pushBot(intro, { cardType });
    } else {
      persistActiveExperience();
      createSession();
      setGuidedState(null);
      experienceController.resetResumeState();
      layerView.hide();
      renderChatListUI();
      renderMessages();
      saveSessions();
      writeAppNavigationState("push");
    }
    input.focus();
  }

  function persistActiveExperience() {
    if (!experienceController) return;
    experienceController.persistActiveExperience();
  }

  async function openSingleExperience(kind, meta, mode, experienceId) {
    if (!experienceController) return;
    await experienceController.openSingleExperience(kind, meta, mode, experienceId);
  }

  guidedController = createGuidedInteractionController({
    getGuided: () => guided,
    setGuided: setGuidedState,
    pushUser,
    pushBot,
    openSingleExperience,
    pushQuickResumeDock,
    reenableFlowCard,
    disableActionButtons: (btnEl) => msgView.disableActionButtons(btnEl),
  });

  async function openResumeExperience(item) {
    if (!experienceController) return;
    await experienceController.openResumeExperience(item);
  }

  async function openResumeOpenAll(items, bundleTitle) {
    if (!experienceController) return;
    await experienceController.openResumeOpenAll(items, bundleTitle);
  }

  async function openResumeFullSetMixed(spec, bundleTitle) {
    if (!experienceController) return;
    await experienceController.openResumeFullSetMixed(spec, bundleTitle);
  }

  async function restoreCurrentSessionExperience() {
    if (!experienceController) return;
    await experienceController.restoreCurrentSessionExperience();
  }

  msgView = createMessageView({
    messagesEl: /** @type {HTMLElement} */ (messages),
    messagesInnerEl: /** @type {HTMLElement} */ (messagesInner),
    onResumeExperience: (item) => void openResumeExperience(item),
    onResumeOpenAll: (items, bundleTitle) => void openResumeOpenAll(items, bundleTitle),
    onResumeOpenFullSetMixed: (spec, bundleTitle) => void openResumeFullSetMixed(spec, bundleTitle),
    onFlowAction: (...args) => guidedController.onFlowAction(...args),
    onFlowCardSubmit: (cardType, payload, cardRoot) => guidedController.handleFlowCardSubmit(cardType, payload, cardRoot),
  });

  console.log("[chatController] controllers initialized");

  /** @type {ReturnType<typeof createMessageHistoryService>} */
  let messageHistoryService;
  /** @type {ReturnType<typeof createFlowService>} */
  let flowService;

  function updateThreadLabel() {
    const current = getCurrentSession();
    threadLabel.textContent = current?.thread_id ? `Thread: ${current.thread_id}` : "";
  }

  function ensureSessionMessagesLoaded(force = false) {
    return messageHistoryService.ensureSessionMessagesLoaded(force);
  }

  function renderMessages() {
    messageHistoryService.renderMessages();
  }

  function estimateExperienceProgressRichness(progress) {
    if (!progress || typeof progress !== "object") return -1;
    let score = 0;
    if (typeof progress.view === "string" && progress.view) score += 2;
    if (typeof progress.startedAt === "string" && progress.startedAt) score += 2;
    if (typeof progress.submittedAt === "string" && progress.submittedAt) score += 6;
    if (progress.view === "result") score += 4;
    if (progress.reviewMode) score += 2;
    if (typeof progress.currentQuestion === "string" && progress.currentQuestion) score += 1;
    if (typeof progress.currentPartId === "string" && progress.currentPartId) score += 1;
    if (typeof progress.activeResultPartId === "string" && progress.activeResultPartId) score += 1;
    if (typeof progress.detailQuestionId === "string" && progress.detailQuestionId) score += 1;
    if (Number.isFinite(Number(progress.elapsedSeconds))) score += 1;
    score += Object.keys(progress.answersByQuestion && typeof progress.answersByQuestion === "object" ? progress.answersByQuestion : {}).length;
    score += Array.isArray(progress.flaggedQuestions) ? progress.flaggedQuestions.length : 0;
    return score;
  }

  function estimateExperienceStateRichness(experienceState) {
    if (!experienceState || typeof experienceState !== "object") return -1;
    let score = 0;
    if (experienceState.completed) score += 4;
    score = Math.max(score, estimateExperienceProgressRichness(experienceState.progress));
    score = Math.max(score, estimateExperienceProgressRichness(experienceState.resume?.resumeState));
    const historyById = experienceState.historyById && typeof experienceState.historyById === "object"
      ? experienceState.historyById
      : {};
    Object.values(historyById).forEach((entry) => {
      score = Math.max(score, estimateExperienceProgressRichness(entry?.progress));
    });
    return score;
  }

  function mergeWithCurrentExperienceState(snapshotSession, targetSessionId) {
    if (!snapshotSession || typeof snapshotSession !== "object") return snapshotSession;
    const currentSession = getSessionsSnapshot().find((session) => session?.sessionId === targetSessionId);
    const currentExperienceState = currentSession?.experienceState;
    if (!currentExperienceState || typeof currentExperienceState !== "object") return snapshotSession;
    const snapshotScore = estimateExperienceStateRichness(snapshotSession.experienceState);
    const currentScore = estimateExperienceStateRichness(currentExperienceState);
    if (currentScore < snapshotScore) return snapshotSession;
    return {
      ...snapshotSession,
      experienceState: currentExperienceState,
    };
  }

  function restoreNavigationSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;
    suppressNavigationSnapshotWrite = true;
    try {
      const targetSessionId =
        typeof snapshot.activeSessionId === "string" ? snapshot.activeSessionId.trim() : "";
      if (targetSessionId && snapshot.session && typeof snapshot.session === "object") {
        restoreSessionStateById(targetSessionId, mergeWithCurrentExperienceState(snapshot.session, targetSessionId));
      } else {
        const sessions = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
        const fallbackActiveIndex = Number.isInteger(snapshot.activeSessionIndex) ? snapshot.activeSessionIndex : 0;
        const legacyActiveIndex =
          targetSessionId && Array.isArray(snapshot.sessions)
            ? snapshot.sessions.findIndex((session) => session?.sessionId === targetSessionId)
            : -1;
        restoreSessionsState(sessions, legacyActiveIndex >= 0 ? legacyActiveIndex : fallbackActiveIndex);
      }
      guided = snapshot.guided ?? null;
      renderChatListUI();
      renderMessages();
      return true;
    } finally {
      suppressNavigationSnapshotWrite = false;
    }
  }

  async function restoreBrowserState(snapshot, state) {
    const targetNavSeq = Number(state?.[HISTORY_NAV_SEQ_KEY]);
    if (!restoreNavigationSnapshot(snapshot)) return false;
    currentHistoryNavSeq = Number.isFinite(targetNavSeq) ? Math.floor(targetNavSeq) : currentHistoryNavSeq;
    currentBrowserHistoryIndex = getBrowserHistoryIndex();
    if (state?.phase === HISTORY_EXPERIENCE_PHASE) {
      await restoreCurrentSessionExperience();
      return true;
    }
    layerView.hide();
    return true;
  }

  function renderLoadMoreControl() {
    messageHistoryService.renderLoadMoreControl();
  }

  function scrollToResumeDock() {
    const run = () => {
      if (typeof messageScroller.scrollTo === "function") {
        messageScroller.scrollTo({ top: messageScroller.scrollHeight, behavior: "smooth" });
        return;
      }
      messageScroller.scrollTop = messageScroller.scrollHeight;
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  const renderChatListUI = createChatSessionListRenderer({ chatListEl: /** @type {HTMLElement} */ (chatList), getSessionsSnapshot, getActiveSessionIndex, togglePinSession, renameSession, deleteSession, saveSessions, onSessionSelected: async (idx) => {
    if (isSwitchingSession) return;
    isSwitchingSession = true;
    try {
      persistActiveExperience();
      setActiveSessionIndex(idx);
      setGuidedState(null);
      experienceController.resetResumeState();
      layerView.hide();
      saveSessions();
      try {
        await ensureSessionMessagesLoaded();
      } catch {
        // Keep local cache if remote loading fails.
      }
      renderChatListUI();
      renderMessages();
      writeAppNavigationState("push", resolveCurrentPhase());
    } finally {
      isSwitchingSession = false;
    }
  }, onSessionDeleted: async () => {
    setGuidedState(null);
    experienceController.resetResumeState();
    persistActiveExperience();
    layerView.hide();
    renderMessages();
    writeAppNavigationState("replace");
  } });

  messageHistoryService = createMessageHistoryService({
    pageSize: REMOTE_MESSAGE_PAGE_SIZE,
    messagesInner: /** @type {HTMLElement} */ (messagesInner),
    messages: /** @type {HTMLElement} */ (messages),
    threadLabel: /** @type {HTMLElement} */ (threadLabel),
    msgView,
    getCurrentSession,
    getActiveSessionIndex,
    getSessionByIndex,
    setSessionMessages,
    prependSessionMessages,
    saveSessions,
    ensureSessions,
    getSessionMessages,
    createStartupHubElement,
    setStartupUiState,
    reattachStartupActionHandlers,
  });

  flowService = createFlowService({
    getSessionsSnapshot,
    persistActiveExperience,
    getCurrentSession,
    setCurrentExperienceState,
    createSession,
    setActiveSessionIndex,
    saveSessions,
    renderChatListUI,
    ensureSessionMessagesLoaded: (force) => ensureSessionMessagesLoaded(force),
    renderMessages,
    restoreCurrentSessionExperience,
    computeStartFlow,
    applyEffects: (effects) => guidedController.applyEffects(effects),
    setStartupUiState,
    clearMessages: () => msgView.clear(),
    renderLoadMoreControl,
    updateThreadLabel,
    setGuided: setGuidedState,
    resetResumeState: () => experienceController.resetResumeState(),
    hideLayer: () => {
      layerView.hide();
      writeAppNavigationState("replace", HISTORY_CHAT_PHASE);
    },
    commitNavigationSnapshot: (mode = "replace") => writeAppNavigationState(mode),
  });

  messageHistoryService.setStartupFlowHandler((flowKind) => flowService.startFlowInCurrentSession(flowKind));

  async function sendPrompt(prompt) {
    await messageController.sendPrompt(prompt, {
      onSendingState: setSendingState,
      onThreadUpdated: (threadId) => { threadLabel.textContent = `Thread: ${threadId}`; },
      onError: (errMsg) => { msgView.addMessage("bot", errMsg); },
      onDone: () => { input.focus(); },
    });
  }

  setupChatEventManager({
    form: /** @type {HTMLFormElement} */ (form),
    input: /** @type {HTMLInputElement} */ (input),
    newChatBtn: /** @type {HTMLButtonElement} */ (newChatBtn),
    backToChatBtn: /** @type {HTMLButtonElement | null} */ (backToChatBtn),
    toggleSidebarBtn: /** @type {HTMLButtonElement | null} */ (toggleSidebarBtn),
    topHomeBtn: /** @type {HTMLButtonElement | null} */ (topHomeBtn),
    getIsSending: () => isSending,
    setSendingState,
    getGuided: () => guided,
    onGuidedPrompt: (prompt, guidedState) => guidedController.handleGuidedPrompt(prompt, guidedState, /** @type {HTMLInputElement} */ (input)),
    onSendPrompt: (prompt) => { sendPrompt(prompt); },
    onCreateNewChat: () => {
      persistActiveExperience();
      createSession();
      setGuidedState(null);
      experienceController.resetResumeState();
      layerView.hide();
      renderChatListUI();
      renderMessages();
      saveSessions();
      writeAppNavigationState("push", resolveCurrentPhase());
      input.focus();
    },
    hasLastOpenedExperience: () => experienceController.hasLastOpenedExperience(),
    isExperienceVisible: () => experienceLayer.classList.contains("visible"),
    hideLayer: () => {
      layerView.hide();
      writeAppNavigationState("replace", HISTORY_CHAT_PHASE);
    },
    persistActiveExperience,
    pushResumeDockFromLastOpened,
    restoreNavigationSnapshot: (snapshot, state) => restoreBrowserState(snapshot, state),
    restoreCurrentSessionExperienceFromHistory: () => restoreCurrentSessionExperience(),
    scrollToResumeDock,
    ensureSessions,
    ensureHistoryBaseState: () => {},
    renderChatListUI,
    ensureSessionMessagesLoaded: () => ensureSessionMessagesLoaded(),
    renderMessages,
    handleFlowEntry: (flowKind) => flowService.handleFlowEntry(flowKind),
    restoreCurrentSessionExperience: () => restoreCurrentSessionExperience(),
    onInitBaseRendered: () => { console.log("[chatController] base state rendered"); },
    onInitCompleted: () => {
      writeAppNavigationState("replace", resolveCurrentPhase());
      console.log("[chatController] init completed");
    },
  });

  writeAppNavigationState("replace", resolveCurrentPhase());
}

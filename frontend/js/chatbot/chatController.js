import { getChatApiUrl } from "./config.js";
import { getSessionMessages, postChat } from "./chatApi.js";
import {
  ensureSessions,
  saveSessions,
  getCurrentSession,
  getCurrentExperienceState,
  getActiveSessionIndex,
  setActiveSessionIndex,
  findLatestSessionIndexByExperienceKind,
  getSessionsSnapshot,
  createSession,
  renameSession,
  togglePinSession,
  deleteSession,
  setCurrentExperienceState,
  getSessionByIndex,
  setSessionMessages,
  prependSessionMessages,
} from "./sessionStore.js";
import {
  computePickAction,
  computeGuidedTextSubmit,
  computeStartFlow,
  computeFlowCardSubmit,
  PDF_SOURCE_ACTION_VALUES,
  getRestartAwaitSourceEffects,
} from "./guidedFlow.js";
import { setPendingPdfFile } from "./pdfPrefillStore.js";
import { createExperienceLayerView } from "./dom/experienceLayerView.js";
import { mountQuizExperience } from "./dom/quizExperienceView.js";
import { mountFlashExperience } from "./dom/flashExperienceView.js";
import { mountSlideExperience } from "./dom/slideExperienceView.js";
import { mountFullSetHubExperience } from "./dom/fullSetHubExperienceView.js";
import { mountFullSetMixedExperience } from "./dom/fullSetMixedExperienceView.js";
import { createMessageView } from "./dom/messageView.js";
import { renderChatList } from "./dom/chatListView.js";
import { createMessageController } from "./controllers/messageController.js";
import { bindNewChatButton, renderSessionListUI } from "./controllers/sessionController.js";
import { createExperienceController } from "./controllers/experienceController.js";
import {
  createPopStateHandler,
  ensureHistoryBaseState,
  ensureExperienceHistoryEntry,
  inExperienceHistoryState,
} from "./services/historyService.js";
import { createFlowActionHandler } from "./services/flowIntegration.js";
import { createFlowService, normalizeFlowParam } from "./services/flowService.js";
import { createMessageHistoryService } from "./services/messageHistoryService.js";
import { createStartupHubElement } from "./dom/startupHubCards.js";

/** @type {any} */
let guided = null;

const REMOTE_MESSAGE_PAGE_SIZE = 20;

/**
 * @returns {Promise<File | null>}
 */
function pickPdfWithDialog() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";

    let settled = false;
    const done = (/** @type {File | null} */ f) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      resolve(f);
    };

    const onFocus = () => {
      setTimeout(() => {
        if (settled) return;
        const f = input.files?.[0] ?? null;
        done(f);
      }, 280);
    };

    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (f) done(f);
    });

    window.addEventListener("focus", onFocus, { once: true });
    input.click();
  });
}

export function init() {
  console.log("[chatController] init started");
  const messages = document.getElementById("messages");
  const messagesInner = document.getElementById("messagesInner");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const threadLabel = document.getElementById("threadLabel");
  const chatList = document.getElementById("chatList");
  const newChatBtn = document.getElementById("newChatBtn");
  const chatPhase = document.getElementById("chatPhase");
  const experienceLayer = document.getElementById("experienceLayer");
  const experienceBody = document.getElementById("experienceBody");
  const backToChatBtn = document.getElementById("backToChatBtn");
  const toggleSidebarBtn = document.getElementById("toggleSidebar");
  const topHomeBtn = document.getElementById("topHomeBtn");

  const requiredEls = {
    messages,
    messagesInner,
    form,
    input,
    sendBtn,
    threadLabel,
    chatList,
    newChatBtn,
    chatPhase,
    experienceLayer,
    experienceBody,
  };
  const missingIds = Object.entries(requiredEls)
    .filter(([, el]) => !el)
    .map(([name]) => name);
  if (missingIds.length) {
    console.error("[chatController] init aborted. Missing required elements:", missingIds);
    return;
  }
  const optionalEls = { backToChatBtn, toggleSidebarBtn, topHomeBtn };
  const missingOptionalIds = Object.entries(optionalEls)
    .filter(([, el]) => !el)
    .map(([name]) => name);
  if (missingOptionalIds.length) {
    console.warn("[chatController] optional controls missing, continue init:", missingOptionalIds);
  }

  const apiUrl = getChatApiUrl();
  console.log("[chatController] DOM references resolved");

  const layerView = createExperienceLayerView({
    experienceLayer,
    experienceBody,
    chatPhase,
  });
  console.log("[chatController] experience layer view created");

  /** @type {ReturnType<typeof createMessageView>} */
  let msgView;
  /** @type {ReturnType<typeof createMessageController>} */
  let messageController;
  /** @type {ReturnType<typeof createExperienceController>} */
  let experienceController;
  let isSending = false;

  /**
   * Toggle startup layout: wide hub + hide composer.
   * @param {boolean} active
   */
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

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   */
  function pushQuickResumeDock(kind, meta) {
    if (!experienceController) return;
    experienceController.pushQuickResumeDock(kind, meta);
  }

  /**
   * @param {HTMLElement | undefined} cardRoot
   */
  function reenableFlowCard(cardRoot) {
    if (!cardRoot) return;
    cardRoot.querySelectorAll("button").forEach((btn) => {
      /** @type {HTMLButtonElement} */ (btn).disabled = false;
    });
  }

  /**
   * @param {string} text
   * @param {any} opts legacy: actions array, hoặc `{ actions?, cardType?, resumeDock? }`
   */
  function pushBot(text, opts) {
    if (!messageController) return;
    messageController.pushBot(text, opts);
  }

  function openChatWithAiDraft(text) {
    layerView.hide();
    input.value = text;
    input.focus();
  }

  function persistActiveExperience() {
    if (!experienceController) return;
    experienceController.persistActiveExperience();
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {"fresh"|"resume"} mode
   */
  async function openSingleExperience(kind, meta, mode) {
    if (!experienceController) return;
    await experienceController.openSingleExperience(kind, meta, mode);
  }

  async function applyEffects(effects) {
    for (const e of effects) {
      if (e.type === "pushUser") pushUser(e.text);
      else if (e.type === "pushBot") pushBot(e.text, { actions: e.actions, cardType: e.cardType, resumeDock: e.resumeDock });
      else if (e.type === "showQuiz") {
        await openSingleExperience("quiz", e.meta || {}, "fresh");
        pushQuickResumeDock("quiz", e.meta || {});
      } else if (e.type === "showFlash") {
        await openSingleExperience("flash", e.meta || {}, "fresh");
        pushQuickResumeDock("flash", e.meta || {});
      } else if (e.type === "showSlide") {
        await openSingleExperience("slide", e.meta || {}, "fresh");
        pushQuickResumeDock("slide", e.meta || {});
      }
    }
  }

  const onFlowAction = createFlowActionHandler({
    getGuided: () => guided,
    setGuided: (next) => {
      guided = next;
    },
    computePickAction,
    getRestartAwaitSourceEffects,
    pdfSourceActionValues: PDF_SOURCE_ACTION_VALUES,
    pickPdfWithDialog,
    setPendingPdfFile: (file) => setPendingPdfFile(file),
    pushBot,
    applyEffects,
    disableActionButtons: (btnEl) => msgView.disableActionButtons(btnEl),
  });

  /**
   * @param {{ kind: string, meta: Record<string, string> }} item
   */
  async function openResumeExperience(item) {
    if (!experienceController) return;
    await experienceController.openResumeExperience(item);
  }

  /**
   * @param {any[]} items
   * @param {string} bundleTitle
   */
  async function openResumeOpenAll(items, bundleTitle) {
    if (!experienceController) return;
    await experienceController.openResumeOpenAll(items, bundleTitle);
  }

  /**
   * @param {Record<string, string>} spec
   * @param {string} bundleTitle
   */
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
    onResumeExperience: (item) => {
      void openResumeExperience(item);
    },
    onResumeOpenAll: (items, bundleTitle) => {
      void openResumeOpenAll(items, bundleTitle);
    },
    onResumeOpenFullSetMixed: (spec, bundleTitle) => {
      void openResumeFullSetMixed(spec, bundleTitle);
    },
    onFlowAction,
    onFlowCardSubmit(cardType, payload, cardRoot) {
      const result = computeFlowCardSubmit(guided, cardType, payload);
      if (!result.handled) {
        reenableFlowCard(cardRoot);
        return;
      }
      guided = result.guided;
      void (async () => {
        try {
          await applyEffects(result.effects);
        } catch {
          reenableFlowCard(cardRoot);
          pushBot("Không thể xử lý biểu mẫu vừa gửi. Bạn thử lại một lần nữa nhé.");
        }
      })();
    },
  });

  messageController = createMessageController({
    getCurrentSession,
    saveSessions,
    getMessageView: () => msgView,
    postChat,
    apiUrl,
    sendBtn,
    inputEl: input,
  });

  const experienceHooks = { onAiEdit: openChatWithAiDraft };
  experienceController = createExperienceController({
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
    experienceHooks,
    pushBot,
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

  function renderLoadMoreControl() {
    messageHistoryService.renderLoadMoreControl();
  }

  function renderChatListUI() {
    renderSessionListUI({
      chatListEl: /** @type {HTMLElement} */ (chatList),
      renderChatList,
      getSessionsSnapshot,
      getActiveSessionIndex,
      togglePinSession,
      renameSession,
      deleteSession,
      saveSessions,
      onSessionSelected: async (idx) => {
        persistActiveExperience();
        setActiveSessionIndex(idx);
        guided = null;
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
        await restoreCurrentSessionExperience();
      },
      onSessionDeleted: async () => {
        guided = null;
        experienceController.resetResumeState();
        persistActiveExperience();
        layerView.hide();
        renderMessages();
      },
    });
  }

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
    findLatestSessionIndexByExperienceKind,
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
    applyEffects,
    setStartupUiState,
    clearMessages: () => msgView.clear(),
    renderLoadMoreControl,
    updateThreadLabel,
    setGuided: (next) => {
      guided = next;
    },
    resetResumeState: () => experienceController.resetResumeState(),
    hideLayer: () => layerView.hide(),
  });

  messageHistoryService.setStartupFlowHandler((flowKind) => flowService.startFlowInCurrentSession(flowKind));

  async function sendPrompt(prompt) {
    await messageController.sendPrompt(prompt, {
      onSendingState: setSendingState,
      onThreadUpdated: (threadId) => {
        threadLabel.textContent = `Thread: ${threadId}`;
      },
      onError: (errMsg) => {
        msgView.addMessage("bot", errMsg);
      },
      onDone: () => {
        input.focus();
      },
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSending) return;
    const prompt = input.value.trim();
    if (!prompt) return;
    if (guided && (guided.step === "await_source" || guided.step === "await_pdf_file")) {
      input.focus();
      return;
    }
    if (guided) {
      const result = computeGuidedTextSubmit(guided, prompt);
      if (result.handled) {
        guided = result.guided;
        await applyEffects(result.effects);
        input.value = "";
        input.focus();
        return;
      }
    }
    sendPrompt(prompt);
  });

  bindNewChatButton({
    newChatBtn,
    onCreateNewChat: () => {
      persistActiveExperience();
      createSession();
      guided = null;
      experienceController.resetResumeState();
      layerView.hide();
      renderChatListUI();
      renderMessages();
      saveSessions();
      input.focus();
    },
  });

  backToChatBtn?.addEventListener("click", () => {
    if (inExperienceHistoryState()) {
      history.back();
      return;
    }
    layerView.hide();
    pushResumeDockFromLastOpened();
  });

  toggleSidebarBtn?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("collapsed");
  });

  topHomeBtn?.addEventListener("click", () => {
    location.href = "main_hub.html";
  });

  window.addEventListener(
    "popstate",
    createPopStateHandler({
      hasLastOpenedExperience: () => experienceController.hasLastOpenedExperience(),
      hideLayer: () => layerView.hide(),
      persistActiveExperience,
      pushResumeDockFromLastOpened,
    }),
  );

  ensureSessions();
  ensureHistoryBaseState();
  renderChatListUI();
  console.log("[chatController] base state rendered");
  void (async () => {
    try {
      await ensureSessionMessagesLoaded();
    } catch {
      // Keep local cache if server is unavailable.
    }
    renderMessages();
    const params = new URLSearchParams(location.search);
    const flowKind = normalizeFlowParam(params.get("flow"));
    if (flowKind) {
      await flowService.handleFlowEntry(flowKind);
      return;
    }
    await restoreCurrentSessionExperience();
    console.log("[chatController] init completed");
  })();
}

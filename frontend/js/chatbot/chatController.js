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
import { createStartupHubElement } from "./dom/startupHubCards.js";
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
  /** @type {ReturnType<typeof createExperienceController>} */
  let experienceController;
  let isSending = false;
  let isLoadingMore = false;
  /** @type {HTMLButtonElement | null} */
  let loadMoreBtn = null;
  const messageController = createMessageController({
    getCurrentSession,
    saveSessions,
    getMessageView: () => msgView,
    postChat,
    apiUrl,
    sendBtn,
    inputEl: input,
  });

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

  /**
   * @param {{ role: string, text?: string, content?: string }} message
   */
  function normalizeRemoteMessage(message) {
    const role = message?.role === "assistant" || message?.role === "bot" ? "bot" : "user";
    const text = String(message?.text ?? message?.content ?? "");
    return { role, text };
  }

  function setSendingState(next) {
    isSending = Boolean(next);
    messageController.setSendingState(isSending);
  }

  function removeLoadMoreButton() {
    if (loadMoreBtn?.parentElement) loadMoreBtn.parentElement.remove();
    loadMoreBtn = null;
  }

  /**
   * Avoid replacing local rich messages (actions/cards/resume dock) with
   * plain DB history because that would break interactive card behavior.
   * @param {any[]} messages
   */
  function hasInteractiveMessages(messages) {
    if (!Array.isArray(messages)) return false;
    return messages.some(
      (m) =>
        m &&
        typeof m === "object" &&
        (Boolean(m.cardType) ||
          Boolean(m.resumeDock) ||
          (Array.isArray(m.actions) && m.actions.length > 0)),
    );
  }

  function pushResumeDockFromLastOpened() {
    experienceController.pushResumeDockFromLastOpened();
  }

  function pushUser(text) {
    messageController.pushUser(text);
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   */
  function pushQuickResumeDock(kind, meta) {
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
    messageController.pushBot(text, opts);
  }

  function openChatWithAiDraft(text) {
    layerView.hide();
    input.value = text;
    input.focus();
  }

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

  function persistActiveExperience() {
    experienceController.persistActiveExperience();
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {"fresh"|"resume"} mode
   */
  async function openSingleExperience(kind, meta, mode) {
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
    await experienceController.openResumeExperience(item);
  }

  /**
   * @param {any[]} items
   * @param {string} bundleTitle
   */
  async function openResumeOpenAll(items, bundleTitle) {
    await experienceController.openResumeOpenAll(items, bundleTitle);
  }

  /**
   * @param {Record<string, string>} spec
   * @param {string} bundleTitle
   */
  async function openResumeFullSetMixed(spec, bundleTitle) {
    await experienceController.openResumeFullSetMixed(spec, bundleTitle);
  }

  async function restoreCurrentSessionExperience() {
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

  /**
   * @param {string | null} flow
   * @returns {"fullset"|"quiz"|"slide"|"flashcard"|null}
   */
  function normalizeFlowParam(flow) {
    const raw = String(flow || "").trim().toLowerCase();
    if (!raw) return null;
    if (raw === "image" || raw === "flash" || raw === "flashcard") return "flashcard";
    if (raw === "quiz" || raw === "slide" || raw === "fullset") return raw;
    return null;
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  function flowToExperienceKind(flowKind) {
    return flowKind === "flashcard" ? "flash" : flowKind;
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  function flowSessionBaseTitle(flowKind) {
    if (flowKind === "fullset") return "Tạo full set";
    if (flowKind === "quiz") return "Tạo quiz";
    if (flowKind === "slide") return "Tạo slide";
    return "Tạo flashcard";
  }

  /**
   * @param {ReturnType<typeof getCurrentSession>} session
   */
  function canReuseEmptySession(session) {
    if (!session || typeof session !== "object") return false;
    if (session.thread_id) return false;
    const msgs = session.messages;
    if (!Array.isArray(msgs) || msgs.length > 0) return false;
    return true;
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  function buildNextFlowSessionTitle(flowKind) {
    const base = flowSessionBaseTitle(flowKind);
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`^${escaped}\\s+(\\d+)$`, "i");
    let max = 0;
    getSessionsSnapshot().forEach((s) => {
      const m = String(s?.title || "").match(rx);
      if (!m) return;
      const n = Number(m[1]);
      if (Number.isFinite(n)) max = Math.max(max, n);
    });
    return `${base} ${max + 1}`;
  }

  /**
   * Fresh-start flow inside the current chat (e.g. startup cards). No URL navigation.
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function startFlowInCurrentSession(flowKind) {
    const expKind = flowToExperienceKind(flowKind);
    persistActiveExperience();
    const current = getCurrentSession();
    current.title = buildNextFlowSessionTitle(flowKind);
    setCurrentExperienceState({
      kind: expKind,
      meta: { flow: flowKind },
      progress: null,
      completed: false,
    });
    guided = null;
    experienceController.resetResumeState();
    layerView.hide();
    // Leaving startup hub: restore normal chat layout and composer.
    setStartupUiState(false);
    saveSessions();
    renderChatListUI();
    msgView.clear();
    const start = computeStartFlow(flowKind);
    guided = start.guided;
    await applyEffects(start.effects);
    saveSessions();
    renderLoadMoreControl();
    const cur = getCurrentSession();
    threadLabel.textContent = cur?.thread_id ? `Thread: ${cur.thread_id}` : "";
  }

  /**
   * Entry from Main Hub (`?flow=`): resume latest session for that experience, or start new flow.
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function handleFlowEntry(flowKind) {
    const expKind = flowToExperienceKind(flowKind);
    const latestIdx = findLatestSessionIndexByExperienceKind(expKind);
    if (latestIdx >= 0) {
      persistActiveExperience();
      setActiveSessionIndex(latestIdx);
      guided = null;
      experienceController.resetResumeState();
      layerView.hide();
      saveSessions();
      renderChatListUI();
      try {
        await ensureSessionMessagesLoaded();
      } catch {
        // Keep local cache if remote loading fails.
      }
      renderMessages();
      await restoreCurrentSessionExperience();
      history.replaceState({}, "", "chatbot_ui.html");
      return;
    }

    persistActiveExperience();
    const cur = getCurrentSession();
    if (canReuseEmptySession(cur)) {
      cur.title = buildNextFlowSessionTitle(flowKind);
      setCurrentExperienceState({
        kind: expKind,
        meta: { flow: flowKind },
        progress: null,
        completed: false,
      });
    } else {
      createSession({
        title: buildNextFlowSessionTitle(flowKind),
        experienceState: {
          kind: expKind,
          meta: { flow: flowKind },
          progress: null,
          completed: false,
        },
      });
    }
    guided = null;
    experienceController.resetResumeState();
    layerView.hide();
    // Entering an actual guided flow should not keep startup hub layout.
    setStartupUiState(false);
    saveSessions();
    renderChatListUI();
    try {
      await ensureSessionMessagesLoaded();
    } catch {
      // Keep local cache if remote loading fails.
    }
    msgView.clear();
    const start = computeStartFlow(flowKind);
    guided = start.guided;
    await applyEffects(start.effects);
    saveSessions();
    renderLoadMoreControl();
    const after = getCurrentSession();
    threadLabel.textContent = after?.thread_id ? `Thread: ${after.thread_id}` : "";
    history.replaceState({}, "", "chatbot_ui.html");
  }

  function renderLoadMoreControl() {
    removeLoadMoreButton();
    const current = getCurrentSession();
    if (!current?.thread_id || !current.hasMoreRemote) return;
    const row = document.createElement("div");
    row.className = "msg-row";
    row.style.justifyContent = "center";
    row.style.marginBottom = "8px";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "msg-action-btn";
    btn.textContent = isLoadingMore ? "Loading..." : "Load more";
    btn.disabled = isLoadingMore;
    btn.addEventListener("click", () => {
      void loadMoreHistory();
    });
    row.appendChild(btn);
    messagesInner.prepend(row);
    loadMoreBtn = btn;
  }

  async function ensureSessionMessagesLoaded(force = false) {
    const idx = getActiveSessionIndex();
    const session = getSessionByIndex(idx);
    if (!session) return;
    if (!session.thread_id) {
      session.messagesLoaded = true;
      session.hasMoreRemote = false;
      session.remoteOffset = Array.isArray(session.messages) ? session.messages.length : 0;
      return;
    }
    if (!force && hasInteractiveMessages(session.messages)) {
      session.messagesLoaded = true;
      return;
    }
    if (session.messagesLoaded && !force) return;
    const data = await getSessionMessages(session.thread_id, { limit: REMOTE_MESSAGE_PAGE_SIZE, offset: 0 });
    const mapped = Array.isArray(data.messages) ? data.messages.map(normalizeRemoteMessage) : [];
    const total = Number(data.total || 0);
    setSessionMessages(idx, mapped, {
      hasMoreRemote: Boolean(data.has_more),
      remoteOffset: mapped.length || Math.min(REMOTE_MESSAGE_PAGE_SIZE, total),
    });
    saveSessions();
  }

  async function loadMoreHistory() {
    const idx = getActiveSessionIndex();
    const session = getSessionByIndex(idx);
    if (!session?.thread_id || !session.hasMoreRemote || isLoadingMore) return;
    isLoadingMore = true;
    renderLoadMoreControl();
    try {
      const data = await getSessionMessages(session.thread_id, {
        limit: REMOTE_MESSAGE_PAGE_SIZE,
        offset: Number(session.remoteOffset || 0),
      });
      const mapped = Array.isArray(data.messages) ? data.messages.map(normalizeRemoteMessage) : [];
      prependSessionMessages(idx, mapped, {
        hasMoreRemote: Boolean(data.has_more),
        remoteOffset: Number(session.remoteOffset || 0) + mapped.length,
      });
      saveSessions();
      renderMessages();
    } catch {
      // Keep existing messages; just restore button state.
      renderLoadMoreControl();
    } finally {
      isLoadingMore = false;
      renderLoadMoreControl();
    }
  }

  function renderMessages() {
    msgView.clear();
    ensureSessions();
    const current = getCurrentSession();
    if (!current) {
      setStartupUiState(false);
      saveSessions();
      return;
    }
    if (!Array.isArray(current.messages)) {
      current.messages = [];
      saveSessions();
    }
    if (!current.messages.length) {
      // Empty sessions should show startup hub instead of blank white area.
      setStartupUiState(true);
      const startupHub = createStartupHubElement((flowKind) => {
        void startFlowInCurrentSession(flowKind);
      });
      msgView.appendStartupHub(startupHub);
      requestAnimationFrame(() => {
        messages.scrollTop = 0;
      });
    } else {
      setStartupUiState(false);
      current.messages.forEach((m) => {
        if (m.role === "bot" && (m.cardType || (m.actions && m.actions.length) || m.resumeDock)) {
          msgView.addMessage("bot", m.text || "", {
            actions: m.actions || [],
            cardType: m.cardType,
            resumeDock: m.resumeDock,
          });
        } else {
          msgView.addMessage(m.role, m.text, m.actions);
        }
      });
    }
    renderLoadMoreControl();
    reattachStartupActionHandlers();
    threadLabel.textContent = current.thread_id ? `Thread: ${current.thread_id}` : "";
  }

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
      await handleFlowEntry(flowKind);
      return;
    }
    await restoreCurrentSessionExperience();
    console.log("[chatController] init completed");
  })();
}

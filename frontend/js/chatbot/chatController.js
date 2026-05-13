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
import { createFlowService, flowSessionBaseTitle } from "./services/flowService.js";
import { createMessageHistoryService } from "./services/messageHistoryService.js";
import { createStartupHubElement } from "./dom/startupHubCards.js";
import { resolveChatDomElements, setupChatEventManager } from "./dom/chatEventManager.js";
import * as autoModeStore from "./services/autoModeStore.js";
import * as recommendQueueStore from "./services/recommendQueueStore.js";
import { showAutoModeChoicePopup, showCountSelectorPanel } from "./dom/autoModePanel.js";
import { mountAiStatusPanel } from "./dom/aiStatusPanel.js";
import { endDwell, shouldRecommend, getLastN, getTopTopics, getActiveKind, setSession } from "./services/dwellStore.js";
import { fetchRecommendations } from "./services/aiContentApi.js";
import { mountRecommendPanel, updateRecommendPanel, setCurrentSlot } from "./dom/recommendationPanel.js";

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

/** Kind of the currently active auto-mode experience ("slide"|"quiz"|"flash"|"fullset"|null). */
let _currentAutoExpKind = null;

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
  const topBar = /** @type {HTMLElement | null} */ (document.querySelector(".top"));
  const topTitleEl = /** @type {HTMLElement | null} */ (document.querySelector(".top-title"));
  const messageScroller = /** @type {HTMLElement} */ (messages);

  const apiUrl = getChatApiUrl();
  console.log("[chatController] DOM references resolved");
  mountAiStatusPanel();
  mountRecommendPanel();
  window.addEventListener("beforeunload", () => endDwell());
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
    rerenderMessages: () => renderMessages(),
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
    topBar?.classList.toggle("startup-header", isActive);
    updateTopBarTitle(isActive);
  }

  function updateTopBarTitle(isStartup = false) {
    if (!topTitleEl) return;
    if (isStartup) {
      topTitleEl.textContent = "";
      return;
    }
    const current = getCurrentSession();
    const nextTitle = typeof current?.title === "string" && current.title.trim() ? current.title.trim() : "Đoạn hội thoại";
    topTitleEl.textContent = nextTitle;
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

  function cloneWithoutExperienceId(meta) {
    const safeMeta = meta && typeof meta === "object" ? { ...meta } : {};
    delete safeMeta.__experienceId;
    return safeMeta;
  }

  function toPositiveCountString(value, fallback) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return String(Math.floor(n));
    return String(fallback);
  }

  function getContinueCreateLabels(kind) {
    if (kind === "fullset") {
      return {
        other: "Tạo full set khác",
        intro: "Điền thông tin để Teachly tạo Full Set mới:",
        cardType: "fullset_topic",
      };
    }
    if (kind === "quiz") {
      return {
        other: "Tạo quiz khác",
        intro: "Thiết lập thông số cho bộ quiz mới tại đây:",
        cardType: "quiz_form",
      };
    }
    if (kind === "slide") {
      return {
        other: "Tạo slide khác",
        intro: "Điền thông tin để Teachly thiết kế bộ slide mới:",
        cardType: "slide_form",
      };
    }
    return {
      other: "Tạo flashcard khác",
      intro: "Cung cấp thông tin để Teachly tạo bộ Flashcard mới:",
      cardType: "flash_form",
    };
  }

  function parseQuizTopicParts(topic) {
    const parts = String(topic || "")
      .split("—")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return {
        source: parts.slice(0, -1).join(" — "),
        kind: parts[parts.length - 1],
      };
    }
    return { source: String(topic || "").trim(), kind: "" };
  }

  function readContinueCreateContext(kind) {
    const state = getCurrentExperienceState() || {};
    if (kind === "fullset") {
      const spec = state?.progress?.spec && typeof state.progress.spec === "object"
        ? state.progress.spec
        : state?.meta && typeof state.meta === "object"
          ? state.meta
          : {};
      return {
        kind,
        title: typeof state?.title === "string" && state.title.trim() ? state.title.trim() : "Full set",
        topic: String(spec.topic || "").trim(),
        spec: cloneWithoutExperienceId(spec),
        prefill: {
          slides: toPositiveCountString(spec.slides, 10),
          quiz: toPositiveCountString(spec.quiz, 20),
          flash: toPositiveCountString(spec.flash, 10),
        },
      };
    }
    if (kind === "slide") {
      const meta = state?.progress?.meta && typeof state.progress.meta === "object"
        ? state.progress.meta
        : state?.meta && typeof state.meta === "object"
          ? state.meta
          : {};
      return {
        kind,
        topic: String(meta.topic || "").trim(),
        meta: cloneWithoutExperienceId(meta),
        prefill: {
          count: toPositiveCountString(meta.count, 20),
        },
      };
    }
    if (kind === "quiz") {
      const meta = state?.progress?.meta && typeof state.progress.meta === "object"
        ? state.progress.meta
        : state?.meta && typeof state.meta === "object"
          ? state.meta
          : {};
      const parsed = parseQuizTopicParts(meta.topic);
      return {
        kind,
        topic: String(meta.topic || "").trim(),
        meta: cloneWithoutExperienceId(meta),
        prefill: {
          source: parsed.source,
          kind: parsed.kind,
          count: toPositiveCountString(meta.count, 20),
        },
      };
    }
    const meta = state?.progress?.meta && typeof state.progress.meta === "object"
      ? state.progress.meta
      : state?.meta && typeof state.meta === "object"
        ? state.meta
        : {};
    return {
      kind: "flash",
      topic: String(meta.source || "").trim(),
      meta: cloneWithoutExperienceId(meta),
      prefill: {
        list: "",
        count: toPositiveCountString(meta.count, 20),
      },
    };
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flash"} kind
   * @returns {Promise<Record<string, string> | null>}
   */
  function openContinueCreateDialog(kind) {
    const context = readContinueCreateContext(kind);
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "continue-create-overlay";
      const dialog = document.createElement("div");
      dialog.className = "continue-create-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");

      const kindLabel = kind === "fullset" ? "full set" : kind === "quiz" ? "quiz" : kind === "slide" ? "slide" : "flashcard";
      const title = document.createElement("h3");
      title.className = "continue-create-title";
      title.textContent = `Bạn muốn tiếp tục tạo ${kindLabel} cùng 1 chủ đề?`;

      const body = document.createElement("div");
      body.className = "continue-create-body";
      if (context?.topic) {
        const prompt = document.createElement("p");
        prompt.className = "flow-hint continue-create-topic";
        prompt.textContent = `Chủ đề hiện tại: ${context.topic}`;
        body.appendChild(prompt);
      }
      const error = document.createElement("p");
      error.className = "flow-err";
      error.style.display = "none";
      body.appendChild(error);

      /** @type {Record<string, HTMLInputElement>} */
      const inputs = {};
      const addNumberField = (labelText, key, value, hint = "") => {
        const field = document.createElement("div");
        field.className = "flow-field";
        const label = document.createElement("label");
        label.className = "flow-label";
        label.textContent = labelText;
        const inputEl = document.createElement("input");
        inputEl.type = "number";
        inputEl.min = "1";
        inputEl.className = "flow-input";
        inputEl.value = value;
        field.append(label, inputEl);
        if (hint) {
          const hintEl = document.createElement("p");
          hintEl.className = "flow-hint";
          hintEl.textContent = hint;
          field.appendChild(hintEl);
        }
        body.appendChild(field);
        inputs[key] = inputEl;
      };

      if (kind === "fullset") {
        addNumberField("Số slide muốn tạo tiếp", "slides", context.prefill.slides);
        addNumberField("Số câu quiz muốn tạo tiếp", "quiz", context.prefill.quiz);
        addNumberField("Số flashcard muốn tạo tiếp", "flash", context.prefill.flash);
      } else if (kind === "slide") {
        addNumberField("Số slide muốn tạo tiếp", "count", context.prefill.count);
      } else if (kind === "quiz") {
        addNumberField("Số câu muốn tạo tiếp", "count", context.prefill.count);
      } else {
        addNumberField("Số thẻ muốn tạo tiếp", "count", context.prefill.count);
      }

      const actions = document.createElement("div");
      actions.className = "continue-create-actions";
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "continue-create-btn continue-create-btn-secondary";
      cancelBtn.textContent = "Hủy";
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "continue-create-btn continue-create-btn-primary";
      confirmBtn.textContent = `Tiếp tục tạo ${kindLabel}`;
      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);

      dialog.appendChild(title);
      dialog.appendChild(body);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      cancelBtn.addEventListener("click", () => close(null));
      confirmBtn.addEventListener("click", () => {
        error.style.display = "none";
        /** @type {Record<string, string>} */
        const payload = {};
        const keys = Object.keys(inputs);
        for (let i = 0; i < keys.length; i += 1) {
          const key = keys[i];
          const raw = inputs[key].value.trim();
          const n = Number(raw);
          if (!raw || !Number.isFinite(n) || n < 1) {
            error.textContent = "Vui lòng nhập số hợp lệ lớn hơn hoặc bằng 1.";
            error.style.display = "block";
            inputs[key].focus();
            return;
          }
          payload[key] = String(Math.floor(n));
        }
        close(payload);
      });
    });
  }

  function openOtherTopicForm(kind) {
    const labels = getContinueCreateLabels(kind);
    const context = readContinueCreateContext(kind);
    const prefill =
      kind === "fullset"
        ? {
            slides: context?.prefill?.slides || "10",
            quiz: context?.prefill?.quiz || "20",
            flash: context?.prefill?.flash || "10",
          }
        : {
            count: context?.prefill?.count || "20",
          };
    layerView.hide();
    writeAppNavigationState("replace", HISTORY_CHAT_PHASE);
    experienceController.resetResumeState();
    experienceController.persistActiveExperience();
    setGuidedState({ kind, step: "await_topic_form", data: { prefill } });
    pushBot(labels.intro, {
      cardType: labels.cardType,
      cardProps: { prefill },
    });
    input.focus();
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flash"} kind
   * @param {{ preset?: "same"|"other" }} [opts]
   */
  async function continueCreateFromExperience(kind, opts) {
    const validKind =
      kind === "fullset" || kind === "quiz" || kind === "slide" || kind === "flash" ? kind : null;
    if (!validKind) return;
    const preset = opts && typeof opts === "object" ? opts.preset : undefined;
    if (preset === "other") {
      openOtherTopicForm(validKind);
      return;
    }
    if (autoModeStore.isEnabled()) {
      const capturedKind = _currentAutoExpKind || validKind;
      endDwell();
      updateRecommendPanel({ status: "recording", log: getLastN(5, capturedKind) });
      const autoCount = recommendQueueStore.onExpCompleted(capturedKind);
      if (autoCount % 5 === 0) {
        const _history = getTopTopics(5, capturedKind);
        updateRecommendPanel({ status: "loading", log: getLastN(5, capturedKind) });
        fetchRecommendations(_history, capturedKind)
          .then((data) => {
            recommendQueueStore.setRecommendations(data.topics ?? [], capturedKind);
            recommendQueueStore.startPrefetch(capturedKind, autoModeStore.getCounts());
            updateRecommendPanel({ status: "ready", suggestions: data.topics, log: getLastN(5, capturedKind) });
          })
          .catch(() => updateRecommendPanel({ status: "recording", log: getLastN(5, capturedKind) }));
      }
      await launchAutoMode(validKind, autoModeStore.getCounts());
      return;
    }
    const nextCounts = await openContinueCreateDialog(validKind);
    if (!nextCounts) {
      input.focus();
      return;
    }
    const context = readContinueCreateContext(validKind);
    if (validKind === "fullset") {
      const nextSpec = {
        ...(context?.spec && typeof context.spec === "object" ? context.spec : {}),
        slides: nextCounts.slides || context?.prefill?.slides || "10",
        quiz: nextCounts.quiz || context?.prefill?.quiz || "20",
        flash: nextCounts.flash || context?.prefill?.flash || "10",
      };
      delete nextSpec.__experienceId;
      await openResumeFullSetMixed(nextSpec, context?.title || "Full set");
      return;
    }
    const nextMeta = {
      ...(context?.meta && typeof context.meta === "object" ? context.meta : {}),
      count: nextCounts.count || context?.prefill?.count || "20",
    };
    delete nextMeta.__experienceId;
    await openSingleExperience(validKind, nextMeta, "fresh");
    input.focus();
  }

  function persistActiveExperience() {
    if (!experienceController) return;
    experienceController.persistActiveExperience();
  }

  function autoRenameCurrentSession(flowKind) {
    const cur = getCurrentSession();
    if (!cur || !/^Đoạn chat\s+\d+$/i.test(cur.title)) return;
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
    cur.title = `${base} ${max + 1}`;
    renderChatListUI();
    saveSessions();
  }

  async function openSingleExperience(kind, meta, mode, experienceId) {
    if (!experienceController) return;
    const flowKind = kind === "flash" ? "flashcard" : kind;
    if (flowKind === "quiz" || flowKind === "slide" || flowKind === "flashcard") {
      autoRenameCurrentSession(flowKind);
    }
    await experienceController.openSingleExperience(kind, meta, mode, experienceId);
  }

  /** Normalize "flashcard" URL param value → internal "flash" experience kind. */
  function toExpKind(flowKind) {
    return flowKind === "flashcard" ? "flash" : flowKind;
  }

  /**
   * Auto-generate content immediately using a random topic.
   * @param {"fullset"|"slide"|"quiz"|"flash"} expKind - already normalized
   * @param {{ slides: number, quiz: number, flash: number }} counts
   */
  async function launchAutoMode(expKind, counts) {
    _currentAutoExpKind = expKind;

    const spec = recommendQueueStore.getNextSpec(expKind, counts);
    setCurrentSlot(spec.slot || "");

    if (recommendQueueStore.shouldAutoAdvance(expKind)) {
      const kind = expKind;
      if (kind === "fullset") {
        await openResumeFullSetMixed(
          {
            topic: spec.topic,
            slides: String(counts.slides),
            quiz: String(counts.quiz),
            flash: String(counts.flash),
            slideTemplate: autoModeStore.pickRandomTheme(),
            __prefetchId: spec.prefetchKey || "",
          },
          `Full Set — ${spec.topic}`,
        );
        return;
      }
      const count = kind === "slide" ? counts.slides : kind === "quiz" ? counts.quiz : counts.flash;
      const meta =
        kind === "flash"
          ? { source: spec.topic, count: String(count), __autoMode: "1", __prefetchId: spec.prefetchKey || "" }
          : { topic: spec.topic, count: String(count), __autoMode: "1", __prefetchId: spec.prefetchKey || "",
              ...(kind === "slide" ? { slideTemplate: autoModeStore.pickRandomTheme() } : {}) };
      await openSingleExperience(kind, meta, "fresh");
      return;
    }

    // Warmup (exp 1–7): pick random topic, mock content happens naturally
    const topic = spec.topic;
    if (expKind === "fullset") {
      await openResumeFullSetMixed(
        {
          topic,
          slides: String(counts.slides),
          quiz: String(counts.quiz),
          flash: String(counts.flash),
          slideTemplate: autoModeStore.pickRandomTheme(),
        },
        `Full Set — ${topic}`,
      );
      return;
    }
    const count = expKind === "slide" ? counts.slides : expKind === "quiz" ? counts.quiz : counts.flash;
    const meta =
      expKind === "flash"
        ? { source: topic, count: String(count), __autoMode: "1", __forceMock: "1" }
        : { topic, count: String(count), __autoMode: "1", __forceMock: "1", ...(expKind === "slide" ? { slideTemplate: autoModeStore.pickRandomTheme() } : {}) };
    await openSingleExperience(expKind, meta, "fresh");
  }

  /**
   * Intercepts a card click: shows the auto mode choice popup or count selector.
   * @param {"fullset"|"quiz"|"slide"|"flashcard"|"flash"} flowKind
   * @param {() => void | Promise<void>} onCustom - called to proceed with the normal guided flow
   */
  function syncToggleUI(enabled) {
    const toggleBtn = document.querySelector(".auto-mode-toggle");
    if (!toggleBtn) return;
    toggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    const lbl = toggleBtn.querySelector(".toggle-label");
    if (lbl) lbl.textContent = enabled ? "Tạo Auto" : "Tạo Custom";
  }

  function handleFlowWithAutoMode(flowKind, onCustom) {
    const expKind = toExpKind(flowKind);

    function openCountSelector() {
      if (autoModeStore.getNeverAskCount()) {
        void launchAutoMode(expKind, autoModeStore.getCounts());
        return;
      }
      showCountSelectorPanel(expKind, autoModeStore.getCounts(), {
        onConfirm: (counts, neverAsk) => {
          autoModeStore.saveCounts(counts);
          if (neverAsk) autoModeStore.setNeverAskCount(true);
          void launchAutoMode(expKind, counts);
        },
        onCancel: () => {},
      });
    }

    if (autoModeStore.isEnabled()) {
      openCountSelector();
      return;
    }

    const savedChoice = autoModeStore.getNeverAskChoice();
    if (savedChoice === "auto") {
      autoModeStore.enable();
      syncToggleUI(true);
      openCountSelector();
      return;
    }
    if (savedChoice === "custom") {
      void onCustom();
      return;
    }

    showAutoModeChoicePopup(expKind, {
      onCustom: () => {
        void onCustom();
      },
      onAuto: () => {
        autoModeStore.enable();
        syncToggleUI(true);
        openCountSelector();
      },
    });
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
    autoRenameCurrentSession("fullset");
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
    updateTopBarTitle(Boolean(chatPhase.classList.contains("startup-mode")));
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
    const wasExperienceVisible = experienceLayer.classList.contains("visible");
    if (!restoreNavigationSnapshot(snapshot)) return false;
    currentHistoryNavSeq = Number.isFinite(targetNavSeq) ? Math.floor(targetNavSeq) : currentHistoryNavSeq;
    currentBrowserHistoryIndex = getBrowserHistoryIndex();
    if (state?.phase === HISTORY_EXPERIENCE_PHASE) {
      await restoreCurrentSessionExperience();
      return true;
    }
    layerView.hide();
    if (wasExperienceVisible) {
      pushResumeDockFromLastOpened();
      scrollToResumeDock();
    }
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
    const _kind = getActiveKind();
    const _dwellCount = endDwell();
    const _prevSessionId = getCurrentSessionId();
    if (_dwellCount > 0 && shouldRecommend(_kind)) {
      const _history = getTopTopics(5, _kind);
      updateRecommendPanel({ status: "loading", log: getLastN(5, _kind) });
      fetchRecommendations(_history, _kind)
        .then(data => {
          if (getCurrentSessionId() !== _prevSessionId) return;
          recommendQueueStore.setRecommendations(data.topics ?? [], _kind);
          recommendQueueStore.startPrefetch(_kind, autoModeStore.getCounts());
          updateRecommendPanel({ status: "ready", suggestions: data.topics, log: getLastN(5, _kind) });
        })
        .catch(() => {
          if (getCurrentSessionId() !== _prevSessionId) return;
          updateRecommendPanel({ status: "recording", log: getLastN(5, _kind) });
        });
    } else {
      updateRecommendPanel({ status: "recording", log: getLastN(5, _kind) });
    }
    try {
      persistActiveExperience();
      setActiveSessionIndex(idx);
      setSession(getCurrentSessionId());
      recommendQueueStore.setSession(getCurrentSessionId());
      updateRecommendPanel({ status: "recording", log: getLastN(5), suggestions: [] });
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
    } finally {
      isSwitchingSession = false;
    }
    // Mount experience outside the switch lock so rapid session switches aren't blocked.
    // Concurrent mounts are safe: the _genStamp stamp on layerView.body ensures only the
    // most recent mount writes to the DOM.
    await restoreCurrentSessionExperience();
    writeAppNavigationState("push", resolveCurrentPhase());
  }, onSessionDeleted: async () => {
    setGuidedState(null);
    experienceController.resetResumeState();
    persistActiveExperience();
    layerView.hide();
    renderMessages();
    writeAppNavigationState("replace");
    setSession(getCurrentSessionId());
    recommendQueueStore.setSession(getCurrentSessionId());
    updateRecommendPanel({ status: "recording", log: getLastN(5), suggestions: [] });
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

  messageHistoryService.setStartupFlowHandler((flowKind) =>
    handleFlowWithAutoMode(flowKind, () => flowService.startFlowInCurrentSession(flowKind)),
  );

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
      setSession(getCurrentSessionId());
      recommendQueueStore.setSession(getCurrentSessionId());
      updateRecommendPanel({ status: "recording", log: getLastN(5), suggestions: [] });
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
    handleFlowEntry: (flowKind) =>
      handleFlowWithAutoMode(flowKind, () => flowService.handleFlowEntry(flowKind)),
    restoreCurrentSessionExperience: () => restoreCurrentSessionExperience(),
    onBeforeBack: () => {
      if (!autoModeStore.isEnabled() || !_currentAutoExpKind) return false;
      const capturedKind = _currentAutoExpKind;
      endDwell();
      updateRecommendPanel({ status: "recording", log: getLastN(5, capturedKind) });
      const autoCount = recommendQueueStore.onExpCompleted(capturedKind);
      if (autoCount % 5 === 0) {
        const history = getTopTopics(5, capturedKind);
        updateRecommendPanel({ status: "loading", log: getLastN(5, capturedKind) });
        fetchRecommendations(history, capturedKind)
          .then((data) => {
            recommendQueueStore.setRecommendations(data.topics ?? [], capturedKind);
            recommendQueueStore.startPrefetch(capturedKind, autoModeStore.getCounts());
            updateRecommendPanel({ status: "ready", suggestions: data.topics, log: getLastN(5, capturedKind) });
          })
          .catch(() => updateRecommendPanel({ status: "recording", log: getLastN(5, capturedKind) }));
      }
      if (recommendQueueStore.shouldAutoAdvance(capturedKind)) {
        _currentAutoExpKind = null;
        void launchAutoMode(capturedKind, autoModeStore.getCounts());
        return true;
      }
      return false;
    },
    onInitBaseRendered: () => { setSession(getCurrentSessionId()); recommendQueueStore.setSession(getCurrentSessionId()); console.log("[chatController] base state rendered"); },
    onInitCompleted: () => {
      writeAppNavigationState("replace", resolveCurrentPhase());
      console.log("[chatController] init completed");
    },
  });

  writeAppNavigationState("replace", resolveCurrentPhase());
}

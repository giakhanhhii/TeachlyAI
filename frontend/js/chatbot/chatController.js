import { getChatApiUrl } from "./config.js";
import { postChat } from "./chatApi.js";
import {
  ensureSessions,
  saveSessions,
  getCurrentSession,
  getActiveSessionIndex,
  setActiveSessionIndex,
  getSessionsSnapshot,
  createSession,
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

/** @type {any} */
let guided = null;

/** Snapshot học liệu tương tác vừa mở (để quay lại chat thì gắn thẻ "Mở"). */
let lastOpenedExperience = null;
const SS_ACTIVE_EXPERIENCE = "teachly.chat.activeExperience";
const HISTORY_CHAT_PHASE = "chat";
const HISTORY_EXPERIENCE_PHASE = "experience";

/**
 * @param {"quiz"|"slide"|"flash"} kind
 * @param {Record<string, string>} meta
 */
function buildResumeTitle(kind, meta) {
  if (kind === "quiz") return `Trắc nghiệm — ${meta.topic || "Bộ đề"}`;
  if (kind === "slide") return `Slide — ${meta.topic || "Bài giảng"}`;
  if (kind === "flash") return `Flashcard — ${meta.source || "Bộ thẻ"}`;
  return "Học liệu";
}

/**
 * @param {"quiz"|"slide"|"flash"} kind
 * @param {Record<string, string>} meta
 */
function rememberOpenExperience(kind, meta) {
  lastOpenedExperience = {
    bundleBack: false,
    kind,
    meta: { ...meta },
    title: buildResumeTitle(kind, meta),
  };
}

function persistActiveExperience() {
  try {
    if (!lastOpenedExperience) {
      sessionStorage.removeItem(SS_ACTIVE_EXPERIENCE);
      return;
    }
    sessionStorage.setItem(SS_ACTIVE_EXPERIENCE, JSON.stringify(lastOpenedExperience));
  } catch {
    // Ignore storage errors to avoid breaking UI flow.
  }
}

/**
 * @param {string} title
 * @param {any[]} items
 */
function rememberOpenBundleForBack(title, items) {
  lastOpenedExperience = {
    bundleBack: true,
    title: title || "Full set",
    items: items.map((it) => ({
      kind: it.kind,
      meta: { ...(it.meta || {}) },
      title: it.title,
      openedAt: it.openedAt,
    })),
  };
}

/**
 * @param {string} title
 * @param {Record<string, string>} spec
 */
function rememberOpenFullSetMixedForBack(title, spec) {
  lastOpenedExperience = {
    fullsetMixedBack: true,
    title: title || "Full set",
    fullsetMixed: { ...spec },
  };
}

function readPersistedActiveExperience() {
  try {
    const raw = sessionStorage.getItem(SS_ACTIVE_EXPERIENCE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, string>} spec
 * @param {string} openedAtIso
 */
function fullsetResumeItemsFromSpec(spec, openedAtIso) {
  const topic = spec.topic || "—";
  const t = openedAtIso || new Date().toISOString();
  return [
    {
      kind: "slide",
      meta: { topic, count: String(spec.slides || "—"), notes: "Full set (demo mock)" },
      title: `Slide — ${topic}`,
      openedAt: t,
    },
    {
      kind: "quiz",
      meta: { topic, count: String(spec.quiz || "—"), notes: "Full set (demo mock)" },
      title: `Trắc nghiệm — ${topic}`,
      openedAt: t,
    },
    {
      kind: "flash",
      meta: { source: topic, count: String(spec.flash || "—"), extra: "Full set (demo mock)" },
      title: `Flashcard — ${topic}`,
      openedAt: t,
    },
  ];
}

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

  const apiUrl = getChatApiUrl();

  const layerView = createExperienceLayerView({
    experienceLayer,
    experienceBody,
    chatPhase,
  });

  /** @type {ReturnType<typeof createMessageView>} */
  let msgView;

  function ensureHistoryBaseState() {
    const state = history.state && typeof history.state === "object" ? history.state : {};
    if (state.phase === HISTORY_CHAT_PHASE || state.phase === HISTORY_EXPERIENCE_PHASE) return;
    history.replaceState({ ...state, phase: HISTORY_CHAT_PHASE }, "", location.href);
  }

  function ensureExperienceHistoryEntry() {
    ensureHistoryBaseState();
    const state = history.state && typeof history.state === "object" ? history.state : {};
    if (state.phase === HISTORY_EXPERIENCE_PHASE) return;
    history.pushState({ ...state, phase: HISTORY_EXPERIENCE_PHASE }, "", location.href);
  }

  function inExperienceHistoryState() {
    const state = history.state && typeof history.state === "object" ? history.state : {};
    return state.phase === HISTORY_EXPERIENCE_PHASE;
  }

  function pushResumeDockFromLastOpened() {
    if (!lastOpenedExperience) return;
    const now = new Date().toISOString();
    if (lastOpenedExperience.bundleBack) {
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock: {
          title: lastOpenedExperience.title,
          items: lastOpenedExperience.items,
          openedAt: now,
        },
      });
    } else if (lastOpenedExperience.fullsetMixedBack) {
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock: {
          title: lastOpenedExperience.title,
          fullsetMixed: { ...lastOpenedExperience.fullsetMixed },
          items: fullsetResumeItemsFromSpec(lastOpenedExperience.fullsetMixed, now),
          openedAt: now,
        },
      });
    } else {
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock: {
          kind: lastOpenedExperience.kind,
          meta: { ...lastOpenedExperience.meta },
          title: lastOpenedExperience.title,
          openedAt: now,
        },
      });
    }
    lastOpenedExperience = null;
    persistActiveExperience();
  }

  function pushUser(text) {
    const current = getCurrentSession();
    msgView.addMessage("user", text);
    current.messages.push({ role: "user", text });
    saveSessions();
  }

  /**
   * @param {string} text
   * @param {any} opts legacy: actions array, hoặc `{ actions?, cardType?, resumeDock? }`
   */
  function pushBot(text, opts) {
    const current = getCurrentSession();
    /** @type {{ label: string, value: string }[]} */
    let actions = [];
    /** @type {string | undefined} */
    let cardType;
    /** @type {any} */
    let resumeDock;
    if (Array.isArray(opts)) actions = opts;
    else if (opts && typeof opts === "object") {
      if (Array.isArray(opts.actions)) actions = opts.actions;
      if (typeof opts.cardType === "string") cardType = opts.cardType;
      if (opts.resumeDock) resumeDock = opts.resumeDock;
    }
    msgView.addMessage("bot", text, { actions, cardType, resumeDock });
    const entry = { role: "bot", text };
    if (actions.length) entry.actions = actions;
    if (cardType) entry.cardType = cardType;
    if (resumeDock) entry.resumeDock = resumeDock;
    current.messages.push(entry);
    saveSessions();
  }

  function openChatWithAiDraft(text) {
    layerView.hide();
    input.value = text;
    input.focus();
  }

  const experienceHooks = { onAiEdit: openChatWithAiDraft };

  async function applyEffects(effects) {
    for (const e of effects) {
      if (e.type === "pushUser") pushUser(e.text);
      else if (e.type === "pushBot") pushBot(e.text, { actions: e.actions, cardType: e.cardType, resumeDock: e.resumeDock });
      else if (e.type === "showQuiz") {
        rememberOpenExperience("quiz", e.meta || {});
        persistActiveExperience();
        ensureExperienceHistoryEntry();
        await mountQuizExperience(layerView, e.meta, experienceHooks);
      } else if (e.type === "showFlash") {
        rememberOpenExperience("flash", e.meta || {});
        persistActiveExperience();
        ensureExperienceHistoryEntry();
        await mountFlashExperience(layerView, e.meta, experienceHooks);
      } else if (e.type === "showSlide") {
        rememberOpenExperience("slide", e.meta || {});
        persistActiveExperience();
        ensureExperienceHistoryEntry();
        await mountSlideExperience(layerView, e.meta, experienceHooks);
      }
    }
  }

  /**
   * @param {{ kind: string, meta: Record<string, string> }} item
   */
  async function openResumeExperience(item) {
    const rawKind = String(item?.kind || "").toLowerCase();
    const kind =
      rawKind === "flashcard" || rawKind === "flash"
        ? "flash"
        : rawKind.startsWith("quiz")
          ? "quiz"
          : rawKind.startsWith("slide")
            ? "slide"
            : rawKind;
    if (kind !== "quiz" && kind !== "slide" && kind !== "flash") {
      layerView.hide();
      return;
    }
    try {
      rememberOpenExperience(/** @type {"quiz"|"slide"|"flash"} */ (kind), item.meta || {});
      persistActiveExperience();
      ensureExperienceHistoryEntry();
      layerView.prepareShow();
      if (kind === "quiz") await mountQuizExperience(layerView, item.meta, experienceHooks);
      else if (kind === "slide") await mountSlideExperience(layerView, item.meta, experienceHooks);
      else await mountFlashExperience(layerView, item.meta, experienceHooks);
    } catch {
      layerView.hide();
    }
  }

  /**
   * @param {any[]} items
   * @param {string} bundleTitle
   */
  async function openResumeOpenAll(items, bundleTitle) {
    rememberOpenBundleForBack(bundleTitle || "Full set", items);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    layerView.prepareShow();
    await mountFullSetHubExperience(
      layerView,
      { title: bundleTitle || "Full set", items },
      async (item) => {
        await openResumeExperience(item);
      },
    );
  }

  /**
   * @param {Record<string, string>} spec
   * @param {string} bundleTitle
   */
  async function openResumeFullSetMixed(spec, bundleTitle) {
    rememberOpenFullSetMixedForBack(bundleTitle || "Full set", spec);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    layerView.prepareShow();
    await mountFullSetMixedExperience(
      layerView,
      { title: bundleTitle || "Full set", spec },
      experienceHooks,
    );
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
    onFlowAction(value, btnEl) {
      if (guided?.step === "await_source" && PDF_SOURCE_ACTION_VALUES.has(value)) {
        void (async () => {
          btnEl.disabled = true;
          const file = await pickPdfWithDialog();
          btnEl.disabled = false;
          if (!file) {
            const again = getRestartAwaitSourceEffects(guided.kind);
            if (again.length) await applyEffects(again);
            return;
          }
          if (value === "fullset_pdf") setPendingPdfFile(file);
          const result = computePickAction(guided, value, {
            pdfFile: value === "slide_pdf" || value === "quiz_pdf" || value === "flash_pdf" ? file : undefined,
          });
          if (!result.handled) return;
          msgView.disableActionButtons(btnEl);
          guided = result.guided;
          await applyEffects(result.effects);
        })();
        return;
      }
      const result = computePickAction(guided, value);
      if (!result.handled) return;
      msgView.disableActionButtons(btnEl);
      guided = result.guided;
      void applyEffects(result.effects);
    },
    onFlowCardSubmit(cardType, payload) {
      const result = computeFlowCardSubmit(guided, cardType, payload);
      if (!result.handled) return;
      guided = result.guided;
      void applyEffects(result.effects);
    },
  });

  function renderChatListUI() {
    renderChatList(
      /** @type {HTMLElement} */(chatList),
      getSessionsSnapshot(),
      getActiveSessionIndex(),
      (idx) => {
        setActiveSessionIndex(idx);
        guided = null;
        lastOpenedExperience = null;
        layerView.hide();
        saveSessions();
        renderChatListUI();
        renderMessages();
      },
    );
  }

  function renderMessages() {
    msgView.clear();
    const current = getCurrentSession();
    if (!current || !Array.isArray(current.messages)) {
      ensureSessions();
      saveSessions();
      return;
    }
    const params = new URLSearchParams(location.search);
    const flow = params.get("flow");
    if (flow) {
      current.messages = [];
      current.thread_id = "";
      guided = null;
      lastOpenedExperience = null;
      layerView.hide();
      saveSessions();
      history.replaceState({}, "", "chatbot_ui.html");
      const start = computeStartFlow(flow);
      guided = start.guided;
      void applyEffects(start.effects);
      threadLabel.textContent = "";
      return;
    }
    if (!current.messages.length) {
      const welcome = "Xin chào! Mình là Teachly AI. Bạn muốn học gì hôm nay?";
      msgView.addMessage("bot", welcome);
      current.messages.push({ role: "bot", text: welcome });
      saveSessions();
    } else {
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
    threadLabel.textContent = current.thread_id ? `Thread: ${current.thread_id}` : "";
  }

  async function sendPrompt(prompt) {
    const current = getCurrentSession();
    msgView.addMessage("user", prompt);
    current.messages.push({ role: "user", text: prompt });
    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;
    const thinking = msgView.addThinkingBubble();
    try {
      const data = await postChat(apiUrl, prompt, current.thread_id);
      current.thread_id = data.thread_id;
      threadLabel.textContent = `Thread: ${current.thread_id}`;
      thinking.row.remove();
      await msgView.streamBotReply(data.reply);
      current.messages.push({ role: "bot", text: data.reply });
      saveSessions();
    } catch (err) {
      thinking.row.remove();
      const errMsg = `Lỗi: ${err.message}`;
      msgView.addMessage("bot", errMsg);
      current.messages.push({ role: "bot", text: errMsg });
      saveSessions();
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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

  newChatBtn.addEventListener("click", () => {
    createSession();
    guided = null;
    lastOpenedExperience = null;
    persistActiveExperience();
    layerView.hide();
    renderChatListUI();
    renderMessages();
    saveSessions();
  });

  document.getElementById("backToChatBtn").addEventListener("click", () => {
    if (inExperienceHistoryState()) {
      history.back();
      return;
    }
    layerView.hide();
    pushResumeDockFromLastOpened();
  });

  document.getElementById("toggleSidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("collapsed");
  });

  document.getElementById("topHomeBtn").addEventListener("click", () => {
    location.href = "main_hub.html";
  });

  window.addEventListener("popstate", () => {
    const state = history.state && typeof history.state === "object" ? history.state : {};
    if (state.phase === HISTORY_EXPERIENCE_PHASE) return;
    if (!lastOpenedExperience) {
      layerView.hide();
      persistActiveExperience();
      return;
    }
    layerView.hide();
    pushResumeDockFromLastOpened();
  });

  ensureSessions();
  ensureHistoryBaseState();
  renderChatListUI();
  renderMessages();
  const restored = readPersistedActiveExperience();
  if (restored) {
    lastOpenedExperience = restored;
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    if (restored.bundleBack && Array.isArray(restored.items)) {
      void openResumeOpenAll(restored.items, restored.title || "Full set");
    } else if (restored.fullsetMixedBack && restored.fullsetMixed) {
      void openResumeFullSetMixed(restored.fullsetMixed, restored.title || "Full set");
    } else if (restored.kind) {
      void openResumeExperience({ kind: restored.kind, meta: restored.meta || {} });
    }
  }
}

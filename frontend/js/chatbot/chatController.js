import { getChatApiUrl } from "./config.js";
import { postChat } from "./chatApi.js";
import {
  ensureSessions,
  saveSessions,
  getCurrentSession,
  getCurrentExperienceState,
  getActiveSessionIndex,
  setActiveSessionIndex,
  findSessionIndexByExperienceKind,
  getSessionsSnapshot,
  createSession,
  renameSession,
  togglePinSession,
  deleteSession,
  setCurrentExperienceState,
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
let resumeDockAlreadyPosted = false;
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
  resumeDockAlreadyPosted = false;
}

function persistActiveExperience() {
  const currentState = getCurrentExperienceState() || {};
  if (!lastOpenedExperience) {
    if (currentState && typeof currentState === "object" && currentState.resume) {
      const next = { ...currentState };
      delete next.resume;
      setCurrentExperienceState(next);
      saveSessions();
    }
    return;
  }
  setCurrentExperienceState({
    ...currentState,
    resume: lastOpenedExperience,
  });
  saveSessions();
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
  resumeDockAlreadyPosted = false;
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
  resumeDockAlreadyPosted = false;
}

function readPersistedActiveExperience() {
  const state = getCurrentExperienceState();
  const resume = state?.resume;
  return resume && typeof resume === "object" ? resume : null;
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
    if (resumeDockAlreadyPosted) {
      lastOpenedExperience = null;
      resumeDockAlreadyPosted = false;
      persistActiveExperience();
      return;
    }
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
    resumeDockAlreadyPosted = false;
    persistActiveExperience();
  }

  function pushUser(text) {
    const current = getCurrentSession();
    msgView.addMessage("user", text);
    current.messages.push({ role: "user", text });
    saveSessions();
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   */
  function pushQuickResumeDock(kind, meta) {
    const now = new Date().toISOString();
    pushBot("Đã tạo xong. Bạn có thể bấm Mở để quay lại học liệu này.", {
      resumeDock: {
        kind,
        meta: { ...meta },
        title: buildResumeTitle(kind, meta || {}),
        openedAt: now,
      },
    });
    resumeDockAlreadyPosted = true;
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

  /**
   * @param {Record<string, string>} a
   * @param {Record<string, string>} b
   */
  function sameMeta(a, b) {
    const ak = Object.keys(a || {}).sort();
    const bk = Object.keys(b || {}).sort();
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i += 1) {
      const key = ak[i];
      if (key !== bk[i]) return false;
      if (String(a[key] || "") !== String(b[key] || "")) return false;
    }
    return true;
  }

  /**
   * @param {"quiz"|"slide"|"flash"|"fullset"} kind
   * @param {any} progress
   */
  function computeCompleted(kind, progress) {
    const total = Number(progress?.total || 0);
    const index = Number(progress?.index || 0);
    if (!Number.isFinite(total) || total <= 0) return false;
    if (!Number.isFinite(index) || index < total - 1) return false;
    if (kind === "quiz") {
      const graded = Array.isArray(progress?.gradedByIndex) ? progress.gradedByIndex : [];
      return Boolean(graded[total - 1]);
    }
    if (kind === "fullset") {
      return Boolean(progress?.completed) || index >= total - 1;
    }
    return true;
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {"fresh"|"resume"} mode
   */
  async function openSingleExperience(kind, meta, mode) {
    rememberOpenExperience(kind, meta || {});
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    const currentExpState = getCurrentExperienceState() || {};
    const persisted = mode === "resume" && currentExpState.kind === kind ? currentExpState.progress : null;
    const initialState =
      persisted && persisted.meta && sameMeta(persisted.meta, meta || {}) ? persisted : null;
    const mountOpts = {
      initialState,
      onStateChange: (state) => {
        setCurrentExperienceState({
          ...getCurrentExperienceState(),
          kind,
          meta: { ...meta },
          progress: state,
          completed: computeCompleted(kind, state),
          resume: lastOpenedExperience,
        });
        saveSessions();
      },
    };
    if (mode === "fresh") {
      setCurrentExperienceState({
        kind,
        meta: { ...meta },
        progress: null,
        completed: false,
        resume: lastOpenedExperience,
      });
      saveSessions();
    }
    if (kind === "quiz") await mountQuizExperience(layerView, meta, experienceHooks, mountOpts);
    else if (kind === "slide") await mountSlideExperience(layerView, meta, experienceHooks, mountOpts);
    else await mountFlashExperience(layerView, meta, experienceHooks, mountOpts);
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
      await openSingleExperience(
        /** @type {"quiz"|"slide"|"flash"} */ (kind),
        item.meta || {},
        "resume",
      );
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
    setCurrentExperienceState({
      kind: "fullset",
      meta: { mode: "hub", title: bundleTitle || "Full set" },
      progress: null,
      completed: false,
      resume: lastOpenedExperience,
    });
    saveSessions();
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
    const fullsetState = getCurrentExperienceState();
    const persisted = fullsetState?.kind === "fullset" ? fullsetState.progress : null;
    const initialState =
      persisted && persisted.spec && sameMeta(persisted.spec, spec || {}) ? persisted : null;
    await mountFullSetMixedExperience(
      layerView,
      { title: bundleTitle || "Full set", spec },
      experienceHooks,
      {
        initialState,
        onStateChange: (state) => {
          setCurrentExperienceState({
            ...getCurrentExperienceState(),
            kind: "fullset",
            meta: { ...spec },
            progress: state,
            completed: computeCompleted("fullset", state),
            resume: lastOpenedExperience,
          });
          saveSessions();
        },
      },
    );
  }

  async function restoreCurrentSessionExperience() {
    const restored = readPersistedActiveExperience();
    if (!restored) {
      layerView.hide();
      return;
    }
    lastOpenedExperience = restored;
    ensureExperienceHistoryEntry();
    if (restored.bundleBack && Array.isArray(restored.items)) {
      await openResumeOpenAll(restored.items, restored.title || "Full set");
    } else if (restored.fullsetMixedBack && restored.fullsetMixed) {
      await openResumeFullSetMixed(restored.fullsetMixed, restored.title || "Full set");
    } else if (restored.kind) {
      await openResumeExperience({ kind: restored.kind, meta: restored.meta || {} });
    }
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
    renderChatList(
      /** @type {HTMLElement} */(chatList),
      getSessionsSnapshot(),
      getActiveSessionIndex(),
      (idx) => {
        persistActiveExperience();
        setActiveSessionIndex(idx);
        guided = null;
        lastOpenedExperience = null;
        layerView.hide();
        saveSessions();
        renderChatListUI();
        renderMessages();
        void restoreCurrentSessionExperience();
      },
      (action, idx) => {
        if (action === "pin") {
          if (togglePinSession(idx)) {
            saveSessions();
            renderChatListUI();
          }
          return;
        }
        if (action === "rename") {
          const currentSession = getSessionsSnapshot()[idx];
          const nextTitle = window.prompt("Nhập tên mới cho đoạn chat", currentSession?.title || "");
          if (nextTitle && renameSession(idx, nextTitle)) {
            saveSessions();
            renderChatListUI();
          }
          return;
        }
        if (action === "delete") {
          const ok = window.confirm("Bạn có chắc muốn xóa đoạn chat này?");
          if (!ok) return;
          if (deleteSession(idx)) {
            guided = null;
            lastOpenedExperience = null;
            persistActiveExperience();
            layerView.hide();
            saveSessions();
            renderChatListUI();
            renderMessages();
          }
          return;
        }
        if (action === "share") {
          const s = getSessionsSnapshot()[idx];
          const transcript = (s?.messages || [])
            .map((m) => `${m.role === "user" ? "Bạn" : "Teachly"}: ${m.text || ""}`)
            .join("\n");
          const payload = `${s?.title || "Đoạn chat"}\n\n${transcript}`;
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(payload).then(
              () => window.alert("Đã sao chép nội dung cuộc trò chuyện."),
              () => window.alert("Không thể sao chép tự động. Vui lòng thử lại."),
            );
          } else {
            window.alert("Trình duyệt không hỗ trợ clipboard.");
          }
        }
      },
    );
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
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function handleFlowEntry(flowKind) {
    const expKind = flowToExperienceKind(flowKind);
    const existingIdx = findSessionIndexByExperienceKind(expKind, { excludeIndex: -1 });
    if (existingIdx >= 0) {
      const msg = `Bạn đang có 1 ${expKind} chưa xong. Chắc chắn muốn tạo mới?`;
      const createNew = window.confirm(msg);
      if (!createNew) {
        persistActiveExperience();
        setActiveSessionIndex(existingIdx);
        guided = null;
        lastOpenedExperience = null;
        layerView.hide();
        saveSessions();
        renderChatListUI();
        renderMessages();
        await restoreCurrentSessionExperience();
        history.replaceState({}, "", "chatbot_ui.html");
        return;
      }
    }

    persistActiveExperience();
    createSession({
      title: buildNextFlowSessionTitle(flowKind),
      experienceState: {
        kind: expKind,
        meta: { flow: flowKind },
        progress: null,
        completed: false,
      },
    });
    guided = null;
    lastOpenedExperience = null;
    layerView.hide();
    saveSessions();
    renderChatListUI();
    renderMessages();
    const start = computeStartFlow(flowKind);
    guided = start.guided;
    await applyEffects(start.effects);
    history.replaceState({}, "", "chatbot_ui.html");
  }

  function renderMessages() {
    msgView.clear();
    const current = getCurrentSession();
    if (!current || !Array.isArray(current.messages)) {
      ensureSessions();
      saveSessions();
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
  const params = new URLSearchParams(location.search);
  const flowKind = normalizeFlowParam(params.get("flow"));
  if (flowKind) {
    void handleFlowEntry(flowKind);
    return;
  }
  void restoreCurrentSessionExperience();
}

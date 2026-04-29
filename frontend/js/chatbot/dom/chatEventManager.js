import { bindNewChatButton } from "../controllers/sessionController.js";
import {
  canBackToChatFromHistoryState,
  createPopStateHandler,
} from "../services/historyService.js";
import { normalizeFlowParam } from "../services/flowService.js";

function clearFlowParamFromUrl() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has("flow")) return;
    url.searchParams.delete("flow");
    history.replaceState(history.state, "", url.toString());
  } catch {
    // Ignore URL cleanup failures and keep the current page usable.
  }
}

export function resolveChatDomElements() {
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
    return null;
  }

  const optionalEls = { backToChatBtn, toggleSidebarBtn, topHomeBtn };
  const missingOptionalIds = Object.entries(optionalEls)
    .filter(([, el]) => !el)
    .map(([name]) => name);
  if (missingOptionalIds.length) {
    console.warn("[chatController] optional controls missing, continue init:", missingOptionalIds);
  }

  return {
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
    backToChatBtn,
    toggleSidebarBtn,
    topHomeBtn,
  };
}

/**
 * @param {{
 *   form: HTMLFormElement,
 *   input: HTMLInputElement,
 *   newChatBtn: HTMLButtonElement,
 *   backToChatBtn?: HTMLButtonElement | null,
 *   toggleSidebarBtn?: HTMLButtonElement | null,
 *   topHomeBtn?: HTMLButtonElement | null,
 *   getIsSending: () => boolean,
 *   setSendingState: (next: boolean) => void,
 *   getGuided: () => any,
 *   onGuidedPrompt: (prompt: string, guidedState: any) => Promise<boolean>,
 *   onSendPrompt: (prompt: string) => void,
 *   onCreateNewChat: () => void | Promise<void>,
 *   hasLastOpenedExperience: () => boolean,
 *   isExperienceVisible?: () => boolean,
 *   hideLayer: () => void,
 *   persistActiveExperience: () => void,
 *   pushResumeDockFromLastOpened: () => void,
 *   restoreNavigationSnapshot?: (snapshot: any, state?: any) => boolean,
 *   restoreCurrentSessionExperienceFromHistory?: () => Promise<void>,
 *   scrollToResumeDock: () => void,
 *   ensureSessions: () => void,
 *   ensureHistoryBaseState: () => void,
 *   renderChatListUI: () => void,
 *   ensureSessionMessagesLoaded: () => Promise<any>,
 *   renderMessages: () => void,
 *   handleFlowEntry: (flowKind: "quiz" | "slide" | "flash") => Promise<void>,
 *   restoreCurrentSessionExperience: () => Promise<void>,
 *   onInitBaseRendered?: () => void,
 *   onInitCompleted?: () => void,
 * }} deps
 */
export function setupChatEventManager(deps) {
  const {
    form,
    input,
    newChatBtn,
    backToChatBtn,
    toggleSidebarBtn,
    topHomeBtn,
    getIsSending,
    setSendingState,
    getGuided,
    onGuidedPrompt,
    onSendPrompt,
    onCreateNewChat,
    hasLastOpenedExperience,
    isExperienceVisible,
    hideLayer,
    persistActiveExperience,
    pushResumeDockFromLastOpened,
    restoreNavigationSnapshot,
    restoreCurrentSessionExperienceFromHistory,
    scrollToResumeDock,
    ensureSessions,
    ensureHistoryBaseState,
    renderChatListUI,
    ensureSessionMessagesLoaded,
    renderMessages,
    handleFlowEntry,
    restoreCurrentSessionExperience,
    onInitBaseRendered,
    onInitCompleted,
  } = deps;

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    if (window.matchMedia("(max-width: 768px)").matches) sidebar.classList.add("collapsed");
    else sidebar.classList.remove("collapsed");
  }
  sidebar?.classList.add("sidebar-ready");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (getIsSending()) return;
    const prompt = input.value.trim();
    if (!prompt) return;

    try {
      const guided = getGuided();
      if (guided && (guided.step === "await_source" || guided.step === "await_pdf_file")) {
        input.focus();
        return;
      }
      if (guided) {
        const handled = await onGuidedPrompt(prompt, guided);
        if (handled) return;
      }

      onSendPrompt(prompt);
    } catch (err) {
      console.error("[chat] form submit failed:", err);
      setSendingState(false);
    }
  });

  bindNewChatButton({
    newChatBtn,
    onCreateNewChat,
    onAfterCreateNewChat: () => {
      if (!sidebar || !window.matchMedia("(max-width: 768px)").matches) return;
      sidebar.classList.add("collapsed");
    },
  });

  backToChatBtn?.addEventListener("click", () => {
    if (canBackToChatFromHistoryState()) {
      history.back();
      return;
    }
    hideLayer();
    pushResumeDockFromLastOpened();
    scrollToResumeDock();
  });

  toggleSidebarBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
  });

  topHomeBtn?.addEventListener("click", () => {
    location.href = "main_hub.html";
  });

  window.addEventListener(
    "popstate",
    createPopStateHandler({
      restoreNavigationSnapshot,
    }),
  );

  ensureSessions();
  renderChatListUI();
  onInitBaseRendered?.();

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
      clearFlowParamFromUrl();
      return;
    }
    await restoreCurrentSessionExperience();
    onInitCompleted?.();
  })();
}

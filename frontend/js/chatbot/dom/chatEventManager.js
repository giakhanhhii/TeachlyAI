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
  const topAuthControls = document.getElementById("topAuthControls");
  const sidebarUserShell = document.getElementById("sidebarUserShell");
  const sidebarUserAvatar = document.getElementById("sidebarUserAvatar");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarUserSubtitle = document.getElementById("sidebarUserSubtitle");
  const sidebarSettingsBtn = document.getElementById("sidebarSettingsBtn");
  const sidebarSettingsMenu = document.getElementById("sidebarSettingsMenu");
  const recommendPanelToggle = document.getElementById("recommendPanelToggle");
  const clearUnpinnedChatsBtn = document.getElementById("clearUnpinnedChatsBtn");
  const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");

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

  const addFileBtn = document.getElementById("addFileBtn");

  const optionalEls = {
    backToChatBtn,
    toggleSidebarBtn,
    topHomeBtn,
    topAuthControls,
    sidebarUserShell,
    sidebarUserAvatar,
    sidebarUserName,
    sidebarUserSubtitle,
    sidebarSettingsBtn,
    sidebarSettingsMenu,
    recommendPanelToggle,
    clearUnpinnedChatsBtn,
    sidebarLogoutBtn,
    addFileBtn,
  };
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
    topAuthControls,
    sidebarUserShell,
    sidebarUserAvatar,
    sidebarUserName,
    sidebarUserSubtitle,
    sidebarSettingsBtn,
    sidebarSettingsMenu,
    recommendPanelToggle,
    clearUnpinnedChatsBtn,
    sidebarLogoutBtn,
    addFileBtn,
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
 *   onBeforeBack?: () => boolean,
 *   onAddFile?: (btn: HTMLButtonElement) => void,
 *   onAbortGuidedFlow?: (prompt: string, guided: any) => void,
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
    onBeforeBack,
    onAddFile,
    onAbortGuidedFlow,
  } = deps;

  const sidebar = document.getElementById("sidebar");
  let sidebarMissingWarned = false;
  /**
   * @param {"add"|"remove"|"toggle"} method
   * @param {string} className
   */
  function updateSidebarClass(method, className) {
    if (!(sidebar instanceof HTMLElement)) {
      if (!sidebarMissingWarned) {
        console.warn("[chat] sidebar element not found; skip sidebar class updates.");
        sidebarMissingWarned = true;
      }
      return false;
    }
    sidebar.classList[method](className);
    return true;
  }
  if (window.matchMedia("(max-width: 768px)").matches) updateSidebarClass("add", "collapsed");
  else updateSidebarClass("remove", "collapsed");
  updateSidebarClass("add", "sidebar-ready");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (getIsSending()) return;
    const prompt = input.value.trim();
    if (!prompt) return;

    try {
      const guided = getGuided();
      if (guided && (guided.step === "await_source" || guided.step === "await_pdf_file")) {
        onAbortGuidedFlow?.(prompt, guided);
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
      if (!window.matchMedia("(max-width: 768px)").matches) return;
      updateSidebarClass("add", "collapsed");
    },
  });

  backToChatBtn?.addEventListener("click", () => {
    if (onBeforeBack?.()) return;
    if (canBackToChatFromHistoryState()) {
      history.back();
      return;
    }
    hideLayer();
    pushResumeDockFromLastOpened();
    scrollToResumeDock();
  });

  toggleSidebarBtn?.addEventListener("click", () => {
    updateSidebarClass("toggle", "collapsed");
  });

  topHomeBtn?.addEventListener("click", () => {
    location.href = "main_hub.html";
  });

  const addFileBtn = document.getElementById("addFileBtn");
  if (addFileBtn instanceof HTMLButtonElement && onAddFile) {
    addFileBtn.addEventListener("click", () => {
      onAddFile(addFileBtn);
    });
  }

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
      // When auto mode is ON, handleFlowEntry (injected from chatController) intercepts
      // and shows the count selector instead of the normal guided flow.
      await handleFlowEntry(flowKind);
      clearFlowParamFromUrl();
      return;
    }
    await restoreCurrentSessionExperience();
    onInitCompleted?.();
  })();
}

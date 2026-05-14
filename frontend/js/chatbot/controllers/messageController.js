import { isContinueSourcePromptMessage } from "../guidedFlow/shared.js";
import { resumeDockGroupKey, resumeDockSignature } from "../utils/serialization.js";

/**
 * @param {{
 *   getCurrentSession: () => any,
 *   saveSessions: () => void,
 *   getMessageView: () => any,
 *   postChat: (apiUrl: string, prompt: string, threadId?: string) => Promise<any>,
 *   apiUrl: string,
 *   sendBtn: HTMLButtonElement,
 *   inputEl: HTMLInputElement | HTMLTextAreaElement,
 *   onConversationMutation?: (mode?: "push"|"replace") => void,
 *   rerenderMessages?: () => void,
 * }} deps
 */
export function createMessageController(deps) {
  const { getCurrentSession, saveSessions, getMessageView, postChat, apiUrl, sendBtn, inputEl, onConversationMutation, rerenderMessages } = deps;

  function shouldRerenderFromEmptyConversation(messages) {
    return !Array.isArray(messages) || messages.length === 0;
  }

  /**
   * @param {boolean} next
   */
  function setSendingState(next) {
    const isSending = Boolean(next);
    sendBtn.disabled = isSending;
    inputEl.disabled = isSending;
    if (isSending) {
      sendBtn.dataset.pendingText = sendBtn.textContent || "";
      sendBtn.textContent = "Sending...";
    } else if (sendBtn.dataset.pendingText) {
      sendBtn.textContent = sendBtn.dataset.pendingText;
      delete sendBtn.dataset.pendingText;
    }
  }

  /**
   * @param {string} text
   */
  function pushUser(text) {
    const current = getCurrentSession();
    const shouldRerender = shouldRerenderFromEmptyConversation(current.messages);
    if (!Array.isArray(current.messages)) current.messages = [];
    current.messages.push({ role: "user", text });
    saveSessions();
    if (shouldRerender) rerenderMessages?.();
    else getMessageView().addMessage("user", text);
    onConversationMutation?.("replace");
  }

  /**
   * @param {string} text
   * @param {any} opts
   */
  function pushBot(text, opts) {
    const current = getCurrentSession();
    const shouldRerenderFromEmpty = shouldRerenderFromEmptyConversation(current.messages);
    /** @type {{ label: string, value: string }[]} */
    let actions = [];
    /** @type {string | undefined} */
    let cardType;
    /** @type {any} */
    let resumeDock;
    /** @type {Record<string, any> | undefined} */
    let cardProps;
    /** @type {string | undefined} */
    let messageKey;
    if (Array.isArray(opts)) actions = opts;
    else if (opts && typeof opts === "object") {
      if (Array.isArray(opts.actions)) actions = opts.actions;
      if (typeof opts.cardType === "string") cardType = opts.cardType;
      if (opts.resumeDock) resumeDock = opts.resumeDock;
      if (opts.cardProps && typeof opts.cardProps === "object") cardProps = opts.cardProps;
      if (typeof opts.messageKey === "string") messageKey = opts.messageKey;
    }
    let removedDuplicateResume = false;
    const resumeGroupKey = resumeDockGroupKey(resumeDock);
    const resumeSignature = resumeDockSignature(resumeDock);
    if (resumeGroupKey) {
      const prevMessages = Array.isArray(current.messages) ? current.messages : [];
      const nextMessages = [];
      prevMessages.forEach((message) => {
        if (!message || typeof message !== "object" || message.role !== "bot" || !message.resumeDock) {
          nextMessages.push(message);
          return;
        }
        const messageSignature = resumeDockSignature(message.resumeDock);
        if (resumeSignature && messageSignature === resumeSignature) {
          removedDuplicateResume = true;
          return;
        }
        const messageGroupKey = resumeDockGroupKey(message.resumeDock);
        if (
          resumeGroupKey.includes("thptqg_fulltest")
          && messageGroupKey.includes("thptqg_fulltest")
          && isContinueSourcePromptMessage(message)
        ) {
          removedDuplicateResume = true;
          return;
        }
        if (messageGroupKey === resumeGroupKey) {
          removedDuplicateResume = true;
          return;
        }
        nextMessages.push(message);
      });
      current.messages = nextMessages;
    }
    const entry = { role: "bot", text };
    if (actions.length) entry.actions = actions;
    if (cardType) entry.cardType = cardType;
    if (resumeDock) entry.resumeDock = resumeDock;
    if (cardProps) entry.cardProps = cardProps;
    if (messageKey) entry.messageKey = messageKey;
    const prevStoredMessages = Array.isArray(current.messages) ? current.messages : [];
    current.messages = [...prevStoredMessages, entry];
    saveSessions();
    if (removedDuplicateResume || shouldRerenderFromEmpty) {
      rerenderMessages?.();
    } else {
      getMessageView().addMessage("bot", text, { actions, cardType, resumeDock, cardProps });
    }
    onConversationMutation?.("replace");
  }

  /**
   * @param {string} prompt
   * @param {{
   *   onSendingState: (next: boolean) => void,
   *   onThreadUpdated: (threadId: string) => void,
   *   onError: (message: string) => void,
   *   onDone: () => void,
   * }} hooks
   */
  async function sendPrompt(prompt, hooks) {
    hooks.onSendingState(true);
    try {
      const current = getCurrentSession();
      const msgView = getMessageView();
      const shouldRerender = shouldRerenderFromEmptyConversation(current.messages);
      if (!Array.isArray(current.messages)) current.messages = [];
      current.messages.push({ role: "user", text: prompt });
      current.messagesLoaded = true;
      current.remoteOffset = Math.max(0, Math.floor(Number(current.remoteOffset || 0))) + 1;
      saveSessions();
      if (shouldRerender) rerenderMessages?.();
      else msgView.addMessage("user", prompt);
      onConversationMutation?.("replace");
      inputEl.value = "";
      const thinking = msgView.addThinkingBubble();
      try {
        const data = await postChat(apiUrl, prompt, current.thread_id);
        current.thread_id = data.thread_id;
        hooks.onThreadUpdated(current.thread_id);
        thinking.row.remove();
        await msgView.streamBotReply(data.reply);
        current.messages.push({ role: "bot", text: data.reply });
        current.messagesLoaded = true;
        current.remoteOffset = Math.max(0, Math.floor(Number(current.remoteOffset || 0))) + 1;
        saveSessions();
        onConversationMutation?.("replace");
      } catch (err) {
        thinking.row.remove();
        hooks.onError(`Lỗi: ${err.message}`);
      }
    } finally {
      hooks.onSendingState(false);
      hooks.onDone();
    }
  }

  return { setSendingState, pushUser, pushBot, sendPrompt };
}

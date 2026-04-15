/**
 * @param {{
 *   getCurrentSession: () => any,
 *   saveSessions: () => void,
 *   getMessageView: () => any,
 *   sendBtn: HTMLButtonElement,
 *   inputEl: HTMLInputElement | HTMLTextAreaElement,
 * }} deps
 */
export function createMessageController(deps) {
  const { getCurrentSession, saveSessions, getMessageView, sendBtn, inputEl } = deps;

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
    getMessageView().addMessage("user", text);
    current.messages.push({ role: "user", text });
    saveSessions();
  }

  /**
   * @param {string} text
   * @param {any} opts
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
    getMessageView().addMessage("bot", text, { actions, cardType, resumeDock });
    const entry = { role: "bot", text };
    if (actions.length) entry.actions = actions;
    if (cardType) entry.cardType = cardType;
    if (resumeDock) entry.resumeDock = resumeDock;
    current.messages.push(entry);
    saveSessions();
  }

  return { setSendingState, pushUser, pushBot };
}

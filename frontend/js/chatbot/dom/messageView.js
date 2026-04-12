import { BOT_AVATAR_SVG } from "../assets.js";
import { createFlowCard } from "./flowCards.js";

/**
 * @param {{
 *   messagesEl: HTMLElement,
 *   messagesInnerEl: HTMLElement,
 *   onFlowAction: (value: string, btnEl: HTMLButtonElement) => void,
 *   onFlowCardSubmit?: (cardType: string, payload: Record<string, string>, cardRoot: HTMLElement) => void,
 * }} opts
 */
export function createMessageView(opts) {
  const { messagesEl, messagesInnerEl, onFlowAction, onFlowCardSubmit } = opts;

  /**
   * @param {HTMLElement} contentNode
   * @param {string} [extraRowClass]
   */
  function appendBotRow(contentNode, extraRowClass) {
    const row = document.createElement("div");
    row.className = `msg-row bot${extraRowClass ? ` ${extraRowClass}` : ""}`;
    const avatar = document.createElement("div");
    avatar.className = "bot-avatar";
    avatar.innerHTML = BOT_AVATAR_SVG;
    row.appendChild(avatar);
    row.appendChild(contentNode);
    messagesInnerEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return row;
  }

  /**
   * @param {"user"|"bot"} role
   * @param {string} text
   * @param {any} third legacy: actions array, or `{ actions?, cardType? }`
   */
  function addMessage(role, text, third) {
    /** @type {{ label: string, value: string }[]} */
    let actions = [];
    /** @type {string | null} */
    let cardType = null;
    if (Array.isArray(third)) actions = third;
    else if (third && typeof third === "object") {
      if (Array.isArray(third.actions)) actions = third.actions;
      if (typeof third.cardType === "string") cardType = third.cardType;
    }

    if (role === "user") {
      const row = document.createElement("div");
      row.className = "msg-row user";
      const bubble = document.createElement("div");
      bubble.className = "bubble user";
      bubble.textContent = text;
      row.appendChild(bubble);
      messagesInnerEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }

    const hasCard = !!(cardType && onFlowCardSubmit);
    const hasActions = actions.length > 0;
    const hasText = text.trim().length > 0;
    const headerParts = hasText || hasActions;

    if (hasCard && headerParts) {
      const bubble = document.createElement("div");
      bubble.className = "bubble bot";
      if (hasText) {
        const t = document.createElement("div");
        t.style.whiteSpace = "pre-wrap";
        t.textContent = text;
        bubble.appendChild(t);
      }
      if (hasActions) {
        const ar = document.createElement("div");
        ar.className = "msg-actions";
        actions.forEach((a) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "msg-action-btn";
          b.textContent = a.label;
          b.addEventListener("click", function () {
            onFlowAction(a.value, this);
          });
          ar.appendChild(b);
        });
        bubble.appendChild(ar);
      }
      appendBotRow(bubble);

      const shell = document.createElement("div");
      shell.className = "msg-flow-card-shell";
      const cardRoot = createFlowCard(cardType, {
        onSubmit: (payload) => onFlowCardSubmit(cardType, payload, cardRoot),
      });
      shell.appendChild(cardRoot);
      appendBotRow(shell, "msg-row-flow-card");

      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }

    if (hasCard && !headerParts) {
      const shell = document.createElement("div");
      shell.className = "msg-flow-card-shell";
      const cardRoot = createFlowCard(cardType, {
        onSubmit: (payload) => onFlowCardSubmit(cardType, payload, cardRoot),
      });
      shell.appendChild(cardRoot);
      appendBotRow(shell);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return shell;
    }

    const row = document.createElement("div");
    row.className = "msg-row bot";
    const avatar = document.createElement("div");
    avatar.className = "bot-avatar";
    avatar.innerHTML = BOT_AVATAR_SVG;
    const bubble = document.createElement("div");
    bubble.className = "bubble bot";

    if (hasActions || cardType) {
      const t = document.createElement("div");
      t.style.whiteSpace = "pre-wrap";
      t.textContent = text;
      bubble.appendChild(t);
      if (hasActions) {
        const ar = document.createElement("div");
        ar.className = "msg-actions";
        actions.forEach((a) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "msg-action-btn";
          b.textContent = a.label;
          b.addEventListener("click", function () {
            onFlowAction(a.value, this);
          });
          ar.appendChild(b);
        });
        bubble.appendChild(ar);
      }
      if (cardType && onFlowCardSubmit) {
        bubble.classList.add("bubble-has-flow-card");
        const cardRoot = createFlowCard(cardType, {
          onSubmit: (payload) => onFlowCardSubmit(cardType, payload, cardRoot),
        });
        bubble.appendChild(cardRoot);
      }
    } else {
      bubble.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesInnerEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function disableActionButtons(btnEl) {
    const row = btnEl.closest(".msg-row");
    if (!row) return;
    row.querySelectorAll(".msg-action-btn").forEach((b) => {
      b.disabled = true;
      b.style.opacity = "0.65";
      b.style.cursor = "default";
    });
  }

  function addThinkingBubble() {
    const row = document.createElement("div");
    row.className = "msg-row bot";
    const avatar = document.createElement("div");
    avatar.className = "bot-avatar";
    avatar.innerHTML = BOT_AVATAR_SVG;
    const bubble = document.createElement("div");
    bubble.className = "bubble bot thinking-bubble";
    bubble.innerHTML = `
          <div class="thinking" aria-label="Teachly đang suy nghĩ">
            <span></span><span></span><span></span>
          </div>
        `;
    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesInnerEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return { row, bubble };
  }

  async function streamBotReply(text) {
    const bubble = addMessage("bot", "");
    let i = 0;
    const speed = 8;
    while (i <= text.length) {
      bubble.textContent = text.slice(0, i);
      i += Math.max(1, Math.floor(text.length / 120));
      messagesEl.scrollTop = messagesEl.scrollHeight;
      await new Promise((r) => setTimeout(r, speed));
    }
    bubble.textContent = text;
  }

  function clear() {
    messagesInnerEl.innerHTML = "";
  }

  return { addMessage, disableActionButtons, addThinkingBubble, streamBotReply, clear };
}

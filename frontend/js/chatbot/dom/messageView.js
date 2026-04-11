import { BOT_AVATAR_SVG } from "../assets.js";

/**
 * @param {{ messagesEl: HTMLElement, messagesInnerEl: HTMLElement, onFlowAction: (value: string, btnEl: HTMLButtonElement) => void }} opts
 */
export function createMessageView(opts) {
  const { messagesEl, messagesInnerEl, onFlowAction } = opts;

  function addMessage(role, text, actions) {
    const row = document.createElement("div");
    row.className = `msg-row ${role === "user" ? "user" : "bot"}`;
    const bubble = document.createElement("div");
    bubble.className = `bubble ${role === "user" ? "user" : "bot"}`;
    if (role === "user") {
      bubble.textContent = text;
    } else if (actions && actions.length) {
      const t = document.createElement("div");
      t.style.whiteSpace = "pre-wrap";
      t.textContent = text;
      bubble.appendChild(t);
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
    } else {
      bubble.textContent = text;
    }
    if (role !== "user") {
      const avatar = document.createElement("div");
      avatar.className = "bot-avatar";
      avatar.innerHTML = BOT_AVATAR_SVG;
      row.appendChild(avatar);
    }
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

/**
 * @param {HTMLElement} chatListEl
 * @param {Array<{ title: string }>} sessions
 * @param {number} activeIndex
 * @param {(idx: number) => void} onSelect
 */
export function renderChatList(chatListEl, sessions, activeIndex, onSelect) {
  chatListEl.innerHTML = "";
  sessions.forEach((session, idx) => {
    const btn = document.createElement("button");
    btn.className = `chat-item ${idx === activeIndex ? "active" : ""}`;
    btn.textContent = session.title;
    btn.onclick = () => onSelect(idx);
    chatListEl.appendChild(btn);
  });
}

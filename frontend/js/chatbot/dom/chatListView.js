/**
 * @param {HTMLElement} chatListEl
 * @param {Array<{ title: string, pinned?: boolean }>} sessions
 * @param {number} activeIndex
 * @param {(idx: number) => void} onSelect
 * @param {(action: string, idx: number) => void} onAction
 */
export function renderChatList(chatListEl, sessions, activeIndex, onSelect, onAction) {
  chatListEl.innerHTML = "";
  document.querySelectorAll(".chat-item-menu-floating").forEach((el) => el.remove());

  const ordered = sessions
    .map((session, originalIdx) => ({ session, originalIdx }))
    .sort((a, b) => Number(Boolean(b.session.pinned)) - Number(Boolean(a.session.pinned)));

  ordered.forEach(({ session, originalIdx }) => {
    const row = document.createElement("div");
    row.className = `chat-item-row ${originalIdx === activeIndex ? "active" : ""}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-item";
    const inner = document.createElement("span");
    inner.className = "chat-item-inner";
    if (session.pinned) {
      const pin = document.createElement("span");
      pin.className = "chat-item-pin";
      pin.setAttribute("aria-hidden", "true");
      pin.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>
        </svg>
      `;
      inner.appendChild(pin);
    }
    const titleEl = document.createElement("span");
    titleEl.className = "chat-item-title-text";
    titleEl.textContent = session.title;
    inner.appendChild(titleEl);
    btn.appendChild(inner);
    btn.onclick = () => onSelect(originalIdx);

    const menuWrap = document.createElement("div");
    menuWrap.className = "chat-item-menu-wrap";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "chat-item-menu-trigger";
    trigger.setAttribute("aria-label", `Tùy chọn cho ${session.title}`);
    trigger.innerHTML = `
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="3" r="1.4"></circle>
        <circle cx="8" cy="8" r="1.4"></circle>
        <circle cx="8" cy="13" r="1.4"></circle>
      </svg>
    `;

    const menu = document.createElement("div");
    menu.className = "chat-item-menu chat-item-menu-floating";
    menu.hidden = true;
    menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    const items = [
      { action: "share", label: "Chia sẻ cuộc trò chuyện" },
      { action: "pin", label: session.pinned ? "Bỏ ghim" : "Ghim" },
      { action: "rename", label: "Đổi tên" },
      { action: "delete", label: "Xóa" },
    ];

    items.forEach((item) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "chat-item-menu-option";
      option.textContent = item.label;
      option.onclick = () => {
        menu.hidden = true;
        onAction(item.action, originalIdx);
      };
      menu.appendChild(option);
    });

    trigger.onclick = (event) => {
      event.stopPropagation();
      const isOpen = !menu.hidden;
      document.querySelectorAll(".chat-item-menu-floating").forEach((el) => {
        el.hidden = true;
      });
      if (!isOpen) {
        // Show to the right of trigger, but clamp into viewport to avoid clipping.
        const rect = trigger.getBoundingClientRect();
        menu.hidden = false;
        menu.style.visibility = "hidden";
        const menuWidth = menu.offsetWidth || 220;
        const menuHeight = menu.offsetHeight || 180;
        const desiredLeft = rect.right + 8;
        const desiredTop = rect.top - 6;
        const maxLeft = Math.max(8, window.innerWidth - menuWidth - 8);
        const maxTop = Math.max(8, window.innerHeight - menuHeight - 8);
        menu.style.left = `${Math.min(desiredLeft, maxLeft)}px`;
        menu.style.top = `${Math.min(Math.max(desiredTop, 8), maxTop)}px`;
        menu.style.visibility = "";
      }
      if (isOpen) menu.hidden = true;
    };

    menuWrap.appendChild(trigger);
    row.appendChild(btn);
    row.appendChild(menuWrap);
    chatListEl.appendChild(row);
    document.body.appendChild(menu);
  });

  const closeMenus = () => {
    document.querySelectorAll(".chat-item-menu-floating").forEach((el) => {
      el.hidden = true;
    });
  };
  document.addEventListener("click", closeMenus, { once: true });
}

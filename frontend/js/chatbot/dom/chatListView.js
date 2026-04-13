/**
 * @param {HTMLElement} chatListEl
 * @param {Array<{ title: string, pinned?: boolean }>} sessions
 * @param {number} activeIndex
 * @param {(idx: number) => void} onSelect
 * @param {(action: string, idx: number) => void} onAction
 */
export function renderChatList(chatListEl, sessions, activeIndex, onSelect, onAction) {
  chatListEl.innerHTML = "";

  const ordered = sessions
    .map((session, originalIdx) => ({ session, originalIdx }))
    .sort((a, b) => Number(Boolean(b.session.pinned)) - Number(Boolean(a.session.pinned)));

  ordered.forEach(({ session, originalIdx }) => {
    const row = document.createElement("div");
    row.className = `chat-item-row ${originalIdx === activeIndex ? "active" : ""}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chat-item";
    btn.textContent = session.title;
    btn.onclick = () => onSelect(originalIdx);

    const menuWrap = document.createElement("div");
    menuWrap.className = "chat-item-menu-wrap";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "chat-item-menu-trigger";
    trigger.setAttribute("aria-label", `Tùy chọn cho ${session.title}`);
    trigger.innerHTML = "&#8942;";

    const menu = document.createElement("div");
    menu.className = "chat-item-menu";
    menu.hidden = true;

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
      chatListEl.querySelectorAll(".chat-item-menu").forEach((el) => {
        el.hidden = true;
      });
      if (!isOpen) {
        const rect = trigger.getBoundingClientRect();
        const desiredLeft = rect.right + 8;
        const desiredTop = rect.top - 6;
        const maxLeft = Math.max(8, window.innerWidth - 230);
        const maxTop = Math.max(8, window.innerHeight - 180);
        menu.style.left = `${Math.min(desiredLeft, maxLeft)}px`;
        menu.style.top = `${Math.min(Math.max(desiredTop, 8), maxTop)}px`;
      }
      menu.hidden = isOpen;
    };

    menuWrap.appendChild(trigger);
    menuWrap.appendChild(menu);
    row.appendChild(btn);
    row.appendChild(menuWrap);
    chatListEl.appendChild(row);
  });

  const closeMenus = () => {
    chatListEl.querySelectorAll(".chat-item-menu").forEach((el) => {
      el.hidden = true;
    });
  };
  document.addEventListener("click", closeMenus, { once: true });
}

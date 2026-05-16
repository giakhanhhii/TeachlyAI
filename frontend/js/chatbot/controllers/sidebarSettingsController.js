/**
 * @param {HTMLButtonElement} buttonEl
 * @param {HTMLElement} menuEl
 */
function toggleMenu(buttonEl, menuEl, expanded) {
  const nextExpanded = Boolean(expanded);
  buttonEl.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
  menuEl.hidden = !nextExpanded;
}

/**
 * @param {{
 *   shellEl: HTMLElement,
 *   settingsBtn: HTMLButtonElement,
 *   settingsMenu: HTMLElement,
 *   recommendToggle: HTMLInputElement,
 *   clearChatsBtn: HTMLButtonElement,
 *   getRecommendPanelVisible: () => boolean,
 *   onRecommendPanelVisibleChange: (next: boolean) => void,
 *   getUnpinnedSessionCount: () => number,
 *   onDeleteUnpinnedChats: () => Promise<{ deletedCount?: number } | void> | { deletedCount?: number } | void,
 * }} deps
 */
export function bindSidebarSettingsMenu(deps) {
  const {
    shellEl,
    settingsBtn,
    settingsMenu,
    recommendToggle,
    clearChatsBtn,
    getRecommendPanelVisible,
    onRecommendPanelVisibleChange,
    getUnpinnedSessionCount,
    onDeleteUnpinnedChats,
  } = deps;

  function refreshMenuState() {
    recommendToggle.checked = Boolean(getRecommendPanelVisible());
    const unpinnedCount = Math.max(0, Number(getUnpinnedSessionCount()) || 0);
    clearChatsBtn.disabled = unpinnedCount === 0;
    clearChatsBtn.textContent = unpinnedCount > 0
      ? "Xóa tất cả đoạn chat"
      : "Không có đoạn chat";
  }

  function closeMenu() {
    toggleMenu(settingsBtn, settingsMenu, false);
  }

  function openMenu() {
    refreshMenuState();
    toggleMenu(settingsBtn, settingsMenu, true);
  }

  settingsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = settingsBtn.getAttribute("aria-expanded") === "true";
    if (expanded) {
      closeMenu();
      return;
    }
    openMenu();
  });

  settingsMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  recommendToggle.addEventListener("change", () => {
    onRecommendPanelVisibleChange(recommendToggle.checked);
  });

  clearChatsBtn.addEventListener("click", async () => {
    if (clearChatsBtn.disabled) return;
    const ok = window.confirm(
      "Bạn có chắc không, hành động này sẽ xóa toàn bộ đoạn chat chưa ghim.",
    );
    if (!ok) return;
    clearChatsBtn.disabled = true;
    try {
      await Promise.resolve(onDeleteUnpinnedChats());
      refreshMenuState();
      closeMenu();
    } finally {
      refreshMenuState();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!shellEl.contains(target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  refreshMenuState();
  closeMenu();

  return {
    refreshMenuState,
    closeMenu,
  };
}

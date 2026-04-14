# Data Fix Instructions for Cursor

This file provides the optimized versions of `sessionStore.js` and `chatListView.js` to resolve data loss and memory leak issues.

## 1. Fix Data Loss in `frontend/js/chatbot/sessionStore.js`

Replace the top constants and `buildPersistSnapshot` / `saveSessions` functions with the following logic. This ensures that truncation only happens as a last resort when `localStorage` is full, rather than aggressively on every save.

```javascript
// --- Constants (frontend/js/chatbot/sessionStore.js) ---
const MAX_PERSISTED_MESSAGES_ACTIVE = 1000;
const MAX_PERSISTED_MESSAGES_INACTIVE = 500;
const SAVE_SESSIONS_TIMEOUT_MS = 180;

// --- Functions (frontend/js/chatbot/sessionStore.js) ---

/**
 * Creates a snapshot of sessions for persistence.
 * If caps are provided, history is truncated to that limit.
 * If caps are null, the full history is preserved.
 */
function buildPersistSnapshot(activeCap, inactiveCap) {
  return sessions.map((session, idx) => {
    const srcMessages = Array.isArray(session?.messages) ? session.messages : [];
    // If cap is null, we keep all messages
    const cap = idx === activeSession ? activeCap : inactiveCap;
    
    if (cap === null || cap === undefined) {
      return { ...session, messages: srcMessages };
    }
    
    const messages = srcMessages.length > cap ? srcMessages.slice(-cap) : srcMessages;
    return { ...session, messages };
  });
}

export function saveSessions() {
  if (saveQueued) return;
  saveQueued = true;
  const schedule = typeof globalThis.requestIdleCallback === "function"
    ? (cb) => globalThis.requestIdleCallback(cb, { timeout: SAVE_SESSIONS_TIMEOUT_MS })
    : (cb) => setTimeout(cb, 0);
  
  schedule(() => {
    saveQueued = false;
    try {
      // First attempt: Save everything without truncation
      const fullSnapshot = buildPersistSnapshot(null, null);
      localStorage.setItem(LS_SESSIONS, JSON.stringify(fullSnapshot));
      localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
    } catch (e) {
      console.warn("Storage quota exceeded, attempting to save truncated history.", e);
      try {
        // Second attempt: Truncate to reasonable limits
        const compactSessions = buildPersistSnapshot(MAX_PERSISTED_MESSAGES_ACTIVE, MAX_PERSISTED_MESSAGES_INACTIVE);
        localStorage.setItem(LS_SESSIONS, JSON.stringify(compactSessions));
        localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
      } catch (e2) {
        // Final attempt: Keep only the most recent messages
        try {
          const emergencySessions = buildPersistSnapshot(60, 0);
          localStorage.setItem(LS_SESSIONS, JSON.stringify(emergencySessions));
          localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
        } catch (e3) {
          // Absolute last resort: Metadata only
          const metaOnly = sessions.map((s) => ({ ...s, messages: [] }));
          localStorage.setItem(LS_SESSIONS, JSON.stringify(metaOnly));
          localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
        }
      }
    }
  });
}
```

## 2. Fix Memory Leak in `frontend/js/chatbot/dom/chatListView.js`

Restructure `renderChatList` to reuse a single instance of the floating menu and avoid adding redundant event listeners to the `document`.

```javascript
// --- Module Level State (frontend/js/chatbot/dom/chatListView.js) ---
let sharedMenu = null;
let menuTargetIdx = null;

/**
 * Singleton helper to get or create the shared menu element.
 * Also sets up a one-time global click listener to close the menu.
 */
function getSharedMenu() {
  if (sharedMenu) return sharedMenu;

  sharedMenu = document.createElement("div");
  sharedMenu.id = "chatItemSharedMenu";
  sharedMenu.className = "chat-item-menu chat-item-menu-floating";
  sharedMenu.hidden = true;
  sharedMenu.addEventListener("click", (event) => event.stopPropagation());
  document.body.appendChild(sharedMenu);

  document.addEventListener("click", () => {
    sharedMenu.hidden = true;
    menuTargetIdx = null;
  });

  return sharedMenu;
}

// --- Updated Function ---
export function renderChatList(chatListEl, sessions, activeIndex, onSelect, onAction) {
  chatListEl.innerHTML = "";
  
  // Reuse the menu instead of creating/removing it every time
  const menu = getSharedMenu();
  const closeMenu = () => {
    menu.hidden = true;
    menuTargetIdx = null;
  };

  const ordered = sessions
    .map((session, originalIdx) => ({ session, originalIdx }))
    .sort((a, b) => Number(Boolean(b.session.pinned)) - Number(Boolean(a.session.pinned)));

  if (activeIndex >= visibleCount) {
    visibleCount = Math.ceil((activeIndex + 1) / LOAD_MORE_STEP) * LOAD_MORE_STEP;
  }
  if (ordered.length <= INITIAL_VISIBLE_SESSIONS) {
    visibleCount = INITIAL_VISIBLE_SESSIONS;
  }

  const visibleOrdered = ordered.slice(0, visibleCount);
  visibleOrdered.forEach(({ session, originalIdx }) => {
    // ... (logic for creating row, btn, inner, titleEl remains similar) ...
    // ...
    
    // When setting trigger.onclick:
    trigger.onclick = (event) => {
      event.stopPropagation();
      const isOpen = !menu.hidden && menuTargetIdx === originalIdx;
      closeMenu();
      if (!isOpen) {
        menuTargetIdx = originalIdx;
        menu.innerHTML = ""; // Clear for fresh items
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
            closeMenu();
            onAction(item.action, originalIdx);
          };
          menu.appendChild(option);
        });

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
    };
    
    // ... (rest of the row appending) ...
  });

  // --- IMPORTANT: Remove the old document click handler cleanup logic ---
  // Delete the section that manipulated chatListEl.__closeMenuHandler 
  // as it is now handled by the singleton getSharedMenu listener.
}
```

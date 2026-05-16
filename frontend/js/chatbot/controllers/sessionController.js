/**
 * @param {{
 *   chatListEl: HTMLElement,
 *   renderChatList: (
 *     el: HTMLElement,
 *     sessions: any[],
 *     activeIndex: number,
 *     onPick: (idx: number) => void,
 *     onAction: (action: string, idx: number) => void,
 *   ) => void,
 *   getSessionsSnapshot: () => any[],
 *   getActiveSessionIndex: () => number,
 *   togglePinSession: (idx: number) => boolean,
 *   renameSession: (idx: number, title: string) => boolean,
 *   deleteSession: (idx: number) => boolean,
 *   saveSessions: () => void,
 *   onShareSession?: (idx: number) => void | Promise<void>,
 *   onSessionSelected: (idx: number) => void | Promise<void>,
 *   onSessionDeleted: () => void | Promise<void>,
 * }} deps
 */
let rerenderQueued = false;
/** @type {WeakMap<HTMLElement, any>} */
const rerenderDepsByElement = new WeakMap();
/** @type {WeakRef<HTMLElement> | null} */
let scheduledRerenderTargetRef = null;

function scheduleRerender() {
  const targetEl = scheduledRerenderTargetRef?.deref?.();
  if (rerenderQueued || !targetEl) return;
  rerenderQueued = true;
  const run = () => {
    rerenderQueued = false;
    const currentTargetEl = scheduledRerenderTargetRef?.deref?.();
    if (!currentTargetEl) return;
    const nextDeps = rerenderDepsByElement.get(currentTargetEl);
    if (!nextDeps) return;
    renderSessionListUI(nextDeps);
  };
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(run);
    return;
  }
  window.setTimeout(run, 0);
}

export function renderSessionListUI(deps) {
  const {
    chatListEl,
    renderChatList,
    getSessionsSnapshot,
    getActiveSessionIndex,
    togglePinSession,
    renameSession,
    deleteSession,
    saveSessions,
    onShareSession,
    onSessionSelected,
    onSessionDeleted,
  } = deps;

  let actionInFlight = false;
  rerenderDepsByElement.set(chatListEl, deps);
  scheduledRerenderTargetRef = typeof WeakRef === "function" ? new WeakRef(chatListEl) : null;

  renderChatList(
    chatListEl,
    getSessionsSnapshot(),
    getActiveSessionIndex(),
    (idx) => {
      if (actionInFlight) return;
      actionInFlight = true;
      void Promise.resolve(onSessionSelected(idx)).finally(() => {
        actionInFlight = false;
      });
    },
    (action, idx) => {
      if (actionInFlight) return;
      if (action === "pin") {
        actionInFlight = true;
        if (togglePinSession(idx)) {
          saveSessions();
          scheduleRerender();
        }
        actionInFlight = false;
        return;
      }
      if (action === "rename") {
        actionInFlight = true;
        const currentSession = getSessionsSnapshot()[idx];
        const raw = window.prompt("Nhập tên mới cho đoạn chat", currentSession?.title || "");
        const nextTitle = typeof raw === "string" ? raw.trim() : "";
        if (nextTitle && renameSession(idx, nextTitle)) {
          saveSessions();
          scheduleRerender();
        }
        actionInFlight = false;
        return;
      }
      if (action === "delete") {
        actionInFlight = true;
        void (async () => {
          try {
            const ok = window.confirm("Bạn có chắc muốn xóa đoạn chat này?");
            if (!ok) return;
            if (!deleteSession(idx)) return;
            await Promise.resolve(onSessionDeleted());
            saveSessions();
            scheduleRerender();
          } catch (err) {
            console.error("Delete session action failed:", err);
          } finally {
            actionInFlight = false;
          }
        })();
        return;
      }
      if (action === "share") {
        actionInFlight = true;
        void Promise.resolve(onShareSession?.(idx))
          .catch((err) => {
            console.error("Share session action failed:", err);
            window.alert("Không thể chia sẻ đoạn chat này. Vui lòng thử lại.");
          })
          .finally(() => {
            actionInFlight = false;
          });
      }
    },
  );
}

/**
 * @param {{
 *   newChatBtn: HTMLButtonElement,
 *   onCreateNewChat: () => void | Promise<void>,
 *   onAfterCreateNewChat?: () => void,
 * }} deps
 */
export function bindNewChatButton(deps) {
  const { newChatBtn, onCreateNewChat, onAfterCreateNewChat } = deps;
  let creating = false;
  newChatBtn.addEventListener("click", () => {
    if (creating) return;
    creating = true;
    newChatBtn.disabled = true;
    void Promise.resolve(onCreateNewChat())
      .then(() => {
        onAfterCreateNewChat?.();
      })
      .finally(() => {
        creating = false;
        newChatBtn.disabled = false;
      });
  });
}

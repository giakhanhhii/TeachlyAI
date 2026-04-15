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
 *   onSessionSelected: (idx: number) => void | Promise<void>,
 *   onSessionDeleted: () => void | Promise<void>,
 * }} deps
 */
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
    onSessionSelected,
    onSessionDeleted,
  } = deps;

  renderChatList(
    chatListEl,
    getSessionsSnapshot(),
    getActiveSessionIndex(),
    (idx) => {
      void onSessionSelected(idx);
    },
    (action, idx) => {
      if (action === "pin") {
        if (togglePinSession(idx)) {
          saveSessions();
          renderSessionListUI(deps);
        }
        return;
      }
      if (action === "rename") {
        const currentSession = getSessionsSnapshot()[idx];
        const raw = window.prompt("Nhập tên mới cho đoạn chat", currentSession?.title || "");
        const nextTitle = typeof raw === "string" ? raw.trim() : "";
        if (nextTitle && renameSession(idx, nextTitle)) {
          saveSessions();
          renderSessionListUI(deps);
        }
        return;
      }
      if (action === "delete") {
        const ok = window.confirm("Bạn có chắc muốn xóa đoạn chat này?");
        if (!ok) return;
        if (deleteSession(idx)) {
          void onSessionDeleted();
          saveSessions();
          renderSessionListUI(deps);
        }
        return;
      }
      if (action === "share") {
        const s = getSessionsSnapshot()[idx];
        const transcript = (s?.messages || [])
          .map((m) => `${m.role === "user" ? "Bạn" : "Teachly"}: ${m.text || ""}`)
          .join("\n");
        const payload = `${s?.title || "Đoạn chat"}\n\n${transcript}`;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(payload).then(
            () => window.alert("Đã sao chép nội dung cuộc trò chuyện."),
            () => window.alert("Không thể sao chép tự động. Vui lòng thử lại."),
          );
        } else {
          window.alert("Trình duyệt không hỗ trợ clipboard.");
        }
      }
    },
  );
}

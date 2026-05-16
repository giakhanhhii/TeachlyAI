import { renderChatList } from "../dom/chatListView.js";
import { renderSessionListUI } from "./sessionController.js";

/**
 * @param {{
 *   chatListEl: HTMLElement,
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
export function createChatSessionListRenderer(deps) {
  return function renderChatListUI() {
    renderSessionListUI({
      chatListEl: deps.chatListEl,
      renderChatList,
      getSessionsSnapshot: deps.getSessionsSnapshot,
      getActiveSessionIndex: deps.getActiveSessionIndex,
      togglePinSession: deps.togglePinSession,
      renameSession: deps.renameSession,
      deleteSession: deps.deleteSession,
      saveSessions: deps.saveSessions,
      onShareSession: deps.onShareSession,
      onSessionSelected: deps.onSessionSelected,
      onSessionDeleted: deps.onSessionDeleted,
    });
  };
}

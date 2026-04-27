export const HISTORY_CHAT_PHASE = "chat";
export const HISTORY_EXPERIENCE_PHASE = "experience";
export const HISTORY_APP_NAV_KEY = "__appNav";
export const HISTORY_CAN_BACK_TO_CHAT_KEY = "__canBackToChat";

export function canBackToChatFromHistoryState() {
  const state = history.state && typeof history.state === "object" ? history.state : {};
  return state.phase === HISTORY_EXPERIENCE_PHASE && state[HISTORY_CAN_BACK_TO_CHAT_KEY] === true;
}

export function ensureHistoryBaseState() {
  // Base state is managed by the caller via replaceState.
}

/**
 * @param {{ mode?: "push" | "replace", canBackToChat?: boolean }} [opts]
 */
export function ensureExperienceHistoryEntry(opts = {}) {
  void opts;
}

export function inExperienceHistoryState() {
  const state = history.state && typeof history.state === "object" ? history.state : {};
  return state.phase === HISTORY_EXPERIENCE_PHASE;
}

/**
 * @param {{
 *   hasLastOpenedExperience: () => boolean,
 *   isExperienceVisible?: () => boolean,
 *   hideLayer: () => void,
 *   persistActiveExperience: () => void,
 *   pushResumeDockFromLastOpened: () => void,
 *   restoreNavigationSnapshot?: (snapshot: any, state: any) => boolean,
 *   onEnteredExperience?: (state: any) => void | Promise<void>,
 *   onReturnedToChat?: () => void,
 * }} deps
 */
export function createPopStateHandler(deps) {
  const { restoreNavigationSnapshot } = deps;
  return function onPopState(event) {
    const state = event?.state && typeof event.state === "object" ? event.state : {};
    const snapshot = state[HISTORY_APP_NAV_KEY];
    if (!snapshot || typeof snapshot !== "object") return;
    void restoreNavigationSnapshot?.(snapshot, state);
  };
}

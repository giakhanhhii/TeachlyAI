export const HISTORY_CHAT_PHASE = "chat";
export const HISTORY_EXPERIENCE_PHASE = "experience";
export const HISTORY_APP_NAV_KEY = "__appNav";
export const HISTORY_CAN_BACK_TO_CHAT_KEY = "__canBackToChat";

export function ensureHistoryBaseState() {
  const state = history.state && typeof history.state === "object" ? history.state : {};
  if (state.phase === HISTORY_CHAT_PHASE || state.phase === HISTORY_EXPERIENCE_PHASE) return;
  history.replaceState({ ...state, phase: HISTORY_CHAT_PHASE }, "", location.href);
}

/**
 * @param {{ mode?: "push" | "replace", canBackToChat?: boolean }} [opts]
 */
export function ensureExperienceHistoryEntry(opts = {}) {
  ensureHistoryBaseState();
  const { mode = "push", canBackToChat = true } = opts;
  const state = history.state && typeof history.state === "object" ? history.state : {};
  const next = {
    ...state,
    phase: HISTORY_EXPERIENCE_PHASE,
    [HISTORY_CAN_BACK_TO_CHAT_KEY]: Boolean(canBackToChat),
  };
  if (mode === "push") history.pushState(next, "", location.href);
  else history.replaceState(next, "", location.href);
}

export function inExperienceHistoryState() {
  const state = history.state && typeof history.state === "object" ? history.state : {};
  return state.phase === HISTORY_EXPERIENCE_PHASE;
}

/**
 * @param {{
 *   hasLastOpenedExperience: () => boolean,
 *   hideLayer: () => void,
 *   persistActiveExperience: () => void,
 *   pushResumeDockFromLastOpened: () => void,
 *   restoreNavigationSnapshot?: (snapshot: any, state: any) => boolean,
 *   onReturnedToChat?: () => void,
 * }} deps
 */
export function createPopStateHandler(deps) {
  const {
    hasLastOpenedExperience,
    hideLayer,
    persistActiveExperience,
    pushResumeDockFromLastOpened,
    restoreNavigationSnapshot,
    onReturnedToChat,
  } = deps;
  return function onPopState() {
    const state = history.state && typeof history.state === "object" ? history.state : {};
    if (state.phase === HISTORY_EXPERIENCE_PHASE) return;
    if (state[HISTORY_APP_NAV_KEY] && restoreNavigationSnapshot?.(state[HISTORY_APP_NAV_KEY], state)) {
      hideLayer();
      persistActiveExperience();
      onReturnedToChat?.();
      return;
    }
    if (!hasLastOpenedExperience()) {
      hideLayer();
      persistActiveExperience();
      onReturnedToChat?.();
      return;
    }
    hideLayer();
    pushResumeDockFromLastOpened();
    onReturnedToChat?.();
  };
}

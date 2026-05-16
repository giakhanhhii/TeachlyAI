const EXPERIENCE_HISTORY_LIMIT = 24;

/**
 * @param {{
 *  getCurrentExperienceState: () => any,
 *  setCurrentExperienceState: (next: any) => void,
 *  saveSessions: () => void,
 * }} deps
 */
export function createExperienceHistoryService(deps) {
  const { getCurrentExperienceState, setCurrentExperienceState, saveSessions } = deps;

  /**
   * @param {any} currentState
   * @param {{ experienceId: string, kind: "quiz"|"slide"|"flash"|"fullset"|"thptqg_fulltest", meta: Record<string, any>, progress: any, completed: boolean }} params
   */
  function upsertHistoryByExperienceId(currentState, params) {
    const { experienceId, kind, meta, progress, completed } = params;
    const existingHistory =
      currentState && typeof currentState === "object" && currentState.historyById && typeof currentState.historyById === "object"
        ? currentState.historyById
        : {};
    if (!experienceId) return existingHistory;
    const nowIso = new Date().toISOString();
    /** @type {Record<string, any>} */
    const nextHistory = {
      ...existingHistory,
      [experienceId]: {
        experienceId,
        kind,
        meta: { ...meta },
        progress,
        completed: Boolean(completed),
        updatedAt: nowIso,
      },
    };
    const ids = Object.keys(nextHistory);
    if (ids.length <= EXPERIENCE_HISTORY_LIMIT) return nextHistory;
    const sortedLimitedEntries = Object.entries(nextHistory)
      .sort((a, b) => {
        const aTime = Date.parse(a[1]?.updatedAt || "");
        const bTime = Date.parse(b[1]?.updatedAt || "");
        const safeA = Number.isFinite(aTime) ? aTime : 0;
        const safeB = Number.isFinite(bTime) ? bTime : 0;
        return safeB - safeA;
      })
      .slice(0, EXPERIENCE_HISTORY_LIMIT);
    return Object.fromEntries(sortedLimitedEntries);
  }

  function readPersistedActiveExperience() {
    const state = getCurrentExperienceState();
    const resume = state?.resume;
    return resume && typeof resume === "object" ? resume : null;
  }

  /**
   * @param {any} lastOpenedExperience
   */
  function persistActiveExperience(lastOpenedExperience) {
    const currentState = getCurrentExperienceState() || {};
    if (!lastOpenedExperience) {
      if (currentState && typeof currentState === "object" && currentState.resume) {
        const next = { ...currentState };
        delete next.resume;
        setCurrentExperienceState(next);
        saveSessions();
      }
      return;
    }
    setCurrentExperienceState({
      ...currentState,
      resume: lastOpenedExperience,
    });
    saveSessions();
  }

  /**
   * @param {{ kind: "quiz"|"slide"|"flash"|"thptqg_fulltest", meta: Record<string, any>, experienceId: string, resume: any }} params
   */
  function seedSingleExperience(params) {
    const { kind, meta, experienceId, resume } = params;
    const currentState = getCurrentExperienceState() || {};
    setCurrentExperienceState({
      ...currentState,
      kind,
      meta: { ...meta },
      progress: null,
      completed: false,
      activeExperienceId: experienceId,
      resume,
      historyById: upsertHistoryByExperienceId(currentState, {
        experienceId,
        kind,
        meta,
        progress: null,
        completed: false,
      }),
    });
    saveSessions();
  }

  /**
   * @param {{
   *  kind: "quiz"|"slide"|"flash"|"thptqg_fulltest",
   *  meta: Record<string, any>,
   *  experienceId: string,
   *  progress: any,
   *  completed: boolean,
   *  resume: any,
   * }} params
   */
  function updateSingleExperienceProgress(params) {
    const { kind, meta, experienceId, progress, completed, resume } = params;
    const currentState = getCurrentExperienceState() || {};
    const historyById = upsertHistoryByExperienceId(currentState, {
      experienceId,
      kind,
      meta,
      progress,
      completed,
    });
    setCurrentExperienceState({
      ...currentState,
      kind,
      meta: { ...meta },
      progress,
      completed,
      activeExperienceId: experienceId,
      historyById,
      resume,
    });
    saveSessions();
  }

  /**
   * @param {{ bundleTitle: string, resume: any }} params
   */
  function seedFullsetHubState(params) {
    const { bundleTitle, resume } = params;
    const currentState = getCurrentExperienceState() || {};
    setCurrentExperienceState({
      ...currentState,
      kind: "fullset",
      meta: { mode: "hub", title: bundleTitle || "Full set" },
      progress: null,
      completed: false,
      resume,
    });
    saveSessions();
  }

  /**
   * @param {{
   *  meta: Record<string, any>,
   *  experienceId: string,
   *  progress: any,
   *  completed: boolean,
   *  resume: any,
   * }} params
   */
  function updateFullsetProgress(params) {
    const { meta, experienceId, progress, completed, resume } = params;
    const currentState = getCurrentExperienceState() || {};
    const historyById = upsertHistoryByExperienceId(currentState, {
      experienceId,
      kind: "fullset",
      meta,
      progress,
      completed,
    });
    setCurrentExperienceState({
      ...currentState,
      kind: "fullset",
      meta: { ...meta },
      progress,
      completed,
      activeExperienceId: experienceId,
      historyById,
      resume,
    });
    saveSessions();
  }

  /**
   * @param {string} experienceId
   */
  function discardExperience(experienceId) {
    const target = typeof experienceId === "string" ? experienceId.trim() : "";
    const currentState = getCurrentExperienceState();
    if (!target || !currentState || typeof currentState !== "object") return false;

    let changed = false;
    const nextState = { ...currentState };

    if (nextState.resume && typeof nextState.resume === "object" && String(nextState.resume.experienceId || "") === target) {
      delete nextState.resume;
      changed = true;
    }

    if (nextState.activeExperienceId === target) {
      delete nextState.kind;
      delete nextState.meta;
      delete nextState.progress;
      delete nextState.completed;
      delete nextState.activeExperienceId;
      changed = true;
    }

    if (nextState.historyById && typeof nextState.historyById === "object" && nextState.historyById[target]) {
      const nextHistory = { ...nextState.historyById };
      delete nextHistory[target];
      if (Object.keys(nextHistory).length) nextState.historyById = nextHistory;
      else delete nextState.historyById;
      changed = true;
    }

    if (!changed) return false;
    setCurrentExperienceState(Object.keys(nextState).length ? nextState : null);
    saveSessions();
    return true;
  }

  return {
    readPersistedActiveExperience,
    persistActiveExperience,
    seedSingleExperience,
    updateSingleExperienceProgress,
    seedFullsetHubState,
    updateFullsetProgress,
    discardExperience,
  };
}

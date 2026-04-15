/**
 * @param {string | null} flow
 * @returns {"fullset"|"quiz"|"slide"|"flashcard"|null}
 */
export function normalizeFlowParam(flow) {
  const raw = String(flow || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "image" || raw === "flash" || raw === "flashcard") return "flashcard";
  if (raw === "quiz" || raw === "slide" || raw === "fullset") return raw;
  return null;
}

/**
 * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
 */
function flowToExperienceKind(flowKind) {
  return flowKind === "flashcard" ? "flash" : flowKind;
}

/**
 * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
 */
function flowSessionBaseTitle(flowKind) {
  if (flowKind === "fullset") return "Tạo full set";
  if (flowKind === "quiz") return "Tạo quiz";
  if (flowKind === "slide") return "Tạo slide";
  return "Tạo flashcard";
}

/**
 * @param {any} session
 */
function canReuseEmptySession(session) {
  if (!session || typeof session !== "object") return false;
  if (session.thread_id) return false;
  const msgs = session.messages;
  if (!Array.isArray(msgs) || msgs.length > 0) return false;
  return true;
}

/**
 * @param {{
 *   getSessionsSnapshot: () => any[],
 * }} deps
 */
function createBuildNextFlowSessionTitle(deps) {
  const { getSessionsSnapshot } = deps;
  /**
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  return function buildNextFlowSessionTitle(flowKind) {
    const base = flowSessionBaseTitle(flowKind);
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`^${escaped}\\s+(\\d+)$`, "i");
    let max = 0;
    getSessionsSnapshot().forEach((s) => {
      const m = String(s?.title || "").match(rx);
      if (!m) return;
      const n = Number(m[1]);
      if (Number.isFinite(n)) max = Math.max(max, n);
    });
    return `${base} ${max + 1}`;
  };
}

/**
 * @param {{
 *   getSessionsSnapshot: () => any[],
 *   findLatestSessionIndexByExperienceKind: (kind: string) => number,
 *   persistActiveExperience: () => void,
 *   getCurrentSession: () => any,
 *   setCurrentExperienceState: (next: any) => void,
 *   createSession: (opts?: { title?: string, experienceState?: any }) => number,
 *   setActiveSessionIndex: (idx: number) => void,
 *   saveSessions: () => void,
 *   renderChatListUI: () => void,
 *   ensureSessionMessagesLoaded: (force?: boolean) => Promise<void>,
 *   renderMessages: () => void,
 *   restoreCurrentSessionExperience: () => Promise<void>,
 *   computeStartFlow: (flowKind: "fullset"|"quiz"|"slide"|"flashcard") => { guided: any, effects: any[] },
 *   applyEffects: (effects: any[]) => Promise<void>,
 *   setStartupUiState: (active: boolean) => void,
 *   clearMessages: () => void,
 *   renderLoadMoreControl: () => void,
 *   updateThreadLabel: () => void,
 *   setGuided: (next: any) => void,
 *   resetResumeState: () => void,
 *   hideLayer: () => void,
 * }} deps
 */
export function createFlowService(deps) {
  const {
    getSessionsSnapshot,
    findLatestSessionIndexByExperienceKind,
    persistActiveExperience,
    getCurrentSession,
    setCurrentExperienceState,
    createSession,
    setActiveSessionIndex,
    saveSessions,
    renderChatListUI,
    ensureSessionMessagesLoaded,
    renderMessages,
    restoreCurrentSessionExperience,
    computeStartFlow,
    applyEffects,
    setStartupUiState,
    clearMessages,
    renderLoadMoreControl,
    updateThreadLabel,
    setGuided,
    resetResumeState,
    hideLayer,
  } = deps;

  const buildNextFlowSessionTitle = createBuildNextFlowSessionTitle({ getSessionsSnapshot });

  /**
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function startWithGuidedEffects(flowKind) {
    const start = computeStartFlow(flowKind);
    setGuided(start.guided);
    await applyEffects(start.effects);
    saveSessions();
    renderLoadMoreControl();
    updateThreadLabel();
  }

  /**
   * Fresh-start flow inside the current chat (e.g. startup cards). No URL navigation.
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function startFlowInCurrentSession(flowKind) {
    const expKind = flowToExperienceKind(flowKind);
    persistActiveExperience();
    const current = getCurrentSession();
    current.title = buildNextFlowSessionTitle(flowKind);
    setCurrentExperienceState({
      kind: expKind,
      meta: { flow: flowKind },
      progress: null,
      completed: false,
    });
    setGuided(null);
    resetResumeState();
    hideLayer();
    setStartupUiState(false);
    saveSessions();
    renderChatListUI();
    clearMessages();
    await startWithGuidedEffects(flowKind);
  }

  /**
   * Entry from Main Hub (`?flow=`): resume latest session for that experience, or start new flow.
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function handleFlowEntry(flowKind) {
    const expKind = flowToExperienceKind(flowKind);
    const latestIdx = findLatestSessionIndexByExperienceKind(expKind);
    if (latestIdx >= 0) {
      persistActiveExperience();
      setActiveSessionIndex(latestIdx);
      setGuided(null);
      resetResumeState();
      hideLayer();
      saveSessions();
      renderChatListUI();
      try {
        await ensureSessionMessagesLoaded();
      } catch {
        // Keep local cache if remote loading fails.
      }
      renderMessages();
      await restoreCurrentSessionExperience();
      history.replaceState({}, "", "chatbot_ui.html");
      return;
    }

    persistActiveExperience();
    const cur = getCurrentSession();
    if (canReuseEmptySession(cur)) {
      cur.title = buildNextFlowSessionTitle(flowKind);
      setCurrentExperienceState({
        kind: expKind,
        meta: { flow: flowKind },
        progress: null,
        completed: false,
      });
    } else {
      createSession({
        title: buildNextFlowSessionTitle(flowKind),
        experienceState: {
          kind: expKind,
          meta: { flow: flowKind },
          progress: null,
          completed: false,
        },
      });
    }
    setGuided(null);
    resetResumeState();
    hideLayer();
    setStartupUiState(false);
    saveSessions();
    renderChatListUI();
    try {
      await ensureSessionMessagesLoaded();
    } catch {
      // Keep local cache if remote loading fails.
    }
    clearMessages();
    await startWithGuidedEffects(flowKind);
    history.replaceState({}, "", "chatbot_ui.html");
  }

  return {
    handleFlowEntry,
    startFlowInCurrentSession,
  };
}

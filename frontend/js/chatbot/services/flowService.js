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
 * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
 * @param {any} session
 */
function buildStartupResumeDock(flowKind, session) {
  const resume = session?.experienceState?.resume;
  if (!resume || typeof resume !== "object") return null;
  const resumeKind = String(resume.kind || "").toLowerCase();
  if (flowKind === "quiz") {
    if (resumeKind !== "quiz" && resumeKind !== "thptqg_fulltest") return null;
  } else if (flowKind === "slide") {
    if (resumeKind !== "slide") return null;
  } else if (flowKind === "flashcard") {
    if (resumeKind !== "flash") return null;
  } else {
    return null;
  }
  return {
    kind: resumeKind,
    meta: resume.meta && typeof resume.meta === "object" ? { ...resume.meta } : {},
    experienceId: typeof resume.experienceId === "string" ? resume.experienceId : "",
    title: typeof resume.title === "string" && resume.title.trim() ? resume.title.trim() : resumeKind,
    openedAt: typeof resume.openedAt === "string" ? resume.openedAt : new Date().toISOString(),
  };
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
 *   commitNavigationSnapshot?: (mode?: "push"|"replace") => void,
 * }} deps
 */
export function createFlowService(deps) {
  const {
    getSessionsSnapshot,
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
    commitNavigationSnapshot,
  } = deps;

  const buildNextFlowSessionTitle = createBuildNextFlowSessionTitle({ getSessionsSnapshot });

  /**
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function startWithGuidedEffects(flowKind) {
    const start = computeStartFlow(flowKind);
    const resumeDock = buildStartupResumeDock(flowKind, getCurrentSession());
    const effects = resumeDock
      ? start.effects.map((effect, index) =>
          index === 0 && effect?.type === "pushBot" ? { ...effect, resumeDock } : effect,
        )
      : start.effects;
    setGuided(start.guided);
    await applyEffects(effects);
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
    const prevTitle = current?.title;
    const prevExperienceState = current?.experienceState ?? null;
    const stagedTitle = buildNextFlowSessionTitle(flowKind);
    const stagedExperienceState = {
      kind: expKind,
      meta: { flow: flowKind },
      progress: null,
      completed: false,
    };
    setGuided(null);
    resetResumeState();
    hideLayer();
    setStartupUiState(false);
    renderChatListUI();
    clearMessages();
    try {
      await startWithGuidedEffects(flowKind);
      current.title = stagedTitle;
      setCurrentExperienceState(stagedExperienceState);
      saveSessions();
      renderChatListUI();
      commitNavigationSnapshot?.("replace");
    } catch (err) {
      if (current && typeof current === "object") {
        current.title = prevTitle;
      }
      setCurrentExperienceState(prevExperienceState);
      saveSessions();
      renderChatListUI();
      renderMessages();
      console.error("Failed to start flow in current session:", err);
    }
  }

  /**
   * Entry from Main Hub (`?flow=`): always start a fresh flow instead of reopening the latest session.
   * @param {"fullset"|"quiz"|"slide"|"flashcard"} flowKind
   */
  async function handleFlowEntry(flowKind) {
    const expKind = flowToExperienceKind(flowKind);
    const sessions = getSessionsSnapshot();
    const previousActiveIndex = sessions.findIndex((s) => s === getCurrentSession());
    persistActiveExperience();
    const stagedTitle = buildNextFlowSessionTitle(flowKind);
    const stagedExperienceState = {
      kind: expKind,
      meta: { flow: flowKind },
      progress: null,
      completed: false,
    };
    const cur = getCurrentSession();
    const canReuseCurrent = canReuseEmptySession(cur);
    /** @type {number | null} */
    let createdSessionIndex = null;
    let targetSession = cur;
    const prevReusedTitle = canReuseCurrent ? cur?.title : null;
    const prevReusedExperienceState = canReuseCurrent ? cur?.experienceState ?? null : null;
    if (canReuseCurrent) {
      targetSession = cur;
    } else {
      createdSessionIndex = createSession();
      targetSession = getCurrentSession();
    }
    setGuided(null);
    resetResumeState();
    hideLayer();
    setStartupUiState(false);
    renderChatListUI();
    clearMessages();
    try {
      commitNavigationSnapshot?.("replace");
      try {
        await ensureSessionMessagesLoaded();
      } catch {
        // Keep local cache if remote loading fails.
      }
      await startWithGuidedEffects(flowKind);
      if (targetSession && typeof targetSession === "object") {
        targetSession.title = stagedTitle;
      }
      setCurrentExperienceState(stagedExperienceState);
      saveSessions();
      renderChatListUI();
      commitNavigationSnapshot?.("replace");
    } catch (err) {
      if (createdSessionIndex !== null) {
        const list = getSessionsSnapshot();
        if (createdSessionIndex >= 0 && createdSessionIndex < list.length) {
          list.splice(createdSessionIndex, 1);
        }
        if (previousActiveIndex >= 0 && previousActiveIndex < list.length) {
          setActiveSessionIndex(previousActiveIndex);
        } else {
          setActiveSessionIndex(0);
        }
      } else if (targetSession && typeof targetSession === "object") {
        targetSession.title = prevReusedTitle;
        setCurrentExperienceState(prevReusedExperienceState);
      }
      saveSessions();
      renderChatListUI();
      renderMessages();
      console.error("Failed to handle flow entry:", err);
    }
  }

  return {
    handleFlowEntry,
    startFlowInCurrentSession,
  };
}

/**
 * @param {{
 *   getCurrentExperienceState: () => any,
 *   setCurrentExperienceState: (next: any) => void,
 *   saveSessions: () => void,
 *   ensureExperienceHistoryEntry: () => void,
 *   layerView: any,
 *   mountQuizExperience: (layerView: any, meta: Record<string, string>, hooks: any, opts: any) => Promise<void>,
 *   mountSlideExperience: (layerView: any, meta: Record<string, string>, hooks: any, opts: any) => Promise<void>,
 *   mountFlashExperience: (layerView: any, meta: Record<string, string>, hooks: any, opts: any) => Promise<void>,
 *   mountFullSetHubExperience: (layerView: any, opts: any, onOpen: (item: any) => Promise<void>) => Promise<void>,
 *   mountFullSetMixedExperience: (layerView: any, opts: any, hooks: any, mountOpts: any) => Promise<void>,
 *   experienceHooks: any,
 *   pushBot: (text: string, opts?: any) => void,
 * }} deps
 */
export function createExperienceController(deps) {
  const {
    getCurrentExperienceState,
    setCurrentExperienceState,
    saveSessions,
    ensureExperienceHistoryEntry,
    layerView,
    mountQuizExperience,
    mountSlideExperience,
    mountFlashExperience,
    mountFullSetHubExperience,
    mountFullSetMixedExperience,
    experienceHooks,
    pushBot,
  } = deps;

  /** @type {any} */
  let lastOpenedExperience = null;
  let resumeDockAlreadyPosted = false;

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   */
  function buildResumeTitle(kind, meta) {
    if (kind === "quiz") return `Trắc nghiệm — ${meta.topic || "Bộ đề"}`;
    if (kind === "slide") return `Slide — ${meta.topic || "Bài giảng"}`;
    if (kind === "flash") return `Flashcard — ${meta.source || "Bộ thẻ"}`;
    return "Học liệu";
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   */
  function rememberOpenExperience(kind, meta) {
    lastOpenedExperience = {
      bundleBack: false,
      kind,
      meta: { ...meta },
      title: buildResumeTitle(kind, meta),
    };
    resumeDockAlreadyPosted = false;
  }

  function persistActiveExperience() {
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
   * @param {string} title
   * @param {any[]} items
   */
  function rememberOpenBundleForBack(title, items) {
    lastOpenedExperience = {
      bundleBack: true,
      title: title || "Full set",
      items: items.map((it) => ({
        kind: it.kind,
        meta: { ...(it.meta || {}) },
        title: it.title,
        openedAt: it.openedAt,
      })),
    };
    resumeDockAlreadyPosted = false;
  }

  /**
   * @param {string} title
   * @param {Record<string, string>} spec
   */
  function rememberOpenFullSetMixedForBack(title, spec) {
    lastOpenedExperience = {
      fullsetMixedBack: true,
      title: title || "Full set",
      fullsetMixed: { ...spec },
    };
    resumeDockAlreadyPosted = false;
  }

  function readPersistedActiveExperience() {
    const state = getCurrentExperienceState();
    const resume = state?.resume;
    return resume && typeof resume === "object" ? resume : null;
  }

  /**
   * @param {Record<string, string>} spec
   * @param {string} openedAtIso
   */
  function fullsetResumeItemsFromSpec(spec, openedAtIso) {
    const topic = spec.topic || "—";
    const t = openedAtIso || new Date().toISOString();
    return [
      {
        kind: "slide",
        meta: { topic, count: String(spec.slides || "—"), notes: "Full set (demo mock)" },
        title: `Slide — ${topic}`,
        openedAt: t,
      },
      {
        kind: "quiz",
        meta: { topic, count: String(spec.quiz || "—"), notes: "Full set (demo mock)" },
        title: `Trắc nghiệm — ${topic}`,
        openedAt: t,
      },
      {
        kind: "flash",
        meta: { source: topic, count: String(spec.flash || "—"), extra: "Full set (demo mock)" },
        title: `Flashcard — ${topic}`,
        openedAt: t,
      },
    ];
  }

  /**
   * @param {Record<string, string>} a
   * @param {Record<string, string>} b
   */
  function sameMeta(a, b) {
    const ak = Object.keys(a || {}).sort();
    const bk = Object.keys(b || {}).sort();
    if (ak.length !== bk.length) return false;
    for (let i = 0; i < ak.length; i += 1) {
      const key = ak[i];
      if (key !== bk[i]) return false;
      if (String(a[key] || "") !== String(b[key] || "")) return false;
    }
    return true;
  }

  /**
   * @param {"quiz"|"slide"|"flash"|"fullset"} kind
   * @param {any} progress
   */
  function computeCompleted(kind, progress) {
    const total = Number(progress?.total || 0);
    const index = Number(progress?.index || 0);
    if (!Number.isFinite(total) || total <= 0) return false;
    if (!Number.isFinite(index) || index < total - 1) return false;
    if (kind === "quiz") {
      const graded = Array.isArray(progress?.gradedByIndex) ? progress.gradedByIndex : [];
      return Boolean(graded[total - 1]);
    }
    if (kind === "fullset") {
      return Boolean(progress?.completed) || index >= total - 1;
    }
    return true;
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {"fresh"|"resume"} mode
   */
  async function openSingleExperience(kind, meta, mode) {
    rememberOpenExperience(kind, meta || {});
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    const currentExpState = getCurrentExperienceState() || {};
    const persisted = mode === "resume" && currentExpState.kind === kind ? currentExpState.progress : null;
    const initialState =
      persisted && persisted.meta && sameMeta(persisted.meta, meta || {}) ? persisted : null;
    const mountOpts = {
      initialState,
      onStateChange: (state) => {
        setCurrentExperienceState({
          ...getCurrentExperienceState(),
          kind,
          meta: { ...meta },
          progress: state,
          completed: computeCompleted(kind, state),
          resume: lastOpenedExperience,
        });
        saveSessions();
      },
    };
    if (mode === "fresh") {
      setCurrentExperienceState({
        kind,
        meta: { ...meta },
        progress: null,
        completed: false,
        resume: lastOpenedExperience,
      });
      saveSessions();
    }
    if (kind === "quiz") await mountQuizExperience(layerView, meta, experienceHooks, mountOpts);
    else if (kind === "slide") await mountSlideExperience(layerView, meta, experienceHooks, mountOpts);
    else await mountFlashExperience(layerView, meta, experienceHooks, mountOpts);
  }

  /**
   * @param {{ kind: string, meta: Record<string, string> }} item
   */
  async function openResumeExperience(item) {
    const rawKind = String(item?.kind || "").toLowerCase();
    const kind =
      rawKind === "flashcard" || rawKind === "flash"
        ? "flash"
        : rawKind.startsWith("quiz")
          ? "quiz"
          : rawKind.startsWith("slide")
            ? "slide"
            : rawKind;
    if (kind !== "quiz" && kind !== "slide" && kind !== "flash") {
      layerView.hide();
      return;
    }
    try {
      await openSingleExperience(
        /** @type {"quiz"|"slide"|"flash"} */ (kind),
        item.meta || {},
        "resume",
      );
    } catch {
      layerView.hide();
    }
  }

  /**
   * @param {any[]} items
   * @param {string} bundleTitle
   */
  async function openResumeOpenAll(items, bundleTitle) {
    rememberOpenBundleForBack(bundleTitle || "Full set", items);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    layerView.prepareShow();
    setCurrentExperienceState({
      kind: "fullset",
      meta: { mode: "hub", title: bundleTitle || "Full set" },
      progress: null,
      completed: false,
      resume: lastOpenedExperience,
    });
    saveSessions();
    await mountFullSetHubExperience(
      layerView,
      { title: bundleTitle || "Full set", items },
      async (item) => {
        await openResumeExperience(item);
      },
    );
  }

  /**
   * @param {Record<string, string>} spec
   * @param {string} bundleTitle
   */
  async function openResumeFullSetMixed(spec, bundleTitle) {
    rememberOpenFullSetMixedForBack(bundleTitle || "Full set", spec);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    layerView.prepareShow();
    const fullsetState = getCurrentExperienceState();
    const persisted = fullsetState?.kind === "fullset" ? fullsetState.progress : null;
    const initialState =
      persisted && persisted.spec && sameMeta(persisted.spec, spec || {}) ? persisted : null;
    await mountFullSetMixedExperience(
      layerView,
      { title: bundleTitle || "Full set", spec },
      experienceHooks,
      {
        initialState,
        onStateChange: (state) => {
          setCurrentExperienceState({
            ...getCurrentExperienceState(),
            kind: "fullset",
            meta: { ...spec },
            progress: state,
            completed: computeCompleted("fullset", state),
            resume: lastOpenedExperience,
          });
          saveSessions();
        },
      },
    );
  }

  async function restoreCurrentSessionExperience() {
    const restored = readPersistedActiveExperience();
    if (!restored) {
      layerView.hide();
      return;
    }
    lastOpenedExperience = restored;
    ensureExperienceHistoryEntry();
    if (restored.bundleBack && Array.isArray(restored.items)) {
      await openResumeOpenAll(restored.items, restored.title || "Full set");
      return;
    }
    if (restored.fullsetMixedBack && restored.fullsetMixed) {
      await openResumeFullSetMixed(restored.fullsetMixed, restored.title || "Full set");
      return;
    }
    if (restored.kind) {
      await openResumeExperience({ kind: restored.kind, meta: restored.meta || {} });
    }
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   */
  function pushQuickResumeDock(kind, meta) {
    const now = new Date().toISOString();
    pushBot("Đã tạo xong. Bạn có thể bấm Mở để quay lại học liệu này.", {
      resumeDock: {
        kind,
        meta: { ...meta },
        title: buildResumeTitle(kind, meta || {}),
        openedAt: now,
      },
    });
    resumeDockAlreadyPosted = true;
  }

  function pushResumeDockFromLastOpened() {
    if (!lastOpenedExperience) return;
    if (resumeDockAlreadyPosted) {
      lastOpenedExperience = null;
      resumeDockAlreadyPosted = false;
      persistActiveExperience();
      return;
    }
    const now = new Date().toISOString();
    if (lastOpenedExperience.bundleBack) {
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock: {
          title: lastOpenedExperience.title,
          items: lastOpenedExperience.items,
          openedAt: now,
        },
      });
    } else if (lastOpenedExperience.fullsetMixedBack) {
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock: {
          title: lastOpenedExperience.title,
          fullsetMixed: { ...lastOpenedExperience.fullsetMixed },
          items: fullsetResumeItemsFromSpec(lastOpenedExperience.fullsetMixed, now),
          openedAt: now,
        },
      });
    } else {
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock: {
          kind: lastOpenedExperience.kind,
          meta: { ...lastOpenedExperience.meta },
          title: lastOpenedExperience.title,
          openedAt: now,
        },
      });
    }
    lastOpenedExperience = null;
    resumeDockAlreadyPosted = false;
    persistActiveExperience();
  }

  function resetResumeState() {
    lastOpenedExperience = null;
    resumeDockAlreadyPosted = false;
  }

  function hasLastOpenedExperience() {
    return Boolean(lastOpenedExperience);
  }

  return {
    persistActiveExperience,
    openSingleExperience,
    openResumeExperience,
    openResumeOpenAll,
    openResumeFullSetMixed,
    restoreCurrentSessionExperience,
    pushQuickResumeDock,
    pushResumeDockFromLastOpened,
    resetResumeState,
    hasLastOpenedExperience,
  };
}

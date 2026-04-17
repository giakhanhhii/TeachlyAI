import { restoreCurrentSessionExperience as restoreExperienceFromSession } from "../services/experienceService.js";
import {
  buildResumeTitle,
  computeCompleted,
  fullsetResumeItemsFromSpec,
  normalizeExperienceKind,
  resolveFullsetInitialState,
  resolveSingleInitialState,
} from "../services/experienceStateService.js";
import { resumeDockSignature } from "../utils/serialization.js";

/**
 * @param {{
 *   getCurrentSession: () => any,
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
    getCurrentSession,
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

  function hasResumeDockInCurrentSession(targetDock) {
    const targetSignature = resumeDockSignature(targetDock);
    if (!targetSignature) return false;
    const current = getCurrentSession?.();
    const messages = Array.isArray(current?.messages) ? current.messages : [];
    for (let i = 0; i < messages.length; i += 1) {
      const message = messages[i];
      if (!message || typeof message !== "object" || message.role !== "bot" || !message.resumeDock) continue;
      if (resumeDockSignature(message.resumeDock) === targetSignature) return true;
    }
    return false;
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
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   * @param {"fresh"|"resume"} mode
   */
  async function openSingleExperience(kind, meta, mode) {
    rememberOpenExperience(kind, meta || {});
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    const initialState = resolveSingleInitialState(getCurrentExperienceState() || {}, kind, meta || {}, mode);
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
    const kind = normalizeExperienceKind(item?.kind || "");
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
    const initialState = resolveFullsetInitialState(getCurrentExperienceState(), spec || {});
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
    await restoreExperienceFromSession({
      readPersistedActiveExperience,
      setLastOpenedExperience: (resume) => {
        lastOpenedExperience = resume;
      },
      ensureExperienceHistoryEntry,
      hideLayer: () => layerView.hide(),
      openResumeOpenAll,
      openResumeFullSetMixed,
      openResumeExperience,
    });
  }

  /**
   * @param {"quiz"|"slide"|"flash"} kind
   * @param {Record<string, string>} meta
   */
  function pushQuickResumeDock(kind, meta) {
    const now = new Date().toISOString();
    const resumeDock = {
      kind,
      meta: { ...meta },
      title: buildResumeTitle(kind, meta || {}),
      openedAt: now,
    };
    if (hasResumeDockInCurrentSession(resumeDock)) {
      resumeDockAlreadyPosted = true;
      return;
    }
    pushBot("Đã tạo xong. Bạn có thể bấm Mở để quay lại học liệu này.", {
      resumeDock,
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
      const resumeDock = {
        title: lastOpenedExperience.title,
        items: lastOpenedExperience.items,
        openedAt: now,
      };
      if (hasResumeDockInCurrentSession(resumeDock)) {
        lastOpenedExperience = null;
        resumeDockAlreadyPosted = false;
        persistActiveExperience();
        return;
      }
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock,
      });
    } else if (lastOpenedExperience.fullsetMixedBack) {
      const resumeDock = {
        title: lastOpenedExperience.title,
        fullsetMixed: { ...lastOpenedExperience.fullsetMixed },
        items: fullsetResumeItemsFromSpec(lastOpenedExperience.fullsetMixed, now),
        openedAt: now,
      };
      if (hasResumeDockInCurrentSession(resumeDock)) {
        lastOpenedExperience = null;
        resumeDockAlreadyPosted = false;
        persistActiveExperience();
        return;
      }
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock,
      });
    } else {
      const resumeDock = {
        kind: lastOpenedExperience.kind,
        meta: { ...lastOpenedExperience.meta },
        title: lastOpenedExperience.title,
        openedAt: now,
      };
      if (hasResumeDockInCurrentSession(resumeDock)) {
        lastOpenedExperience = null;
        resumeDockAlreadyPosted = false;
        persistActiveExperience();
        return;
      }
      pushBot("Bạn có thể mở lại học liệu tương tác vừa xem bất cứ lúc nào.", {
        resumeDock,
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

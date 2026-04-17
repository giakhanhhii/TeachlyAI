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
  const EXPERIENCE_HISTORY_LIMIT = 24;

  function generateExperienceId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * @param {Record<string, any>} meta
   */
  function readExperienceIdFromMeta(meta) {
    if (!meta || typeof meta !== "object") return "";
    const byUnderscore = typeof meta.__experienceId === "string" ? meta.__experienceId.trim() : "";
    if (byUnderscore) return byUnderscore;
    const byDirect = typeof meta.experienceId === "string" ? meta.experienceId.trim() : "";
    return byDirect;
  }

  /**
   * @param {Record<string, any>} meta
   * @param {string} experienceId
   */
  function withExperienceIdMeta(meta, experienceId) {
    const safeMeta = meta && typeof meta === "object" ? { ...meta } : {};
    if (!experienceId) return safeMeta;
    return {
      ...safeMeta,
      __experienceId: experienceId,
    };
  }

  /**
   * @param {any} currentState
   * @param {{ experienceId: string, kind: "quiz"|"slide"|"flash"|"fullset", meta: Record<string, any>, progress: any, completed: boolean }} params
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
    ids
      .sort((a, b) => {
        const aTime = Date.parse(nextHistory[a]?.updatedAt || "");
        const bTime = Date.parse(nextHistory[b]?.updatedAt || "");
        const safeA = Number.isFinite(aTime) ? aTime : 0;
        const safeB = Number.isFinite(bTime) ? bTime : 0;
        return safeB - safeA;
      })
      .slice(EXPERIENCE_HISTORY_LIMIT)
      .forEach((id) => {
        delete nextHistory[id];
      });
    return nextHistory;
  }

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
   * @param {string} [experienceId]
   */
  function rememberOpenExperience(kind, meta, experienceId) {
    lastOpenedExperience = {
      bundleBack: false,
      kind,
      meta: { ...meta },
      experienceId: experienceId || "",
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
        experienceId: it.experienceId || "",
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
  function rememberOpenFullSetMixedForBack(title, spec, experienceId) {
    lastOpenedExperience = {
      fullsetMixedBack: true,
      title: title || "Full set",
      fullsetMixed: { ...spec },
      experienceId: experienceId || "",
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
   * @param {string} [forcedExperienceId]
   */
  async function openSingleExperience(kind, meta, mode, forcedExperienceId = "") {
    const seedMeta = meta && typeof meta === "object" ? meta : {};
    const experienceId = forcedExperienceId || readExperienceIdFromMeta(seedMeta) || generateExperienceId();
    const scopedMeta = withExperienceIdMeta(seedMeta, experienceId);
    rememberOpenExperience(kind, scopedMeta, experienceId);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    const initialState = resolveSingleInitialState(getCurrentExperienceState() || {}, kind, scopedMeta, mode, experienceId);
    const mountOpts = {
      initialState,
      onStateChange: (state) => {
        const completed = computeCompleted(kind, state);
        const currentState = getCurrentExperienceState() || {};
        const historyById = upsertHistoryByExperienceId(currentState, {
          experienceId,
          kind,
          meta: scopedMeta,
          progress: state,
          completed,
        });
        setCurrentExperienceState({
          ...currentState,
          kind,
          meta: { ...scopedMeta },
          progress: state,
          completed,
          activeExperienceId: experienceId,
          historyById,
          resume: lastOpenedExperience,
        });
        saveSessions();
      },
    };
    if (mode === "fresh") {
      const currentState = getCurrentExperienceState() || {};
      setCurrentExperienceState({
        ...currentState,
        kind,
        meta: { ...scopedMeta },
        progress: null,
        completed: false,
        activeExperienceId: experienceId,
        resume: lastOpenedExperience,
        historyById: upsertHistoryByExperienceId(currentState, {
          experienceId,
          kind,
          meta: scopedMeta,
          progress: null,
          completed: false,
        }),
      });
      saveSessions();
    }
    if (kind === "quiz") await mountQuizExperience(layerView, scopedMeta, experienceHooks, mountOpts);
    else if (kind === "slide") await mountSlideExperience(layerView, scopedMeta, experienceHooks, mountOpts);
    else await mountFlashExperience(layerView, scopedMeta, experienceHooks, mountOpts);
  }

  /**
   * @param {{ kind: string, meta: Record<string, string>, experienceId?: string }} item
   */
  async function openResumeExperience(item) {
    const kind = normalizeExperienceKind(item?.kind || "");
    if (kind !== "quiz" && kind !== "slide" && kind !== "flash") {
      layerView.hide();
      return;
    }
    try {
      const resumeMeta = item && typeof item === "object" && item.meta && typeof item.meta === "object" ? item.meta : {};
      const experienceId =
        (item && typeof item.experienceId === "string" ? item.experienceId : "") || readExperienceIdFromMeta(resumeMeta);
      await openSingleExperience(
        /** @type {"quiz"|"slide"|"flash"} */ (kind),
        resumeMeta,
        "resume",
        experienceId,
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
    const currentState = getCurrentExperienceState() || {};
    setCurrentExperienceState({
      ...currentState,
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
  async function openResumeFullSetMixed(spec, bundleTitle, forcedExperienceId = "") {
    const safeSpec = spec && typeof spec === "object" ? { ...spec } : {};
    const experienceId = forcedExperienceId || readExperienceIdFromMeta(safeSpec) || generateExperienceId();
    const scopedSpec = withExperienceIdMeta(safeSpec, experienceId);
    rememberOpenFullSetMixedForBack(bundleTitle || "Full set", scopedSpec, experienceId);
    persistActiveExperience();
    ensureExperienceHistoryEntry();
    layerView.prepareShow();
    const initialState = resolveFullsetInitialState(getCurrentExperienceState(), scopedSpec, experienceId);
    await mountFullSetMixedExperience(
      layerView,
      { title: bundleTitle || "Full set", spec: scopedSpec },
      experienceHooks,
      {
        initialState,
        onStateChange: (state) => {
          const completed = computeCompleted("fullset", state);
          const currentState = getCurrentExperienceState() || {};
          const historyById = upsertHistoryByExperienceId(currentState, {
            experienceId,
            kind: "fullset",
            meta: scopedSpec,
            progress: state,
            completed,
          });
          setCurrentExperienceState({
            ...currentState,
            kind: "fullset",
            meta: { ...scopedSpec },
            progress: state,
            completed,
            activeExperienceId: experienceId,
            historyById,
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
   * @param {string} [forcedExperienceId]
   */
  function pushQuickResumeDock(kind, meta, forcedExperienceId = "") {
    const seedMeta = meta && typeof meta === "object" ? meta : {};
    const experienceId = forcedExperienceId || readExperienceIdFromMeta(seedMeta) || generateExperienceId();
    const scopedMeta = withExperienceIdMeta(seedMeta, experienceId);
    const now = new Date().toISOString();
    const resumeDock = {
      kind,
      meta: { ...scopedMeta },
      experienceId,
      title: buildResumeTitle(kind, scopedMeta || {}),
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
        experienceId: lastOpenedExperience.experienceId || "",
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
        experienceId: lastOpenedExperience.experienceId || "",
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

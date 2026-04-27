import { getSourceActions } from "../guidedFlow/shared.js";

/**
 * @param {{
 *  buildResumeTitle: (kind: "quiz"|"slide"|"flash"|"thptqg_fulltest", meta: Record<string, any>) => string,
 *  fullsetResumeItemsFromSpec: (spec: Record<string, string>, openedAt: string) => any[],
 *  hasResumeDockInCurrentSession: (dock: any) => boolean,
 *  pushBot: (text: string, opts?: any) => void,
 *  persistActiveExperience: (resume: any) => void,
 * }} deps
 */
export function createExperienceResumeService(deps) {
  const { buildResumeTitle, fullsetResumeItemsFromSpec, hasResumeDockInCurrentSession, pushBot, persistActiveExperience } = deps;

  /** @type {any} */
  let lastOpenedExperience = null;
  let resumeDockAlreadyPosted = false;

  function generateExperienceId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * @param {"fullset"|"quiz"|"slide"|"flash"|"thptqg_fulltest"} kind
   * @param {any} resumeDock
   */
  function pushContinuePrompt(kind, resumeDock) {
    const actionKind = kind === "thptqg_fulltest" ? "thptqg_fulltest" : kind;
    pushBot("Bạn muốn tiếp tục theo cách nào?", {
      actions: getSourceActions(actionKind),
      resumeDock,
    });
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
   * @param {"quiz"|"slide"|"flash"|"thptqg_fulltest"} kind
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
      resumeState: null,
    };
    resumeDockAlreadyPosted = false;
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
   * @param {string} [experienceId]
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

  /**
   * @param {"quiz"|"slide"|"flash"|"thptqg_fulltest"} kind
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
      resumeState: lastOpenedExperience?.experienceId === experienceId ? lastOpenedExperience?.resumeState || null : null,
    };
    if (hasResumeDockInCurrentSession(resumeDock)) {
      resumeDockAlreadyPosted = true;
      return;
    }
    pushContinuePrompt(kind, resumeDock);
    resumeDockAlreadyPosted = true;
  }

  function pushResumeDockFromLastOpened() {
    if (!lastOpenedExperience) return;
    const resumeToPersist = lastOpenedExperience;
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
        persistActiveExperience(resumeToPersist);
        return;
      }
      pushContinuePrompt("fullset", resumeDock);
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
        persistActiveExperience(resumeToPersist);
        return;
      }
      pushContinuePrompt("fullset", resumeDock);
    } else {
      const resumeDock = {
        kind: lastOpenedExperience.kind,
        meta: { ...lastOpenedExperience.meta },
        experienceId: lastOpenedExperience.experienceId || "",
        title: lastOpenedExperience.title,
        openedAt: now,
        resumeState: lastOpenedExperience.resumeState || null,
      };
      if (hasResumeDockInCurrentSession(resumeDock)) {
        lastOpenedExperience = null;
        resumeDockAlreadyPosted = false;
        persistActiveExperience(resumeToPersist);
        return;
      }
      pushContinuePrompt(lastOpenedExperience.kind, resumeDock);
    }
    lastOpenedExperience = null;
    resumeDockAlreadyPosted = false;
    persistActiveExperience(resumeToPersist);
  }

  function persistCurrentActiveExperience() {
    persistActiveExperience(lastOpenedExperience);
  }

  /**
   * @param {any} resume
   */
  function setLastOpenedExperience(resume) {
    lastOpenedExperience = resume;
  }

  function getLastOpenedExperience() {
    return lastOpenedExperience;
  }

  /**
   * @param {{
   *  kind: "quiz"|"slide"|"flash"|"thptqg_fulltest",
   *  meta: Record<string, any>,
   *  experienceId: string,
   *  title?: string,
   *  progress: any,
   * }} params
   */
  function syncLastOpenedExperience(params) {
    const { kind, meta, experienceId, title, progress } = params || {};
    if (!lastOpenedExperience || lastOpenedExperience.bundleBack || lastOpenedExperience.fullsetMixedBack) return;
    if (lastOpenedExperience.kind !== kind) return;
    if ((lastOpenedExperience.experienceId || "") !== (experienceId || "")) return;
    lastOpenedExperience = {
      ...lastOpenedExperience,
      meta: meta && typeof meta === "object" ? { ...meta } : { ...(lastOpenedExperience.meta || {}) },
      title: typeof title === "string" && title.trim() ? title.trim() : lastOpenedExperience.title,
      resumeState: progress && typeof progress === "object" ? progress : lastOpenedExperience.resumeState || null,
    };
  }

  function resetResumeState() {
    lastOpenedExperience = null;
    resumeDockAlreadyPosted = false;
  }

  function hasLastOpenedExperience() {
    return Boolean(lastOpenedExperience);
  }

  return {
    generateExperienceId,
    readExperienceIdFromMeta,
    withExperienceIdMeta,
    rememberOpenExperience,
    rememberOpenBundleForBack,
    rememberOpenFullSetMixedForBack,
    pushQuickResumeDock,
    pushResumeDockFromLastOpened,
    persistCurrentActiveExperience,
    setLastOpenedExperience,
    getLastOpenedExperience,
    syncLastOpenedExperience,
    resetResumeState,
    hasLastOpenedExperience,
  };
}

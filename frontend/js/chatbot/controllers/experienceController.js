import { restoreCurrentSessionExperience as restoreExperienceFromSession } from "../services/experienceService.js";
import { takePendingPdfFile } from "../pdfPrefillStore.js";
import { createExperienceHistoryService } from "../services/experienceHistoryService.js";
import { createExperienceResumeService } from "../services/experienceResumeService.js";
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
 *   mountThptqgFullTestExperience: (layerView: any, meta: Record<string, string>, hooks: any, opts: any) => Promise<void>,
 *   experienceHooks: any,
 *   pushBot: (text: string, opts?: any) => void,
 *   onExperienceStateChange?: () => void,
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
    mountThptqgFullTestExperience,
    experienceHooks,
    pushBot,
    onExperienceStateChange,
  } = deps;

  const historyService = createExperienceHistoryService({
    getCurrentExperienceState,
    setCurrentExperienceState,
    saveSessions,
  });

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

  const resumeService = createExperienceResumeService({
    buildResumeTitle,
    fullsetResumeItemsFromSpec,
    hasResumeDockInCurrentSession,
    pushBot,
    persistActiveExperience: (resume) => historyService.persistActiveExperience(resume),
  });

  function readPersistedActiveExperience() {
    return historyService.readPersistedActiveExperience();
  }

  function persistActiveExperience() {
    resumeService.persistCurrentActiveExperience();
  }

  function resolveHistoryOpts(historyOpts) {
    if (!historyOpts || typeof historyOpts !== "object") {
      return { mode: "push", canBackToChat: true };
    }
    return {
      mode: historyOpts.mode === "replace" ? "replace" : "push",
      canBackToChat: Boolean(historyOpts.canBackToChat),
    };
  }

  function pickBetterInitialState(primary, secondary) {
    const primaryScore = estimateInitialStateRichness(primary);
    const secondaryScore = estimateInitialStateRichness(secondary);
    if (secondaryScore > primaryScore) return secondary;
    return primaryScore >= 0 ? primary : secondaryScore >= 0 ? secondary : null;
  }

  function estimateInitialStateRichness(state) {
    if (!state || typeof state !== "object") return -1;
    let score = 0;
    if (typeof state.view === "string" && state.view) score += 2;
    if (typeof state.startedAt === "string" && state.startedAt) score += 2;
    if (typeof state.submittedAt === "string" && state.submittedAt) score += 6;
    if (state.view === "result") score += 4;
    if (state.reviewMode) score += 2;
    if (typeof state.currentQuestion === "string" && state.currentQuestion) score += 1;
    if (typeof state.currentPartId === "string" && state.currentPartId) score += 1;
    if (typeof state.activeResultPartId === "string" && state.activeResultPartId) score += 1;
    if (typeof state.detailQuestionId === "string" && state.detailQuestionId) score += 1;
    if (Number.isFinite(Number(state.elapsedSeconds))) score += 1;
    score += Object.keys(state.answersByQuestion && typeof state.answersByQuestion === "object" ? state.answersByQuestion : {}).length;
    score += Array.isArray(state.flaggedQuestions) ? state.flaggedQuestions.length : 0;
    return score;
  }

  /**
   * @param {"quiz"|"slide"|"flash"|"thptqg_fulltest"} kind
   * @param {Record<string, string>} meta
   * @param {"fresh"|"resume"} mode
   * @param {string} [forcedExperienceId]
   * @param {{ mode?: "push" | "replace", canBackToChat?: boolean }} [historyOpts]
   * @param {any} [fallbackInitialState]
   */
  async function openSingleExperience(kind, meta, mode, forcedExperienceId = "", historyOpts, fallbackInitialState = null) {
    const seedMeta = meta && typeof meta === "object" ? meta : {};
    const experienceId =
      forcedExperienceId || resumeService.readExperienceIdFromMeta(seedMeta) || resumeService.generateExperienceId();
    const scopedMeta = resumeService.withExperienceIdMeta(seedMeta, experienceId);
    resumeService.rememberOpenExperience(kind, scopedMeta, experienceId);
    persistActiveExperience();
    ensureExperienceHistoryEntry(resolveHistoryOpts(historyOpts));
    const initialState = pickBetterInitialState(
      resolveSingleInitialState(getCurrentExperienceState() || {}, kind, scopedMeta, mode, experienceId),
      fallbackInitialState && typeof fallbackInitialState === "object" ? fallbackInitialState : null,
    );
    const mountOpts = {
      initialState,
      onStateChange: (state) => {
        const completed = computeCompleted(kind, state);
        const effectiveMeta =
          state?.meta && typeof state.meta === "object"
            ? { ...scopedMeta, ...state.meta }
            : scopedMeta;
        historyService.updateSingleExperienceProgress({
          kind,
          meta: effectiveMeta,
          experienceId,
          progress: state,
          completed,
          resume: resumeService.getLastOpenedExperience(),
        });
        resumeService.syncLastOpenedExperience({
          kind,
          meta: effectiveMeta,
          experienceId,
          title: typeof state?.title === "string" ? state.title : buildResumeTitle(kind, effectiveMeta),
          progress: state,
        });
        persistActiveExperience();
        onExperienceStateChange?.();
      },
    };
    if (mode === "fresh") {
      historyService.seedSingleExperience({
        kind,
        meta: scopedMeta,
        experienceId,
        resume: resumeService.getLastOpenedExperience(),
      });
    }
    if (kind === "quiz") await mountQuizExperience(layerView, scopedMeta, experienceHooks, mountOpts);
    else if (kind === "slide") await mountSlideExperience(layerView, scopedMeta, experienceHooks, mountOpts);
    else if (kind === "flash") await mountFlashExperience(layerView, scopedMeta, experienceHooks, mountOpts);
    else await mountThptqgFullTestExperience(layerView, scopedMeta, experienceHooks, mountOpts);
  }

  /**
   * @param {{ kind: string, meta: Record<string, string>, experienceId?: string }} item
   * @param {{ mode?: "push" | "replace", canBackToChat?: boolean }} [historyOpts]
   */
  async function openResumeExperience(item, historyOpts) {
    const kind = normalizeExperienceKind(item?.kind || "");
    if (kind !== "quiz" && kind !== "slide" && kind !== "flash" && kind !== "thptqg_fulltest") {
      layerView.hide();
      return;
    }
    try {
      const itemMeta = item && typeof item === "object" && item.meta && typeof item.meta === "object" ? item.meta : {};
      const experienceId =
        (item && typeof item.experienceId === "string" ? item.experienceId : "") ||
        resumeService.readExperienceIdFromMeta(itemMeta);
      const persistedResume = readPersistedActiveExperience();
      const canUsePersistedResume =
        persistedResume
        && typeof persistedResume === "object"
        && persistedResume.kind === kind
        && (persistedResume.experienceId || "") === experienceId;
      const resumeMeta = canUsePersistedResume && persistedResume.meta && typeof persistedResume.meta === "object"
        ? persistedResume.meta
        : itemMeta;
      const fallbackInitialState =
        canUsePersistedResume && persistedResume.resumeState && typeof persistedResume.resumeState === "object"
          ? persistedResume.resumeState
          : item && typeof item === "object" && item.resumeState && typeof item.resumeState === "object"
            ? item.resumeState
            : null;
      await openSingleExperience(
        /** @type {"quiz"|"slide"|"flash"|"thptqg_fulltest"} */ (kind),
        resumeMeta,
        "resume",
        experienceId,
        historyOpts,
        fallbackInitialState,
      );
    } catch {
      layerView.hide();
    }
  }

  /**
   * @param {any[]} items
   * @param {string} bundleTitle
   * @param {{ mode?: "push" | "replace", canBackToChat?: boolean }} [historyOpts]
   */
  async function openResumeOpenAll(items, bundleTitle, historyOpts) {
    resumeService.rememberOpenBundleForBack(bundleTitle || "Full set", items);
    persistActiveExperience();
    ensureExperienceHistoryEntry(resolveHistoryOpts(historyOpts));
    layerView.prepareShow();
    historyService.seedFullsetHubState({
      bundleTitle: bundleTitle || "Full set",
      resume: resumeService.getLastOpenedExperience(),
    });
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
   * @param {string} [forcedExperienceId]
   * @param {{ mode?: "push" | "replace", canBackToChat?: boolean }} [historyOpts]
   */
  async function openResumeFullSetMixed(spec, bundleTitle, forcedExperienceId = "", historyOpts) {
    const safeSpec = spec && typeof spec === "object" ? { ...spec } : {};
    if (safeSpec.__pdfPending === "1") {
      const pendingFile = takePendingPdfFile();
      if (pendingFile) safeSpec.__pdfFile = pendingFile;
      delete safeSpec.__pdfPending;
    }
    const experienceId =
      forcedExperienceId || resumeService.readExperienceIdFromMeta(safeSpec) || resumeService.generateExperienceId();
    const scopedSpec = resumeService.withExperienceIdMeta(safeSpec, experienceId);
    resumeService.rememberOpenFullSetMixedForBack(bundleTitle || "Full set", scopedSpec, experienceId);
    persistActiveExperience();
    ensureExperienceHistoryEntry(resolveHistoryOpts(historyOpts));
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
          historyService.updateFullsetProgress({
            meta: scopedSpec,
            experienceId,
            progress: state,
            completed,
            resume: resumeService.getLastOpenedExperience(),
          });
          onExperienceStateChange?.();
        },
      },
    );
  }

  async function restoreCurrentSessionExperience() {
    await restoreExperienceFromSession({
      readPersistedActiveExperience,
      setLastOpenedExperience: (resume) => resumeService.setLastOpenedExperience(resume),
      ensureExperienceHistoryEntry,
      hideLayer: () => layerView.hide(),
      openResumeOpenAll,
      openResumeFullSetMixed,
      openResumeExperience,
    });
  }

  function pushQuickResumeDock(kind, meta, forcedExperienceId = "") {
    resumeService.pushQuickResumeDock(kind, meta, forcedExperienceId);
  }

  function pushResumeDockFromLastOpened() {
    resumeService.pushResumeDockFromLastOpened();
  }

  function resetResumeState() {
    resumeService.resetResumeState();
  }

  function hasLastOpenedExperience() {
    return resumeService.hasLastOpenedExperience();
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

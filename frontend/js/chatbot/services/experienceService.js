/**
 * @param {{
 *   readPersistedActiveExperience: () => any,
 *   setLastOpenedExperience: (resume: any) => void,
 *   ensureExperienceHistoryEntry: () => void,
 *   hideLayer: () => void,
 *   openResumeOpenAll: (items: any[], title: string, historyOpts?: any) => Promise<void>,
 *   openResumeFullSetMixed: (spec: Record<string, string>, title: string, forcedExperienceId?: string, historyOpts?: any) => Promise<void>,
 *   openResumeExperience: (item: { kind: string, meta: Record<string, string>, experienceId?: string }, historyOpts?: any) => Promise<void>,
 * }} deps
 */
export async function restoreCurrentSessionExperience(deps) {
  const restored = deps.readPersistedActiveExperience();
  if (!restored) {
    deps.hideLayer();
    return;
  }
  deps.setLastOpenedExperience(restored);
  const historyOpts = { mode: "replace", canBackToChat: false };
  if (restored.bundleBack && Array.isArray(restored.items)) {
    await deps.openResumeOpenAll(restored.items, restored.title || "Full set", historyOpts);
    return;
  }
  if (restored.fullsetMixedBack && restored.fullsetMixed) {
    await deps.openResumeFullSetMixed(restored.fullsetMixed, restored.title || "Full set", "", historyOpts);
    return;
  }
  if (restored.kind) {
    await deps.openResumeExperience({ kind: restored.kind, meta: restored.meta || {} }, historyOpts);
  }
}

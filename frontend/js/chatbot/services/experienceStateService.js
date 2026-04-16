/**
 * @param {"quiz"|"slide"|"flash"} kind
 * @param {Record<string, string>} meta
 */
export function buildResumeTitle(kind, meta) {
  if (kind === "quiz") return `Trắc nghiệm — ${meta.topic || "Bộ đề"}`;
  if (kind === "slide") return `Slide — ${meta.topic || "Bài giảng"}`;
  if (kind === "flash") return `Flashcard — ${meta.source || "Bộ thẻ"}`;
  return "Học liệu";
}

/**
 * @param {Record<string, string>} a
 * @param {Record<string, string>} b
 */
export function sameMeta(a, b) {
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
export function computeCompleted(kind, progress) {
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
 * @param {any} currentExperienceState
 * @param {"quiz"|"slide"|"flash"} kind
 * @param {Record<string, string>} meta
 * @param {"fresh"|"resume"} mode
 */
export function resolveSingleInitialState(currentExperienceState, kind, meta, mode) {
  const persisted =
    mode === "resume" && currentExperienceState?.kind === kind
      ? currentExperienceState.progress
      : null;
  return persisted && persisted.meta && sameMeta(persisted.meta, meta || {}) ? persisted : null;
}

/**
 * @param {any} currentExperienceState
 * @param {Record<string, string>} spec
 */
export function resolveFullsetInitialState(currentExperienceState, spec) {
  const persisted = currentExperienceState?.kind === "fullset" ? currentExperienceState.progress : null;
  return persisted && persisted.spec && sameMeta(persisted.spec, spec || {}) ? persisted : null;
}

/**
 * @param {string} rawKind
 */
export function normalizeExperienceKind(rawKind) {
  const normalized = String(rawKind || "").toLowerCase();
  if (normalized === "flashcard" || normalized === "flash") return "flash";
  if (normalized.startsWith("quiz")) return "quiz";
  if (normalized.startsWith("slide")) return "slide";
  return normalized;
}

/**
 * @param {Record<string, string>} spec
 * @param {string} openedAtIso
 */
export function fullsetResumeItemsFromSpec(spec, openedAtIso) {
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

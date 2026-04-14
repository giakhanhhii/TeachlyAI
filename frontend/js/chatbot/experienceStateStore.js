const SS_EXP_ACTIVE = "teachly.chat.exp.active";
const SS_EXP_STATE_PREFIX = "teachly.chat.exp.state.";
const ALLOWED_KINDS = new Set(["quiz", "slide", "flash", "fullset"]);

/**
 * @param {string} kind
 * @returns {"quiz"|"slide"|"flash"|"fullset"|null}
 */
function normalizeKind(kind) {
  const k = String(kind || "").trim().toLowerCase();
  if (!ALLOWED_KINDS.has(k)) return null;
  return /** @type {"quiz"|"slide"|"flash"|"fullset"} */ (k);
}

/**
 * @param {string} kind
 */
function stateKey(kind) {
  return `${SS_EXP_STATE_PREFIX}${kind}`;
}

/**
 * @param {string} kind
 * @param {any} state
 */
export function writeExperienceState(kind, state) {
  const safeKind = normalizeKind(kind);
  if (!safeKind) return;
  try {
    if (!state || typeof state !== "object") {
      sessionStorage.removeItem(stateKey(safeKind));
      return;
    }
    sessionStorage.setItem(stateKey(safeKind), JSON.stringify(state));
  } catch {
    // Ignore storage errors to avoid breaking UX.
  }
}

/**
 * @param {string} kind
 * @returns {any | null}
 */
export function readExperienceState(kind) {
  const safeKind = normalizeKind(kind);
  if (!safeKind) return null;
  try {
    const raw = sessionStorage.getItem(stateKey(safeKind));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} kind
 */
export function clearExperienceState(kind) {
  const safeKind = normalizeKind(kind);
  if (!safeKind) return;
  try {
    sessionStorage.removeItem(stateKey(safeKind));
  } catch {
    // Ignore storage errors to avoid breaking UX.
  }
}

/**
 * @param {{ kind: "quiz"|"slide"|"flash"|"fullset", payload?: any } | null} active
 */
export function writeActiveExperience(active) {
  try {
    if (!active || typeof active !== "object") {
      sessionStorage.removeItem(SS_EXP_ACTIVE);
      return;
    }
    const safeKind = normalizeKind(active.kind);
    if (!safeKind) {
      sessionStorage.removeItem(SS_EXP_ACTIVE);
      return;
    }
    const data = {
      kind: safeKind,
      payload: active.payload && typeof active.payload === "object" ? active.payload : {},
    };
    sessionStorage.setItem(SS_EXP_ACTIVE, JSON.stringify(data));
  } catch {
    // Ignore storage errors to avoid breaking UX.
  }
}

/**
 * @returns {{ kind: "quiz"|"slide"|"flash"|"fullset", payload: any } | null}
 */
export function readActiveExperience() {
  try {
    const raw = sessionStorage.getItem(SS_EXP_ACTIVE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const safeKind = normalizeKind(parsed.kind);
    if (!safeKind) return null;
    return {
      kind: safeKind,
      payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {},
    };
  } catch {
    return null;
  }
}

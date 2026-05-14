const LS_KEY = "teachly_auto_mode_v1";

const SLIDE_THEMES = [
  "Professional (Multicolor)",
  "Minimal (Academic)",
  "Friendly (Warm)",
  "Space Light",
  "Space Dark",
  "Sea Life",
  "Comic",
];

/** Returns a random slide theme label. */
export function pickRandomTheme() {
  return SLIDE_THEMES[Math.floor(Math.random() * SLIDE_THEMES.length)];
}

export const DEFAULT_COUNTS = { slides: 15, quiz: 15, flash: 10 };

// Topic names that match EXTRA_SLIDE_TOPIC_LIST in directSlidePresets.js
// so findDirectSlidePreset() can find a matching preset and use ordered chapter rendering.
const ALL_TOPICS = [
  "Present perfect and present perfect continuous",
  "Wishes and hypothetical structures",
  "Gerunds and infinitives",
  "Inversion in English",
  "Time and condition adverb clauses",
  "Conjunctions and linking expressions",
  "Prepositions and Collocations",
  "Common communication functions",
  "Sentence transformation",
  "Grammar error correction",
  "Vocabulary: Technology",
  "Vocabulary: Environment",
  "Vocabulary: Education",
  "Vocabulary: Health",
  "Vocabulary: Travel",
  "Vocabulary: Culture and festivals",
  "Vocabulary: Careers",
  "Reading for main ideas",
  "Reading for inference",
  "Word stress for exam items",
  "Pronunciation of -ed and -s endings",
  "Confusing vowel sounds",
  "Mixed grammar review",
  "Grammar test strategies",
  "Reading test strategies",
];

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function getState() {
  const s = loadState();
  const neverAskChoice = s?.neverAskChoice === "custom" || s?.neverAskChoice === "auto" ? s.neverAskChoice : null;
  const resolvedEnabled =
    typeof s?.enabled === "boolean"
      ? s.enabled
      : neverAskChoice === "custom"
        ? false
        : neverAskChoice === "auto"
          ? true
          : false;
  return {
    enabled: resolvedEnabled,
    counts: {
      slides: Number.isFinite(Number(s?.counts?.slides)) ? Math.max(5, Number(s.counts.slides)) : DEFAULT_COUNTS.slides,
      quiz: Number.isFinite(Number(s?.counts?.quiz)) ? Math.max(5, Number(s.counts.quiz)) : DEFAULT_COUNTS.quiz,
      flash: Number.isFinite(Number(s?.counts?.flash)) ? Math.max(5, Number(s.counts.flash)) : DEFAULT_COUNTS.flash,
    },
    usedTopics: Array.isArray(s?.usedTopics) ? s.usedTopics.filter((t) => typeof t === "string") : [],
    neverAskChoice,
    neverAskCount: Boolean(s?.neverAskCount),
    seenCustomHint: Boolean(s?.seenCustomHint),
  };
}

export function isEnabled() {
  return getState().enabled;
}

export function enable() {
  saveState({ ...getState(), enabled: true });
}

export function disable() {
  saveState({ ...getState(), enabled: false });
}

/** Toggles enabled state. Returns new enabled value. */
export function toggle() {
  const state = getState();
  const next = !state.enabled;
  saveState({ ...state, enabled: next });
  return next;
}

export function getCounts() {
  return getState().counts;
}

export function saveCounts(counts) {
  const state = getState();
  saveState({
    ...state,
    counts: {
      slides: Number.isFinite(Number(counts?.slides)) ? Math.max(5, Math.min(20, Math.floor(Number(counts.slides)))) : DEFAULT_COUNTS.slides,
      quiz: Number.isFinite(Number(counts?.quiz)) ? Math.max(5, Math.min(20, Math.floor(Number(counts.quiz)))) : DEFAULT_COUNTS.quiz,
      flash: Number.isFinite(Number(counts?.flash)) ? Math.max(5, Math.min(20, Math.floor(Number(counts.flash)))) : DEFAULT_COUNTS.flash,
    },
  });
}

/**
 * Returns the saved "never ask again" choice for the mode popup, or null if not set.
 * @returns {"custom"|"auto"|null}
 */
export function getNeverAskChoice() {
  return getState().neverAskChoice;
}

/**
 * Saves the user's mode choice so the mode popup is never shown again.
 * @param {"custom"|"auto"} choice
 */
export function setNeverAskChoice(choice) {
  saveState({ ...getState(), neverAskChoice: choice });
}

/**
 * Returns whether the count selector should be skipped (user ticked "Không hỏi lại").
 * @returns {boolean}
 */
export function getNeverAskCount() {
  return getState().neverAskCount;
}

/**
 * Saves the "never ask count" preference.
 * @param {boolean} value
 */
export function setNeverAskCount(value) {
  saveState({ ...getState(), neverAskCount: Boolean(value) });
}

/**
 * Returns true only the first time the user switches into Custom mode.
 * Subsequent calls return false.
 * @returns {boolean}
 */
export function consumeCustomHintFlag() {
  const state = getState();
  if (state.seenCustomHint) return false;
  saveState({ ...state, seenCustomHint: true });
  return true;
}

/**
 * Picks a random topic not recently used. Resets the used list when all topics exhausted.
 * @returns {string}
 */
export function pickNextTopic() {
  const state = getState();
  let usedTopics = [...state.usedTopics];
  const available = ALL_TOPICS.filter((t) => !usedTopics.includes(t));
  const pool = available.length > 0 ? available : ALL_TOPICS;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  if (available.length > 0) {
    usedTopics.push(picked);
  } else {
    usedTopics = [picked];
  }
  saveState({ ...state, usedTopics });
  return picked;
}

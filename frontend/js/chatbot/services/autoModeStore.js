const LS_KEY = "teachly_auto_mode_v1";

const SLIDE_THEMES = [
  "Chuyên nghiệp (đa sắc)",
  "Tối giản (Học thuật)",
  "Vui tươi (Thân thiện)",
  "Vũ trụ sáng (Trẻ trung)",
  "Vũ trụ tối (Huyền bí)",
  "Biển cả",
  "Comic",
];

/** Returns a random slide theme label. */
export function pickRandomTheme() {
  return SLIDE_THEMES[Math.floor(Math.random() * SLIDE_THEMES.length)];
}

export const DEFAULT_COUNTS = { slides: 15, quiz: 15, flash: 10 };

const ALL_TOPICS = [
  "Grammar - Present Perfect",
  "Grammar - Conditional Sentences",
  "Grammar - Passive Voice",
  "Grammar - Modal Verbs",
  "Grammar - Reported Speech",
  "Vocabulary - Technology",
  "Vocabulary - Environment",
  "Vocabulary - Education",
  "Vocabulary - Health & Medicine",
  "Vocabulary - Travel & Tourism",
  "Vocabulary - Food & Cooking",
  "Vocabulary - Business & Work",
  "Reading - Science & Technology",
  "Reading - Society & Culture",
  "Reading - Nature & Environment",
  "Reading - History & Civilization",
  "Reading - Sports & Recreation",
  "Pronunciation - Word Stress",
  "Pronunciation - Intonation Patterns",
  "Pronunciation - Connected Speech",
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
  return {
    enabled: Boolean(s?.enabled),
    counts: {
      slides: Number.isFinite(Number(s?.counts?.slides)) ? Math.max(5, Number(s.counts.slides)) : DEFAULT_COUNTS.slides,
      quiz: Number.isFinite(Number(s?.counts?.quiz)) ? Math.max(5, Number(s.counts.quiz)) : DEFAULT_COUNTS.quiz,
      flash: Number.isFinite(Number(s?.counts?.flash)) ? Math.max(5, Number(s.counts.flash)) : DEFAULT_COUNTS.flash,
    },
    usedTopics: Array.isArray(s?.usedTopics) ? s.usedTopics.filter((t) => typeof t === "string") : [],
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

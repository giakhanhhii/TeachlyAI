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

// Vietnamese topic names that match EXTRA_SLIDE_TOPIC_LIST in directSlidePresets.js
// so findDirectSlidePreset() can find a matching preset and use ordered chapter rendering.
const ALL_TOPICS = [
  "Hiện tại hoàn thành và hiện tại hoàn thành tiếp diễn",
  "Câu ước và giả định",
  "Gerund và Infinitive",
  "Cấu trúc đảo ngữ trong tiếng Anh",
  "Mệnh đề trạng ngữ chỉ thời gian và điều kiện",
  "Liên từ và cụm nối ý",
  "Prepositions and Collocations",
  "Chức năng giao tiếp thường gặp",
  "Viết lại câu đồng nghĩa",
  "Sửa lỗi sai ngữ pháp",
  "Từ vựng chủ đề Công nghệ",
  "Từ vựng chủ đề Môi trường",
  "Từ vựng chủ đề Giáo dục",
  "Từ vựng chủ đề Sức khỏe",
  "Từ vựng chủ đề Du lịch",
  "Từ vựng chủ đề Văn hóa và lễ hội",
  "Từ vựng chủ đề Nghề nghiệp",
  "Kỹ năng đọc tìm ý chính",
  "Kỹ năng đọc suy luận",
  "Word Stress trong đề THPT",
  "Phát âm đuôi -ed và -s/-es",
  "Nguyên âm dễ nhầm lẫn",
  "Mixed Grammar Review cho THPTQG",
  "Chiến lược làm bài ngữ pháp",
  "Chiến lược làm bài đọc hiểu",
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

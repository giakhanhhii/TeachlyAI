import { DIRECT_QUIZ_AUTOFILL_SAMPLES } from "./directQuizPresets.js";
import { DIRECT_SLIDE_AUTOFILL_SAMPLES } from "./directSlidePresets.js";
import { DIRECT_FLASH_AUTOFILL_SAMPLES } from "./directFlashPresets.js";
import { SLIDE_TEMPLATE_OPTIONS } from "./slideTemplateOptions.js";

const FULLSET_COUNT_PRESETS = [
  { s: "10", q: "20", f: "10" },
  { s: "15", q: "15", f: "10" },
  { s: "10", q: "15", f: "15" },
  { s: "20", q: "10", f: "10" },
  { s: "12", q: "18", f: "10" },
  { s: "10", q: "20", f: "10" },
  { s: "15", q: "10", f: "15" },
];

const FULLSET_LEVEL_PRESETS = ["Khá", "Cơ bản", "Nâng cao", "Khá", "Khá", "Cơ bản", "Nâng cao"];

const SAMPLES_FULLSET = DIRECT_SLIDE_AUTOFILL_SAMPLES.slice(0, 40).map((sample, i) => ({
  t: sample.t,
  l: FULLSET_LEVEL_PRESETS[i % FULLSET_LEVEL_PRESETS.length],
  m: SLIDE_TEMPLATE_OPTIONS[i % SLIDE_TEMPLATE_OPTIONS.length],
  ...FULLSET_COUNT_PRESETS[i % FULLSET_COUNT_PRESETS.length],
  e: "",
}));

const SAMPLES_SLIDE = DIRECT_SLIDE_AUTOFILL_SAMPLES.slice();
const SAMPLES_QUIZ = DIRECT_QUIZ_AUTOFILL_SAMPLES.slice();
const SAMPLES_FLASH = DIRECT_FLASH_AUTOFILL_SAMPLES.slice();

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Number of mock samples per type — autofill uses AI once counter reaches these. */
export const AUTOFILL_MOCK_LENGTHS = {
  slide: SAMPLES_SLIDE.length,
  quiz: SAMPLES_QUIZ.length,
  flash: SAMPLES_FLASH.length,
  fullset: SAMPLES_FULLSET.length,
};

// ── Persistent autofill state (localStorage) ────────────────────────────────
const _LS_POS = "teachly_af_pos_";
const _LS_ORD = "teachly_af_ord_";

function _loadPos(type) {
  try {
    const v = parseInt(localStorage.getItem(_LS_POS + type) || "0", 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch { return 0; }
}

function _savePos(type, pos) {
  try { localStorage.setItem(_LS_POS + type, String(pos)); } catch {}
}

function _loadOrder(type, len) {
  try {
    const raw = localStorage.getItem(_LS_ORD + type);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length !== len) return null;
    if (!arr.every((v) => Number.isInteger(v) && v >= 0 && v < len)) return null;
    return arr;
  } catch { return null; }
}

function _saveOrder(type, order) {
  try { localStorage.setItem(_LS_ORD + type, JSON.stringify(order)); } catch {}
}

function _samplesOf(type) {
  if (type === "slide") return SAMPLES_SLIDE;
  if (type === "quiz") return SAMPLES_QUIZ;
  if (type === "flash") return SAMPLES_FLASH;
  return SAMPLES_FULLSET;
}

const _orders = /** @type {Record<string, number[]>} */ ({});
const _positions = /** @type {Record<string, number>} */ ({});

["slide", "quiz", "flash", "fullset"].forEach((type) => {
  const samples = _samplesOf(type);
  const stored = _loadOrder(type, samples.length);
  if (stored) {
    _orders[type] = stored;
  } else {
    const order = samples.map((_, i) => i);
    shuffle(order);
    _saveOrder(type, order);
    _orders[type] = order;
  }
  _positions[type] = Math.min(_loadPos(type), samples.length);
});

/** Current position in the persistent autofill sequence for a type. */
export function getMockPos(type) { return _positions[type] ?? 0; }

/**
 * Advance the persistent autofill sequence by one and return the next mock sample.
 * Returns null when all mock samples for this type have been used → caller should use AI.
 */
export function consumeNextMock(type) {
  const samples = _samplesOf(type);
  const pos = _positions[type] ?? 0;
  if (pos >= samples.length) return null;
  const sample = samples[_orders[type][pos]];
  _positions[type] = pos + 1;
  _savePos(type, pos + 1);
  return sample;
}

/**
 * Return any mock sample at the current position (wrapping) without advancing.
 * Used as AI-fallback filler when fetchAiAutofillTopic throws.
 */
export function getAnyMock(type) {
  const samples = _samplesOf(type);
  const order = _orders[type];
  const pos = (_positions[type] ?? 0) % samples.length;
  return samples[order[pos]];
}

/** Reset autofill position and re-shuffle order for all types (called by Reset button). */
export function resetAutofillState() {
  ["slide", "quiz", "flash", "fullset"].forEach((type) => {
    const samples = _samplesOf(type);
    const order = samples.map((_, i) => i);
    shuffle(order);
    _saveOrder(type, order);
    _orders[type] = order;
    _positions[type] = 0;
    _savePos(type, 0);
  });
}

/** @deprecated Shuffling is now handled by the persistent order — this is a no-op. */
export function reshuffleType(_type) {}

export { SAMPLES_FULLSET, SAMPLES_SLIDE, SAMPLES_QUIZ, SAMPLES_FLASH };

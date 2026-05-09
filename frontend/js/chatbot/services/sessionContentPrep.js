/**
 * Chuẩn hóa pool mock: xáo trộn, loại trùng theo khóa, cắt đúng số lượng phiên.
 */
import { filterFlashCardsWithinLimit } from "./flashCardLimits.js";
import { findDirectQuizPreset } from "../data/directQuizPresets.js";
import { findDirectFlashPreset } from "../data/directFlashPresets.js";
import { findDirectSlidePreset } from "../data/directSlidePresets.js";

/**
 * @param {number} min
 * @param {number} max
 */
export function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Fisher–Yates, in-place.
 * @template T
 * @param {T[]} arr
 */
export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/**
 * @param {string | undefined} raw
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
export function parseCountInRange(raw, min, max, fallback) {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * @param {string | undefined} raw
 * @param {number} total
 */
export function parseSessionOffset(raw, total) {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isFinite(n) || n < 0 || total <= 0) return 0;
  return Math.floor(n) >= total ? 0 : Math.floor(n);
}

/**
 * @template T
 * @param {T[]} pool
 * @param {number} want
 * @param {string | undefined} rawOffset
 */
export function pickSequentialWindow(pool, want, rawOffset) {
  const safePool = Array.isArray(pool) ? pool : [];
  const total = safePool.length;
  const offsetStart = parseSessionOffset(rawOffset, total);
  const safeWant = Math.max(0, Math.floor(Number(want) || 0));
  const end = Math.min(total, offsetStart + safeWant);
  const items = safePool.slice(offsetStart, end);
  return {
    items,
    offsetStart,
    nextOffset: end >= total ? 0 : end,
    poolSize: total,
    hasMore: end < total,
  };
}

/**
 * @param {string | undefined} raw
 */
function parseConsumedKeys(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return new Set();
  try {
    const parsed = JSON.parse(text);
    return new Set(Array.isArray(parsed) ? parsed.map((item) => String(item)) : []);
  } catch {
    return new Set();
  }
}

/**
 * @template T
 * @param {T[]} pool
 * @param {(item: T) => string} keyFn
 * @param {Set<string>} consumed
 */
function filterPoolByConsumed(pool, keyFn, consumed) {
  return pool.filter((item) => {
    const key = keyFn(item);
    return key && !consumed.has(key);
  });
}

/**
 * @template T
 * @param {T[]} pool
 * @param {T[]} pickedItems
 * @param {(item: T) => string} keyFn
 * @param {Set<string>} consumed
 */
function buildNextConsumedKeysJson(pool, pickedItems, keyFn, consumed) {
  const merged = new Set(consumed);
  pickedItems.forEach((item) => {
    const key = keyFn(item);
    if (key) merged.add(key);
  });
  const totalUnique = new Set(pool.map((item) => keyFn(item)).filter(Boolean)).size;
  if (!totalUnique || merged.size >= totalUnique) return "";
  return JSON.stringify([...merged]);
}

/**
 * @template T
 * @param {T[]} pool
 * @param {(item: T) => string} keyFn
 * @param {number} want
 * @returns {T[]}
 */
export function pickUniqueShuffled(pool, keyFn, want) {
  const copy = pool.slice();
  shuffleInPlace(copy);
  const seen = new Set();
  const out = [];
  for (const item of copy) {
    const k = keyFn(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= want) break;
  }
  return out;
}

/** @param {any} q */
export function quizDedupeKey(q) {
  const id = String(q?.id || "").trim();
  if (id) return `id:${id}`;
  const t = String(q?.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return t ? `t:${t.slice(0, 240)}` : "";
}

/** @param {any} c */
export function flashDedupeKey(c) {
  const id = String(c?.id || "").trim();
  if (id) return `id:${id}`;
  const f = String(c?.front || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return f ? `f:${f}` : "";
}

/** @param {any} s */
export function slideDedupeKey(s) {
  const id = String(s?.id || "").trim();
  if (id) return `id:${id}`;
  const t = String(s?.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const b0 = Array.isArray(s?.bullets) ? String(s.bullets[0] || "") : "";
  return t ? `t:${t}#${b0.slice(0, 100)}` : "";
}

/** @param {any} s */
function isLikelyEndingSlide(s) {
  const title = String(s?.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!title) return false;
  return /(tổng kết|tong ket|tạm biệt|tam biet|summary|goodbye|conclusion|mission complete|you'?re ready|sẵn sàng|loi chuc|lời chúc|động lực|dong luc|checklist trước ngày thi|final review checklist)/i.test(
    title,
  );
}

/** @param {any} s */
function endingSlideScore(s) {
  const title = String(s?.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!title) return 0;
  if (/(tổng kết|tong ket|summary|conclusion|tạm biệt|tam biet|goodbye|mission complete)/i.test(title)) return 4;
  if (/(lời chúc|loi chuc|động lực|dong luc|you'?re ready|sẵn sàng)/i.test(title)) return 3;
  if (/(checklist trước ngày thi|final review checklist)/i.test(title)) return 2;
  return isLikelyEndingSlide(s) ? 1 : 0;
}

/**
 * @param {any[]} pool
 * @returns {any | null}
 */
function pickPreferredEndingSlide(pool) {
  const ranked = pool
    .filter(isLikelyEndingSlide)
    .map((slide) => ({ slide, score: endingSlideScore(slide) }))
    .sort((a, b) => b.score - a.score);
  return ranked.length ? ranked[0].slide : null;
}

/** @param {any} slide */
function slideVisualFingerprint(slide) {
  const title = String(slide?.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const firstBullet = (Array.isArray(slide?.bullets) ? slide.bullets : [])
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" | ")
    .toLowerCase();
  return `${title}#${firstBullet}`;
}

/** @param {any[]} selected
 * @param {any[]} fullPool */
function replaceDuplicateOpeningSlide(selected, fullPool) {
  if (!Array.isArray(selected) || selected.length < 2) return selected;
  const [first, second] = selected;
  if (!first || !second) return selected;
  if (slideVisualFingerprint(first) !== slideVisualFingerprint(second)) return selected;

  const usedKeys = new Set(selected.map((slide) => slideDedupeKey(slide)).filter(Boolean));
  const secondIdx = fullPool.indexOf(second);
  const pickNext = (start) => {
    for (let i = Math.max(0, start); i < fullPool.length; i += 1) {
      const candidate = fullPool[i];
      const key = slideDedupeKey(candidate);
      if (key && usedKeys.has(key)) continue;
      if (slideVisualFingerprint(candidate) === slideVisualFingerprint(second)) continue;
      return candidate;
    }
    return null;
  };

  const replacement = pickNext(secondIdx + 1) || pickNext(0);
  if (!replacement) return selected.slice(1);
  return [...selected.slice(1), replacement];
}
/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareQuizSessionData(data, meta) {
  const want = parseCountInRange(meta?.count, 1, 500, 10);
  const directPreset = findDirectQuizPreset(meta);
  if (directPreset) {
    const consumed = parseConsumedKeys(meta?.__consumedKeysJson);
    const presetDefault = Array.isArray(directPreset.defaultQuestions) ? directPreset.defaultQuestions : [];
    const fullPool = Array.isArray(directPreset.questions) ? directPreset.questions : [];
    const remainingPool = filterPoolByConsumed(fullPool, quizDedupeKey, consumed);
    const questions =
      presetDefault.length && want <= presetDefault.length && consumed.size === 0
        ? presetDefault.slice(0, want)
        : remainingPool.slice(0, want);
    const nextConsumedKeysJson = buildNextConsumedKeysJson(fullPool, questions, quizDedupeKey, consumed);
    const uniquePoolSize = new Set(fullPool.map((item) => quizDedupeKey(item)).filter(Boolean)).size;
    return {
      title: `Quiz THPTQG 2026 — ${directPreset.source}`,
      questions,
      sessionMeta: {
        ...meta,
        __offset: "0",
        __offsetStart: "0",
        __poolSize: String(uniquePoolSize),
        __hasMore: nextConsumedKeysJson ? "1" : "0",
        __consumedKeysJson: nextConsumedKeysJson,
      },
    };
  }
  const pool = Array.isArray(data?.questions) ? data.questions : [];
  const questions = pickUniqueShuffled(pool, quizDedupeKey, want);
  return {
    ...data,
    questions,
    sessionMeta: {
      ...meta,
      __offset: "0",
      __offsetStart: "0",
      __poolSize: String(questions.length),
      __hasMore: "0",
    },
  };
}

/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareFlashSessionData(data, meta) {
  const directRaw = meta && typeof meta.__directCardsJson === "string" ? meta.__directCardsJson.trim() : "";
  if (directRaw) {
    try {
      const parsed = JSON.parse(directRaw);
      if (Array.isArray(parsed) && parsed.length) {
        const direct = filterFlashCardsWithinLimit(
          parsed
          .map((c) => ({
            front: String(c?.front ?? "").trim(),
            back: String(c?.back ?? "").trim(),
          }))
          .filter((c) => c.front && c.back),
        );
        if (direct.length) {
          const want = parseCountInRange(meta?.count, 1, 500, direct.length);
          const consumed = parseConsumedKeys(meta?.__consumedKeysJson);
          const remainingPool = filterPoolByConsumed(direct, flashDedupeKey, consumed);
          const cards = remainingPool.slice(0, want);
          const nextConsumedKeysJson = buildNextConsumedKeysJson(direct, cards, flashDedupeKey, consumed);
          const uniquePoolSize = new Set(direct.map((item) => flashDedupeKey(item)).filter(Boolean)).size;
          return {
            ...data,
            title: `Flashcard — từ nhập tay (${direct.length} thẻ)`,
            cards,
            sessionMeta: {
              ...meta,
              __offset: "0",
              __offsetStart: "0",
              __poolSize: String(uniquePoolSize),
              __hasMore: nextConsumedKeysJson ? "1" : "0",
              __consumedKeysJson: nextConsumedKeysJson,
            },
          };
        }
      }
    } catch {
      // fall through to mock pool
    }
  }

  const directPreset = findDirectFlashPreset(meta);
  if (directPreset) {
    const want = parseCountInRange(meta?.count, 1, 40, 20);
    const consumed = parseConsumedKeys(meta?.__consumedKeysJson);
    const presetDefault = Array.isArray(directPreset.defaultCards) ? directPreset.defaultCards : [];
    const fullPool = Array.isArray(directPreset.cards) ? directPreset.cards : [];
    const remainingPool = filterPoolByConsumed(fullPool, flashDedupeKey, consumed);
    const cards =
      presetDefault.length && want <= presetDefault.length && consumed.size === 0
        ? presetDefault.slice(0, want)
        : remainingPool.slice(0, want);
    const nextConsumedKeysJson = buildNextConsumedKeysJson(fullPool, cards, flashDedupeKey, consumed);
    const uniquePoolSize = new Set(fullPool.map((item) => flashDedupeKey(item)).filter(Boolean)).size;
    return {
      ...data,
      title: `Flashcard — ${directPreset.topic}`,
      cards,
      sessionMeta: {
        ...meta,
        __offset: "0",
        __offsetStart: "0",
        __poolSize: String(uniquePoolSize),
        __hasMore: nextConsumedKeysJson ? "1" : "0",
        __consumedKeysJson: nextConsumedKeysJson,
      },
    };
  }

  const want = parseCountInRange(meta?.count, 1, 500, 20);
  const pool = filterFlashCardsWithinLimit(Array.isArray(data?.cards) ? data.cards : []);
  const cards = pickUniqueShuffled(pool, flashDedupeKey, want);
  return {
    ...data,
    cards,
    sessionMeta: {
      ...meta,
      __offset: "0",
      __offsetStart: "0",
      __poolSize: String(cards.length),
      __hasMore: "0",
    },
  };
}

/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareSlideSessionData(data, meta) {
  const want = parseCountInRange(meta?.count, 1, 30, 10);
  const directPreset = findDirectSlidePreset(meta);
  if (directPreset) {
    const consumed = parseConsumedKeys(meta?.__consumedKeysJson);
    const presetDefault = Array.isArray(directPreset.defaultSlides) ? directPreset.defaultSlides : [];
    const fullPool = Array.isArray(directPreset.slides) ? directPreset.slides : [];
    const remainingPool = filterPoolByConsumed(fullPool, slideDedupeKey, consumed);
    const selected =
      presetDefault.length && want <= presetDefault.length && consumed.size === 0
        ? presetDefault.slice(0, want)
        : remainingPool.slice(0, want);
    const slides = consumed.size === 0 ? replaceDuplicateOpeningSlide(selected, fullPool) : selected;
    const nextConsumedKeysJson = buildNextConsumedKeysJson(fullPool, slides, slideDedupeKey, consumed);
    const uniquePoolSize = new Set(fullPool.map((item) => slideDedupeKey(item)).filter(Boolean)).size;
    return {
      title: `Slide bài giảng — ${directPreset.topic}`,
      slides,
      sessionMeta: {
        ...meta,
        __offset: "0",
        __offsetStart: "0",
        __poolSize: String(uniquePoolSize),
        __hasMore: nextConsumedKeysJson ? "1" : "0",
        __consumedKeysJson: nextConsumedKeysJson,
      },
    };
  }
  const pool = Array.isArray(data?.slides) ? data.slides : [];
  const preferredEnding = pickPreferredEndingSlide(pool);
  const endingSlide = preferredEnding || pool[pool.length - 1] || null;
  const contentPool = pool.filter((slide) => !isLikelyEndingSlide(slide));
  const bodySlides = pickUniqueShuffled(contentPool, slideDedupeKey, Math.max(0, want - 1));
  const slides = want <= 1 ? (endingSlide ? [endingSlide] : []) : endingSlide ? [...bodySlides, endingSlide] : bodySlides;
  return {
    ...data,
    slides,
    sessionMeta: {
      ...meta,
      __offset: "0",
      __offsetStart: "0",
      __poolSize: String(slides.length),
      __hasMore: "0",
    },
  };
}

/**
 * Chuẩn hóa pool mock: xáo trộn, loại trùng theo khóa, cắt đúng số lượng phiên.
 */
import { filterFlashCardsWithinLimit } from "./flashCardLimits.js";

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

/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareQuizSessionData(data, meta) {
  const want = parseCountInRange(meta?.count, 1, 500, 10);
  const pool = Array.isArray(data?.questions) ? data.questions : [];
  const questions = pickUniqueShuffled(pool, quizDedupeKey, want);
  return { ...data, questions };
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
          return {
            ...data,
            title: `Flashcard — từ nhập tay (${direct.length} thẻ)`,
            cards: direct.slice(0, want),
          };
        }
      }
    } catch {
      // fall through to mock pool
    }
  }

  const want = parseCountInRange(meta?.count, 1, 500, 20);
  const pool = filterFlashCardsWithinLimit(Array.isArray(data?.cards) ? data.cards : []);
  const cards = pickUniqueShuffled(pool, flashDedupeKey, want);
  return { ...data, cards };
}

/** @param {any} data
 * @param {Record<string, string>} meta */
export function prepareSlideSessionData(data, meta) {
  const want = parseCountInRange(meta?.count, 1, 30, 10);
  const pool = Array.isArray(data?.slides) ? data.slides : [];
  const preferredEnding = pickPreferredEndingSlide(pool);
  const endingSlide = preferredEnding || pool[pool.length - 1] || null;
  const contentPool = pool.filter((slide) => !isLikelyEndingSlide(slide));
  const bodySlides = pickUniqueShuffled(contentPool, slideDedupeKey, Math.max(0, want - 1));
  const slides = want <= 1 ? (endingSlide ? [endingSlide] : []) : endingSlide ? [...bodySlides, endingSlide] : bodySlides;
  return { ...data, slides };
}

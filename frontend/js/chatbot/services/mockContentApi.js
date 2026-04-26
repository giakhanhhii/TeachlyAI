import { getApiOrigin } from "../config.js";
import { EMBEDDED_QUIZ, EMBEDDED_FLASHCARD, EMBEDDED_SLIDE } from "./embeddedMockBundles.js";
import { EMBEDDED_THPTQG_FULLTEST } from "./embeddedThptqgFullTestBundle.js";

/** @typedef {'quiz' | 'flashcard' | 'slide' | 'thptqg_fulltest'} MockResource */

/** Dùng khi không gọi được API (file:// hoặc server chưa bật) — đồng bộ pool với backend/mock. */
export const FALLBACK_QUIZ = EMBEDDED_QUIZ;
export const FALLBACK_FLASHCARD = EMBEDDED_FLASHCARD;
export const FALLBACK_SLIDE = EMBEDDED_SLIDE;
export const FALLBACK_THPTQG_FULLTEST = EMBEDDED_THPTQG_FULLTEST;

function cloneFallback(input) {
  try {
    return structuredClone(input);
  } catch {
    return JSON.parse(JSON.stringify(input));
  }
}

/**
 * @param {MockResource} name
 * @returns {Promise<any>}
 */
export async function fetchMockResource(name) {
  try {
    const url = `${getApiOrigin()}/api/mock/${name}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    if (name === "quiz") return cloneFallback(FALLBACK_QUIZ);
    if (name === "flashcard") return cloneFallback(FALLBACK_FLASHCARD);
    if (name === "slide") return cloneFallback(FALLBACK_SLIDE);
    if (name === "thptqg_fulltest") return cloneFallback(FALLBACK_THPTQG_FULLTEST);
    throw new Error(`Unknown mock: ${name}`);
  }
}

/**
 * AI content generation service.
 *
 * Tracks how many times each content type has been played via localStorage.
 * Once a type's play count reaches AI_THRESHOLD, all subsequent fetches use
 * GPT-4o Mini via /api/ai-generate instead of the fixed mock bundles.
 *
 * For fullset, all three content types share the same AI-generated topic,
 * ensuring slide + quiz + flashcard are topically consistent.
 */

import { getApiOrigin } from "../config.js";

/** @typedef {"slide"|"quiz"|"flash"|"fullset"} ContentType */

/** Number of plays before AI generation activates for a content type. */
export const AI_THRESHOLD = 3;

export const STORAGE_KEY = "teachly_play_counts";

/**
 * @returns {{ slide: number, quiz: number, flash: number, fullset: number }}
 */
export function getPlayCounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        slide: Number(parsed.slide) || 0,
        quiz: Number(parsed.quiz) || 0,
        flash: Number(parsed.flash) || 0,
        fullset: Number(parsed.fullset) || 0,
      };
    }
  } catch {
    // ignore parse errors
  }
  return { slide: 0, quiz: 0, flash: 0, fullset: 0 };
}

/**
 * @param {{ slide: number, quiz: number, flash: number, fullset: number }} counts
 */
function savePlayCounts(counts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}

/**
 * Increment the play count for a content type.
 * @param {ContentType} type
 */
export function incrementPlayCount(type) {
  const counts = getPlayCounts();
  if (type in counts) {
    counts[/** @type {keyof typeof counts} */ (type)] += 1;
    savePlayCounts(counts);
  }
}

/**
 * Immediately mark a content type as exhausted (skip remaining mock plays).
 * Called when prepareXxxSessionData returns __hasMore === "0" for a preset session.
 * @param {ContentType} type
 */
export function markTypeExhausted(type) {
  const counts = getPlayCounts();
  if (type in counts) {
    counts[/** @type {keyof typeof counts} */ (type)] = AI_THRESHOLD;
    savePlayCounts(counts);
  }
}

/**
 * Returns true when the play count for a type has reached the threshold,
 * meaning all subsequent content should come from the AI generator.
 * @param {ContentType} type
 * @returns {boolean}
 */
export function isAiModeActive(type) {
  const counts = getPlayCounts();
  const count = counts[/** @type {keyof typeof counts} */ (type)] ?? 0;
  return count >= AI_THRESHOLD;
}

/**
 * Fetch AI-generated content for a single content type.
 * @param {"slide"|"quiz"|"flashcard"} type
 * @param {string} [topic] - topic from the form; if provided the AI generates content about it
 * @returns {Promise<any>}
 */
export async function fetchAiContent(type, topic) {
  const url = `${getApiOrigin()}/api/ai-generate`;
  const payload = topic ? { type, topic } : { type };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.detail || "";
    } catch {
      // ignore
    }
    throw new Error(`AI generate (${type}) failed ${res.status}${detail ? ": " + detail : ""}`);
  }
  return res.json();
}

/**
 * Fetch AI-generated form autofill data for a content type.
 * Returns lightweight form field values (topic, count, etc.) — not full content.
 * @param {"slide"|"quiz"|"flash"|"fullset"} type
 * @param {string[]} [recent] - recently generated topics to avoid repeating
 * @returns {Promise<any>}
 */
export async function fetchAiAutofillTopic(type, recent = []) {
  const url = `${getApiOrigin()}/api/ai-autofill`;
  const payload = recent.length ? { type, recent } : { type };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.detail || "";
    } catch {
      // ignore
    }
    throw new Error(`AI autofill (${type}) failed ${res.status}${detail ? ": " + detail : ""}`);
  }
  return res.json();
}

/**
 * Upload a file (PDF/DOCX/MD/TXT), extract to Markdown, and generate content via AI.
 * Backend enforces format + page-limit validation and returns Vietnamese error messages.
 * @param {"slide"|"quiz"|"flashcard"|"fullset"} type
 * @param {File} file
 * @param {{ count?: number, notes?: string }} [opts]
 * @returns {Promise<any>}
 */
export async function fetchAiFileContent(type, file, opts = {}) {
  const url = `${getApiOrigin()}/api/file-upload`;
  const fd = new FormData();
  fd.append("type", type);
  fd.append("file", file);
  if (opts.count != null) fd.append("count", String(opts.count));
  if (opts.notes) fd.append("notes", opts.notes);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.detail || "";
    } catch {
      // ignore
    }
    throw new Error(detail || `File upload (${type}) thất bại (${res.status}).`);
  }
  return res.json();
}

/**
 * Fetch AI-generated fullset content (slide + quiz + flashcard, same topic).
 * @param {string} [topic] - topic from the form; if provided all three types share it
 * @returns {Promise<{ slide: any, quiz: any, flashcard: any, topic: string }>}
 */
export async function fetchAiFullsetContent(topic) {
  const url = `${getApiOrigin()}/api/ai-generate`;
  const payload = topic ? { type: "fullset", topic } : { type: "fullset" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.detail || "";
    } catch {
      // ignore
    }
    throw new Error(`AI generate (fullset) failed ${res.status}${detail ? ": " + detail : ""}`);
  }
  return res.json();
}

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

export class AiContentApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, detail?: string }} [opts]
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = "AiContentApiError";
    this.status = Number(opts.status) || 0;
    this.detail = String(opts.detail || "");
  }
}

async function readApiErrorDetail(res) {
  try {
    const err = await res.json();
    return String(err?.detail || "").trim();
  } catch {
    return "";
  }
}

function buildAiApiError(defaultMessage, status, detail) {
  return new AiContentApiError(detail || defaultMessage, { status, detail });
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function shouldFallbackToMockAiError(err) {
  return Number(err && typeof err === "object" ? err.status : 0) !== 403;
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {() => Promise<T>} fallbackFactory
 * @returns {Promise<T>}
 */
export async function withMockFallbackOnAiError(promise, fallbackFactory) {
  try {
    return await promise;
  } catch (err) {
    if (!shouldFallbackToMockAiError(err)) throw err;
    return fallbackFactory();
  }
}

function serializeAiForm(form) {
  if (!form || typeof form !== "object") return undefined;
  const canCheckFile = typeof File !== "undefined";
  return Object.fromEntries(
    Object.entries(form).filter(([, value]) => !(canCheckFile && value instanceof File)),
  );
}

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
 * @param {Record<string, any>} [form] - extra form fields to guide generation
 * @returns {Promise<any>}
 */
export async function fetchAiContent(type, topic, form) {
  const url = `${getApiOrigin()}/api/ai-generate`;
  const payload = { type };
  if (topic) payload.topic = topic;
  const serializedForm = serializeAiForm(form);
  if (serializedForm) payload.form = serializedForm;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await readApiErrorDetail(res);
    throw buildAiApiError(`AI generate (${type}) failed ${res.status}.`, res.status, detail);
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
    const detail = await readApiErrorDetail(res);
    throw buildAiApiError(`AI autofill (${type}) failed ${res.status}.`, res.status, detail);
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
    const detail = await readApiErrorDetail(res);
    throw buildAiApiError(`File upload (${type}) thất bại (${res.status}).`, res.status, detail);
  }
  return res.json();
}

/**
 * Fetch AI-generated fullset content (slide + quiz + flashcard, same topic).
 * @param {string} [topic] - topic from the form; if provided all three types share it
 * @param {Record<string, any>} [form] - extra form fields to guide generation
 * @returns {Promise<{ slide: any, quiz: any, flashcard: any, topic: string }>}
 */
export async function fetchAiFullsetContent(topic, form) {
  const url = `${getApiOrigin()}/api/ai-generate`;
  const payload = { type: "fullset" };
  if (topic) payload.topic = topic;
  const serializedForm = serializeAiForm(form);
  if (serializedForm) payload.form = serializedForm;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await readApiErrorDetail(res);
    throw buildAiApiError(`AI generate (fullset) failed ${res.status}.`, res.status, detail);
  }
  return res.json();
}

/** Fetch AI topic recommendations based on dwell-time history.
 * @param {Array} history
 * @param {string} [kind] — if provided, all recommendations will be of this kind
 */
export async function fetchRecommendations(history, kind) {
  const url = `${getApiOrigin()}/api/recommend-topics`;
  const body = kind ? { history, kind } : { history };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Recommend failed ${res.status}`);
  return res.json();
}

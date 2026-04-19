import { getApiOrigin } from "../config.js";

const BATCH_MAX_ATTEMPTS = 2;
const BATCH_RETRY_BASE_MS = 100;

const SINGLE_MAX_ATTEMPTS = 2;
const SINGLE_RETRY_BASE_MS = 120;

/**
 * @param {string[]} terms
 * @returns {Promise<Record<string, string>>}
 */
async function fetchFlashTermsTranslationBatchOnce(terms) {
  const res = await fetch(`${getApiOrigin()}/api/flash/translate-terms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms }),
  });
  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(
      typeof data.detail === "string" ? data.detail : rawText || res.statusText || "Lỗi dịch lô",
    );
    /** @type {any} */ (err).status = res.status;
    throw err;
  }
  const tr = data.translations;
  return tr && typeof tr === "object" ? /** @type {Record<string, string>} */ ({ ...tr }) : {};
}

/**
 * Một request dịch nhiều từ (backend gom lô → ít lần gọi LLM hơn).
 * @param {string[]} terms
 * @returns {Promise<Record<string, string>>} khóa = term gốc, giá trị = nghĩa (chỉ mục dịch được)
 */
export async function fetchFlashTermsTranslationBatch(terms) {
  const unique = [...new Set(terms.map((t) => String(t || "").trim()).filter(Boolean))];
  if (!unique.length) return {};

  let lastErr = /** @type {unknown} */ (null);
  for (let attempt = 0; attempt < BATCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      const map = await fetchFlashTermsTranslationBatchOnce(unique);
      const out = /** @type {Record<string, string>} */ ({});
      for (const k of unique) {
        const v = String(map[k] || "").trim();
        if (v) out[k] = v;
      }
      if (Object.keys(out).length) return out;
      lastErr = new Error("Bản dịch lô rỗng");
    } catch (e) {
      lastErr = e;
      const st = /** @type {any} */ (e).status;
      if (st === 400 || st === 503) throw e;
    }
    if (attempt < BATCH_MAX_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, BATCH_RETRY_BASE_MS * 2 ** attempt));
    }
  }
  if (lastErr instanceof Error && /** @type {any} */ (lastErr).status) {
    throw lastErr;
  }
  return {};
}

/**
 * Một lần gọi API đơn (fallback / tương thích).
 * @param {string} term
 * @returns {Promise<string>}
 */
async function fetchFlashTermTranslationOnce(term) {
  const res = await fetch(`${getApiOrigin()}/api/flash/translate-term`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term }),
  });
  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(
      typeof data.detail === "string" ? data.detail : rawText || res.statusText || "Lỗi dịch",
    );
    /** @type {any} */ (err).status = res.status;
    throw err;
  }
  return String(data.translation || "").trim();
}

/**
 * @param {string} term
 * @returns {Promise<string>}
 */
export async function fetchFlashTermTranslation(term) {
  let lastErr = /** @type {unknown} */ (null);
  for (let attempt = 0; attempt < SINGLE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const tr = await fetchFlashTermTranslationOnce(term);
      if (tr) return tr;
      lastErr = new Error("Nghĩa rỗng");
    } catch (e) {
      lastErr = e;
      const st = /** @type {any} */ (e).status;
      if (st === 400 || st === 503) throw e;
    }
    if (attempt < SINGLE_MAX_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, SINGLE_RETRY_BASE_MS * 2 ** attempt));
    }
  }
  if (lastErr instanceof Error && /** @type {any} */ (lastErr).status) {
    throw lastErr;
  }
  return "";
}

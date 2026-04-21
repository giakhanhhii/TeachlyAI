import { lookupEnToVi } from "../../guidedFlow/flashVocabLookup.js";
import { isEnglishOnlyVocabLine } from "../../guidedFlow/flashVocabParse.js";
import {
  fetchFlashTermTranslation,
  fetchFlashTermsTranslationBatch,
} from "../../services/flashVocabTranslateApi.js";

const DEBOUNCE_MS = 75;

const BACKEND_HINT =
  "Không gọi được API dịch từ vựng. (1) Chạy backend: python run_teachly.py hoặc uvicorn src.api_server:app —host 127.0.0.1 —port 8000 — (2) Mở http://127.0.0.1:8000/chatbot_ui.html (hoặc meta teachly-api-base nếu dùng Live Server). (3) Điền OPENAI_API_KEY trong .env (dịch EN→VI 2–3 nghĩa ở thẻ này), rồi khởi động lại server.";

/**
 * @param {{
 *   apiBackByLine: Record<string, string>,
 *   getAutoTranslateEn: () => boolean,
 *   getTranslateDisabled: () => boolean,
 *   setTranslateDisabled: (v: boolean) => void,
 *   getLastServerHint: () => string,
 *   setLastServerHint: (s: string) => void,
 *   getShownBackendHint: () => boolean,
 *   setShownBackendHint: (v: boolean) => void,
 *   getRaw: () => string,
 *   onRefreshHighlight: () => void,
 *   errEl: HTMLElement,
 * }} p
 */
export function createFlashVocabOpenAiTranslate(p) {
  let debounceTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
  let runVersion = 0;
  const inFlightTerms = /** @type {Set<string>} */ (new Set());

  function cancel() {
    runVersion += 1;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  /**
   * @param {string} raw
   * @returns {string[]}
   */
  function collectTermsPending(raw) {
    const lines = String(raw).split(/\r?\n/);
    const need = /** @type {Set<string>} */ (new Set());
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.includes(":")) continue;
      if (!p.getAutoTranslateEn()) continue;
      if (lookupEnToVi(trimmed)) continue;
      if (!isEnglishOnlyVocabLine(trimmed)) continue;
      if (p.apiBackByLine[trimmed]) continue;
      if (inFlightTerms.has(trimmed)) continue;
      if (p.getTranslateDisabled()) continue;
      need.add(trimmed);
    }
    return [...need];
  }

  /**
   * @param {string} raw
   */
  async function flush(raw) {
    const terms = collectTermsPending(raw);
    if (!terms.length) return { changed: false, failCount: 0, total: 0, serverHint: "" };
    const myRun = runVersion;
    const isCurrent = () => myRun === runVersion && p.getAutoTranslateEn() && !p.getTranslateDisabled();
    terms.forEach((term) => inFlightTerms.add(term));
    let map = /** @type {Record<string, string>} */ ({});
    try {
      map = await fetchFlashTermsTranslationBatch(terms);
    } catch (e) {
      const msg = String(/** @type {any} */ (e).message || "").trim();
      if (msg) p.setLastServerHint(msg);
      const st = /** @type {any} */ (e).status;
      if (st === 503 || String(/** @type {any} */ (e).message || "").includes("OPENAI_API_KEY")) {
        p.setTranslateDisabled(true);
      }
      if (st !== 404) {
        terms.forEach((term) => inFlightTerms.delete(term));
        return {
          changed: false,
          failCount: terms.length,
          total: terms.length,
          serverHint: msg,
        };
      }
      map = {};
    }
    if (!isCurrent()) {
      terms.forEach((term) => inFlightTerms.delete(term));
      return { changed: false, failCount: 0, total: terms.length, serverHint: "" };
    }
    let changed = false;
    for (const term of terms) {
      const tr = String(map[term] || "").trim();
      if (tr && isCurrent()) {
        p.apiBackByLine[term] = tr;
        changed = true;
      }
    }
    const missing = terms.filter((t) => !String(p.apiBackByLine[t] || "").trim());
    if (missing.length > 0 && isCurrent()) {
      const settled = await Promise.allSettled(
        missing.map(async (term) => {
          const tr = await fetchFlashTermTranslation(term);
          return { term, tr: String(tr || "").trim() };
        }),
      );
      if (!isCurrent()) {
        terms.forEach((term) => inFlightTerms.delete(term));
        return { changed: false, failCount: 0, total: terms.length, serverHint: "" };
      }
      for (const s of settled) {
        if (s.status !== "fulfilled") {
          const reason = /** @type {any} */ (s.reason);
          if (reason?.status === 503) p.setTranslateDisabled(true);
          continue;
        }
        const { term, tr } = s.value;
        if (tr && isCurrent()) {
          p.apiBackByLine[term] = tr;
          changed = true;
        }
      }
    }
    const failCount = terms.filter((t) => !String(p.apiBackByLine[t] || "").trim()).length;
    if (failCount === 0) p.setLastServerHint("");
    terms.forEach((term) => inFlightTerms.delete(term));
    return { changed, failCount, total: terms.length, serverHint: p.getLastServerHint() };
  }

  function schedule() {
    if (!p.getAutoTranslateEn()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void (async () => {
        debounceTimer = null;
        const { changed, failCount, total, serverHint } = await flush(p.getRaw());
        if (!p.getAutoTranslateEn() || p.getTranslateDisabled()) return;
        if (changed) {
          p.onRefreshHighlight();
          p.errEl.style.display = "none";
        } else if (total > 0 && failCount === total) {
          const hint = String(serverHint || "").trim();
          if (hint) {
            p.errEl.textContent = hint;
            p.errEl.style.display = "block";
          } else if (!p.getShownBackendHint()) {
            p.setShownBackendHint(true);
            p.errEl.textContent = BACKEND_HINT;
            p.errEl.style.display = "block";
          }
        }
      })();
    }, DEBOUNCE_MS);
  }

  return { cancel, flush, schedule };
}

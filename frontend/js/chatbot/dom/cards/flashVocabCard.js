import {
  FLASH_VOCAB_TEXTAREA_PLACEHOLDER,
  getFlashVocabEditorLineHighlight,
  isEnglishOnlyVocabLine,
  parseDirectFlashVocabLines,
} from "../../guidedFlow/flashVocabParse.js";
import { lookupEnToVi } from "../../guidedFlow/flashVocabLookup.js";
import {
  fetchFlashTermTranslation,
  fetchFlashTermsTranslationBatch,
} from "../../services/flashVocabTranslateApi.js";
import { el, wrapField } from "./flowCardShared.js";

const MAX_PAIRS = 200;
const TRANSLATE_DEBOUNCE_MS = 75;

/**
 * Một luồng pre-wrap + span nối tiếp (có \\n giữa các dòng) để wrap khớp textarea — tránh từng dòng display:block gây lệch con trỏ.
 * @param {HTMLElement} inner
 * @param {string} raw
 * @param {Record<string, string>} apiBackByLine
 */
function renderHighlightLines(inner, raw, apiBackByLine) {
  inner.replaceChildren();
  const lines = String(raw).split(/\r?\n/);
  if (lines.length === 0) return;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const tier = getFlashVocabEditorLineHighlight(line.trim(), apiBackByLine);
    const span = document.createElement("span");
    if (tier === "reject") {
      span.className = "flow-vocab-seg--rejected";
    } else if (tier === "auto") {
      span.className = "flow-vocab-seg--auto";
    } else if (tier === "pending") {
      span.className = "flow-vocab-seg--auto-pending";
    }
    const nl = i < lines.length - 1 ? "\n" : "";
    span.textContent = (line.length ? line : "\u00a0") + nl;
    inner.appendChild(span);
  }
}

/**
 * @param {{ onSubmit: (p: Record<string, string>) => void }} deps
 */
export function createFlashVocabFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Nhập từ vựng trực tiếp"));

  /** Nghĩa từ API OpenAI (EN→2–3 nghĩa VI), khóa = dòng trim (tiếng Anh không có dấu :). */
  const apiBackByLine = /** @type {Record<string, string>} */ ({});
  let translateDisabled = false;
  let debounceTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
  let shownFlashTranslateBackendHint = false;
  /** Thông báo lỗi gần nhất từ API dịch — hiển thị thay vì gợi ý chung. */
  let lastServerHint = "";

  function cancelScheduledTranslate() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  const stack = el("div", "flow-vocab-editor-stack");
  const clip = el("div", "flow-vocab-highlight-clip");
  const inner = el("div", "flow-vocab-highlight-inner");
  clip.appendChild(inner);

  const ta = /** @type {HTMLTextAreaElement} */ (document.createElement("textarea"));
  ta.className = "flow-textarea flow-vocab-syntax-ta";
  ta.rows = 10;
  ta.placeholder = FLASH_VOCAB_TEXTAREA_PLACEHOLDER;
  ta.title = "Enter hoặc Shift+Enter để xuống dòng";

  stack.appendChild(clip);
  stack.appendChild(ta);

  /** Khớp chiều rộng vùng chữ với textarea (trừ thanh cuộn dọc) để ngắt dòng trùng textarea. */
  function syncClipGutter() {
    const sb = ta.offsetWidth - ta.clientWidth;
    clip.style.right = `${sb}px`;
  }

  function syncHighlightScroll() {
    inner.style.transform = `translateY(-${ta.scrollTop}px)`;
  }

  function refreshHighlight() {
    renderHighlightLines(inner, ta.value, apiBackByLine);
    requestAnimationFrame(() => {
      syncClipGutter();
      inner.style.minHeight = `${ta.scrollHeight}px`;
      syncHighlightScroll();
    });
  }

  /**
   * @returns {string[]}
   */
  function collectTermsPendingOpenAiTranslate(raw) {
    const lines = String(raw).split(/\r?\n/);
    /** @type {Set<string>} */
    const need = new Set();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.includes(":")) continue;
      if (lookupEnToVi(trimmed)) continue;
      if (!isEnglishOnlyVocabLine(trimmed)) continue;
      if (apiBackByLine[trimmed]) continue;
      if (translateDisabled) continue;
      need.add(trimmed);
    }
    return [...need];
  }

  /**
   * Gọi API dịch theo lô (một vài lần gọi LLM cho cả danh sách).
   * @param {string} raw
   */
  async function flushPendingTranslationsForRaw(raw) {
    const terms = collectTermsPendingOpenAiTranslate(raw);
    if (!terms.length) return { changed: false, failCount: 0, total: 0, serverHint: "" };
    let map = /** @type {Record<string, string>} */ ({});
    try {
      map = await fetchFlashTermsTranslationBatch(terms);
    } catch (e) {
      const msg = String(/** @type {any} */ (e).message || "").trim();
      if (msg) lastServerHint = msg;
      const st = /** @type {any} */ (e).status;
      if (st === 503 || String(/** @type {any} */ (e).message || "").includes("OPENAI_API_KEY")) {
        translateDisabled = true;
      }
      if (st !== 404) {
        return {
          changed: false,
          failCount: terms.length,
          total: terms.length,
          serverHint: msg,
        };
      }
      map = {};
    }
    let changed = false;
    for (const term of terms) {
      const tr = String(map[term] || "").trim();
      if (tr) {
        apiBackByLine[term] = tr;
        changed = true;
      }
    }
    const missing = terms.filter((t) => !String(apiBackByLine[t] || "").trim());
    if (missing.length > 0 && !translateDisabled) {
      const settled = await Promise.allSettled(
        missing.map(async (term) => {
          const tr = await fetchFlashTermTranslation(term);
          return { term, tr: String(tr || "").trim() };
        }),
      );
      for (const s of settled) {
        if (s.status !== "fulfilled") {
          const reason = /** @type {any} */ (s.reason);
          if (reason?.status === 503) translateDisabled = true;
          continue;
        }
        const { term, tr } = s.value;
        if (tr) {
          apiBackByLine[term] = tr;
          changed = true;
        }
      }
    }
    const failCount = terms.filter((t) => !String(apiBackByLine[t] || "").trim()).length;
    if (failCount === 0) lastServerHint = "";
    return { changed, failCount, total: terms.length, serverHint: lastServerHint };
  }

  function scheduleOpenAiFlashTranslate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void (async () => {
        debounceTimer = null;
        const { changed, failCount, total, serverHint } = await flushPendingTranslationsForRaw(ta.value);
        if (changed) {
          refreshHighlight();
          err.style.display = "none";
        } else if (total > 0 && failCount === total) {
          const hint = String(serverHint || "").trim();
          if (hint) {
            err.textContent = hint;
            err.style.display = "block";
          } else if (!shownFlashTranslateBackendHint) {
            shownFlashTranslateBackendHint = true;
            err.textContent =
              "Không gọi được API dịch từ vựng. (1) Chạy backend: python run_teachly.py hoặc uvicorn src.api_server:app —host 127.0.0.1 —port 8000 — (2) Mở http://127.0.0.1:8000/chatbot_ui.html (hoặc meta teachly-api-base nếu dùng Live Server). (3) Điền OPENAI_API_KEY trong .env (dịch EN→VI 2–3 nghĩa ở thẻ này), rồi khởi động lại server.";
            err.style.display = "block";
          }
        }
      })();
    }, TRANSLATE_DEBOUNCE_MS);
  }

  ta.addEventListener("input", () => {
    refreshHighlight();
    scheduleOpenAiFlashTranslate();
  });
  ta.addEventListener("scroll", syncHighlightScroll);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      syncClipGutter();
      syncHighlightScroll();
    });
    ro.observe(ta);
  }
  refreshHighlight();
  scheduleOpenAiFlashTranslate();

  root.appendChild(
    wrapField(
      "Danh sách (mỗi dòng một thẻ)",
      stack,
      "Đỏ: sai form hoặc bỏ qua (không tạo thẻ). Vàng đậm: đã có nghĩa (từ điển hoặc dịch tự động, 2–3 nghĩa). Vàng nhạt: đang dịch. Bấm «Tạo flashcard» một lần — nếu còn dịch, Teachly sẽ chờ dịch xong. Tối đa 200 thẻ.",
    ),
  );

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const submit = el("button", "flow-primary-btn", "Tạo flashcard");
  submit.type = "button";
  actions.appendChild(submit);
  root.appendChild(actions);

  submit.addEventListener("click", async () => {
    cancelScheduledTranslate();
    err.style.display = "none";
    err.classList.remove("flow-vocab-translate-wait");
    const body = ta.value.trim();
    let parsed = parseDirectFlashVocabLines(body, apiBackByLine);

    if (parsed.pendingApiCount > 0 && !translateDisabled) {
      submit.disabled = true;
      submit.classList.add("flow-vocab-submit-busy");
      const savedLabel = submit.textContent || "Tạo flashcard";
      submit.textContent = "Đang dịch…";
      err.classList.add("flow-vocab-translate-wait");
      err.textContent = "Đợi Teachly tự động dịch nhé…";
      err.style.display = "block";
      await flushPendingTranslationsForRaw(ta.value);
      err.classList.remove("flow-vocab-translate-wait");
      refreshHighlight();
      parsed = parseDirectFlashVocabLines(body, apiBackByLine);
      submit.classList.remove("flow-vocab-submit-busy");
      submit.textContent = savedLabel;
      submit.disabled = false;
    }

    if (parsed.pendingApiCount > 0) {
      const extra = String(lastServerHint || "").trim();
      err.textContent = extra
        ? `Một số dòng chưa dịch được. ${extra}`
        : "Một số dòng chưa dịch được. Thêm nghĩa dạng từ: nghĩa, hoặc kiểm tra OPENAI_API_KEY trên backend.";
      err.style.display = "block";
      return;
    }
    if (!parsed.cards.length) {
      if (parsed.skippedNonEnglish > 0 && !parsed.invalidLines.length) {
        err.textContent =
          "Các dòng đã bỏ qua vì từ đầu tiên trước dấu : không phải tiếng Anh (chữ Latin A–Z). Thêm ít nhất một dòng như preserve: bảo tồn, giữ gìn.";
      } else if (parsed.skippedNonEnglish > 0 && parsed.invalidLines.length) {
        err.textContent =
          "Chưa có thẻ hợp lệ: sửa các dòng sai định dạng và đảm bảo từ đầu tiên trước dấu : là tiếng Anh (ví dụ abandon: từ bỏ).";
      } else if (parsed.invalidLines.length) {
        err.textContent =
          "Chưa có dòng hợp lệ. Mỗi dòng cần có dạng \"từ: nghĩa\" (có dấu hai chấm, không để trống hai bên).";
      } else {
        err.textContent = "Hãy nhập ít nhất một dòng theo dạng từ: nghĩa.";
      }
      err.style.display = "block";
      return;
    }
    if (parsed.cards.length > MAX_PAIRS) {
      err.textContent = `Tối đa ${MAX_PAIRS} thẻ mỗi lần (bạn có ${parsed.cards.length} dòng hợp lệ). Hãy xóa bớt hoặc chia nhỏ.`;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    deps.onSubmit({
      vocabText: body,
      __apiBackJson: JSON.stringify(apiBackByLine),
    });
  });

  return root;
}

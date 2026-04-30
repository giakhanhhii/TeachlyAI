import {
  FLASH_VOCAB_TEXTAREA_PLACEHOLDER,
  parseDirectFlashVocabLines,
} from "../../guidedFlow/flashVocabParse.js";
import { MAX_FLASH_CARD_SIDE_CHARS } from "../../services/flashCardLimits.js";
import { el } from "./flowCardShared.js";
import { renderFlashVocabHighlightLines } from "./flashVocabHighlightLayer.js";
import { createFlashVocabOpenAiTranslate } from "./flashVocabOpenAiTranslate.js";

const MAX_PAIRS = 200;

/**
 * @param {{ onSubmit: (p: Record<string, string>) => void }} deps
 */
export function createFlashVocabFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Nhập từ vựng trực tiếp"));

  /** Bật: dòng tiếng Anh không «:» — vàng + gọi API/từ điển. Tắt: đỏ và không đưa vào thẻ. */
  let autoTranslateEnLines = false;

  const autoTranslateCb = /** @type {HTMLInputElement} */ (document.createElement("input"));
  autoTranslateCb.type = "checkbox";
  autoTranslateCb.checked = false;
  autoTranslateCb.className = "flow-vocab-auto-switch-input";
  autoTranslateCb.setAttribute("role", "switch");
  autoTranslateCb.setAttribute("aria-checked", "false");
  autoTranslateCb.setAttribute("aria-label", "Tự động dịch dòng tiếng Anh (không cần dấu :)");

  /** Nghĩa từ API OpenAI (EN→2–3 nghĩa VI), khóa = dòng trim (tiếng Anh không có dấu :). */
  const apiBackByLine = /** @type {Record<string, string>} */ ({});
  let translateDisabled = false;
  let shownFlashTranslateBackendHint = false;
  /** Thông báo lỗi gần nhất từ API dịch — hiển thị thay vì gợi ý chung. */
  let lastServerHint = "";

  const err = el("div", "flow-err");
  err.style.display = "none";

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

  function parseOpts() {
    return { autoTranslateEnLines };
  }

  function refreshHighlight() {
    renderFlashVocabHighlightLines(inner, ta.value, apiBackByLine, parseOpts());
    requestAnimationFrame(() => {
      syncClipGutter();
      inner.style.minHeight = `${ta.scrollHeight}px`;
      syncHighlightScroll();
    });
  }

  const openAi = createFlashVocabOpenAiTranslate({
    apiBackByLine,
    getAutoTranslateEn: () => autoTranslateEnLines,
    getTranslateDisabled: () => translateDisabled,
    setTranslateDisabled: (v) => {
      translateDisabled = v;
    },
    getLastServerHint: () => lastServerHint,
    setLastServerHint: (s) => {
      lastServerHint = s;
    },
    getShownBackendHint: () => shownFlashTranslateBackendHint,
    setShownBackendHint: (v) => {
      shownFlashTranslateBackendHint = v;
    },
    getRaw: () => ta.value,
    onRefreshHighlight: refreshHighlight,
    errEl: err,
  });

  autoTranslateCb.addEventListener("change", () => {
    autoTranslateEnLines = autoTranslateCb.checked;
    autoTranslateCb.setAttribute("aria-checked", autoTranslateEnLines ? "true" : "false");
    if (!autoTranslateEnLines) {
      openAi.cancel();
      err.style.display = "none";
    }
    refreshHighlight();
    openAi.schedule();
  });

  ta.addEventListener("input", () => {
    refreshHighlight();
    openAi.schedule();
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
  openAi.schedule();

  const listField = el("div", "flow-field");
  const listHeader = el("div", "flow-vocab-list-header");
  listHeader.appendChild(el("span", "flow-label flow-vocab-list-header-title", "Danh sách"));

  const autoSwitchWrap = el("div", "flow-vocab-auto-switch-wrap");
  autoSwitchWrap.appendChild(el("span", "flow-vocab-auto-switch-label", "Tự động dịch"));

  const autoSwitchLabel = el("label", "flow-vocab-auto-switch");
  autoSwitchLabel.title = "Tự động dịch dòng tiếng Anh (không cần dấu :)";
  autoSwitchLabel.appendChild(autoTranslateCb);
  autoSwitchLabel.appendChild(el("span", "flow-vocab-auto-switch-track"));
  autoSwitchWrap.appendChild(autoSwitchLabel);

  listHeader.appendChild(autoSwitchWrap);
  listField.appendChild(listHeader);
  listField.appendChild(stack);
  listField.appendChild(
    el(
      "p",
      "flow-hint",
      `Công tắc bên phải: bật (xanh) thì dòng tiếng Anh không «:» tô vàng và dịch; tắt (xám) thì tô đỏ và không tạo thẻ. Đỏ khác: sai form / bỏ qua. Mỗi mặt thẻ tối đa ${MAX_FLASH_CARD_SIDE_CHARS} ký tự. Bấm «Tạo flashcard» một lần — nếu còn dịch, Teachly chờ dịch xong. Tối đa 200 thẻ.`,
    ),
  );
  root.appendChild(listField);

  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const submit = el("button", "flow-primary-btn", "Tạo flashcard");
  submit.type = "button";
  actions.appendChild(submit);
  root.appendChild(actions);

  submit.addEventListener("click", async () => {
    openAi.cancel();
    err.style.display = "none";
    err.classList.remove("flow-vocab-translate-wait");
    const body = ta.value.trim();
    let parsed = parseDirectFlashVocabLines(body, apiBackByLine, parseOpts());

    if (parsed.pendingApiCount > 0 && !translateDisabled && autoTranslateEnLines) {
      submit.disabled = true;
      submit.classList.add("flow-vocab-submit-busy");
      const savedLabel = submit.textContent || "Tạo flashcard";
      submit.textContent = "Đang dịch…";
      err.classList.add("flow-vocab-translate-wait");
      err.textContent = "Đợi Teachly tự động dịch nhé…";
      err.style.display = "block";
      await openAi.flush(ta.value);
      err.classList.remove("flow-vocab-translate-wait");
      refreshHighlight();
      parsed = parseDirectFlashVocabLines(body, apiBackByLine, parseOpts());
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
    if (parsed.overLimitLines.length) {
      const sample = parsed.overLimitLines
        .slice(0, 2)
        .map((line) => `"${line.slice(0, 40)}${line.length > 40 ? "..." : ""}"`)
        .join(", ");
      err.textContent =
        parsed.overLimitLines.length === 1
          ? `Có 1 dòng vượt ${MAX_FLASH_CARD_SIDE_CHARS} ký tự ở một mặt thẻ. Hãy rút gọn rồi thử lại: ${sample}.`
          : `Có ${parsed.overLimitLines.length} dòng vượt ${MAX_FLASH_CARD_SIDE_CHARS} ký tự ở một mặt thẻ. Hãy rút gọn rồi thử lại, ví dụ: ${sample}.`;
      err.style.display = "block";
      return;
    }
    if (!parsed.cards.length) {
      if (!autoTranslateEnLines && parsed.skippedBareEnglishNoAuto > 0) {
        err.textContent =
          "Đã tắt tự động dịch: mọi dòng chỉ gõ tiếng Anh (không có :) đều bị bỏ qua. Bật lại công tắc bên phải tiêu đề hoặc nhập từng dạng word: nghĩa.";
      } else if (parsed.skippedNonEnglish > 0 && !parsed.invalidLines.length) {
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
      __autoTranslateEnLines: autoTranslateEnLines ? "1" : "0",
    });
  });

  return root;
}

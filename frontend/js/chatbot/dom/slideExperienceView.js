import { fetchMockResource } from "../services/mockContentApi.js";
import { IFRAME_LOAD_TIMEOUT_MS } from "../constants.js";
import { prepareSlideSessionData } from "../services/sessionContentPrep.js";
import { resolveSlideShellFilename } from "../data/slideThemeShellMap.js";
import { fetchSlideShellHtml } from "../slide/slideShellLoad.js";
import {
  buildSlideDeckSrcdoc,
  countRenderableShellSlides,
  setSlideShellNavMode,
  syncShellSlideNav,
  setSlideVisualEditMode,
} from "../slide/slideShellSrcdoc.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { openSlideImagePicker } from "./slideExperienceImagePicker.js";

/**
 * @param {Record<string, string>} meta
 * @param {number} sIndex
 * @param {{ title: string, bullets?: string[] }} slide
 */
function buildAiDraftSlide(meta, sIndex, slide) {
  const topic = meta.topic || "—";
  const count = meta.count || "—";
  const notes = meta.notes || "—";
  const bullets = (slide.bullets || []).map((b) => `• ${b}`).join("\n");
  return (
    `[Sửa slide — nhờ AI]\n` +
    `Ngữ cảnh — Chủ đề: ${topic}; Số slide (yêu cầu): ${count}; Ghi chú: ${notes}\n` +
    `Slide hiện tại (${sIndex + 1}) — Tiêu đề: ${slide.title}\n${bullets}\n\n` +
    `Hãy đề xuất lại tiêu đề và gạch đầu dòng rõ ràng hơn cho học sinh ôn THPT. Trả về JSON: {"title":"...","bullets":["..."]}.`
  );
}

/**
 * @param {HTMLElement} stage
 * @param {{ title: string, bullets?: string[] }[]} slides
 */
function renderSlidesPlain(stage, slides, index) {
  stage.innerHTML = "";
  const s = slides[index];
  if (!s) {
    stage.innerHTML = `<p class="exp-empty">Không có slide trong bộ mock.</p>`;
    return;
  }
  const h = document.createElement("h2");
  h.className = "exp-slide-title";
  h.textContent = s.title || "";
  const ul = document.createElement("ul");
  ul.className = "exp-slide-bullets";
  (s.bullets || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    ul.appendChild(li);
  });
  stage.appendChild(h);
  stage.appendChild(ul);
}

/**
 * @param {{ body: HTMLElement }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "slide"|"quiz"|"flash") => void }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountSlideExperience(layerView, meta, deps, opts = {}) {
  layerView.prepareShow();
  const root = /** @type {HTMLElement & { __slideExperienceAbort?: AbortController | null }} */ (layerView.body);
  root.__slideExperienceAbort?.abort();
  const slideUiAbort = new AbortController();
  const uiSignal = slideUiAbort.signal;
  root.__slideExperienceAbort = slideUiAbort;
  const raw = await fetchMockResource("slide");
  const data = prepareSlideSessionData(raw, meta);
  const deckTitle = data.title || "Bộ slide";
  let slides = Array.isArray(data.slides) ? data.slides : [];

  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let total = Math.max(1, slides.length);
  index = Math.min(Math.max(0, index), Math.max(0, slides.length - 1));

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-slide";
  const teardownObserver = new MutationObserver(() => {
    if (!shell.isConnected) {
      slideUiAbort.abort();
    }
  });
  teardownObserver.observe(root, { childList: true });
  uiSignal.addEventListener(
    "abort",
    () => {
      teardownObserver.disconnect();
      if (root.__slideExperienceAbort === slideUiAbort) {
        delete root.__slideExperienceAbort;
      }
    },
    { once: true },
  );

  const onAi = () => {
    const s = slides[index];
    if (!s || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftSlide(meta, index, s));
  };

  let visualEditOn = false;
  let sharedOuterScrollTop = 0;
  let sharedDeckScrollTop = 0;
  let sharedDeckScrollRatio = 0;

  function readDeckScrollState() {
    const doc = iframe.contentDocument;
    if (!doc) return { top: sharedDeckScrollTop, ratio: sharedDeckScrollRatio };
    const scrollingEl = doc.scrollingElement || doc.documentElement || doc.body;
    const top = Math.max(
      Number(scrollingEl?.scrollTop) || 0,
      Number(doc.documentElement?.scrollTop) || 0,
      Number(doc.body?.scrollTop) || 0,
      0,
    );
    const viewportHeight = Math.max(
      Number(scrollingEl?.clientHeight) || 0,
      Number(doc.documentElement?.clientHeight) || 0,
      Number(doc.body?.clientHeight) || 0,
      Number(iframe.contentWindow?.innerHeight) || 0,
      0,
    );
    const scrollHeight = Math.max(
      Number(scrollingEl?.scrollHeight) || 0,
      Number(doc.documentElement?.scrollHeight) || 0,
      Number(doc.body?.scrollHeight) || 0,
      0,
    );
    const max = Math.max(0, scrollHeight - viewportHeight);
    sharedDeckScrollTop = top;
    sharedDeckScrollRatio = max > 0 ? top / max : 0;
    return { top: sharedDeckScrollTop, ratio: sharedDeckScrollRatio };
  }

  function syncSharedOuterScroll() {
    sharedOuterScrollTop = root.scrollTop;
  }

  function restoreOuterScrollSoon() {
    const restore = () => {
      root.scrollTop = sharedOuterScrollTop;
    };
    restore();
    requestAnimationFrame(restore);
  }

  root.addEventListener("scroll", syncSharedOuterScroll, { passive: true, signal: uiSignal });

  shell.appendChild(
    createExperienceTopBar({
      title: deckTitle,
      onAiEdit: deps?.onAiEdit ? onAi : undefined,
    }).bar,
  );

  const tplLabel = meta.slideTemplate ? String(meta.slideTemplate) : "";
  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  summary.textContent = `Đã ghi nhận — Chủ đề: ${meta.topic || "—"} | Số slide (yêu cầu): ${meta.count || "—"} | Ghi chú: ${meta.notes || "—"}${
    tplLabel ? ` | Mẫu: ${tplLabel}` : ""
  }`;
  shell.appendChild(summary);

  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  shell.appendChild(progress.wrap);

  const stage = document.createElement("div");
  stage.className = "exp-stage exp-slide-stage";

  const iframe = document.createElement("iframe");
  iframe.className = "exp-slide-shell-iframe";
  iframe.setAttribute("title", "Slide deck");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  const iframeFrame = document.createElement("div");
  iframeFrame.className = "exp-slide-shell-frame";
  let shellReady = false;
  let focusViewportRaf = 0;
  let boundIframeWindow = null;
  let boundIframeDocument = null;

  function clearPendingViewportFocus() {
    if (!focusViewportRaf) return;
    cancelAnimationFrame(focusViewportRaf);
    focusViewportRaf = 0;
  }

  function detachIframeInteractionListeners() {
    if (boundIframeWindow) {
      boundIframeWindow.removeEventListener("scroll", captureDeckScroll);
      boundIframeWindow = null;
    }
    if (boundIframeDocument) {
      boundIframeDocument.removeEventListener("scroll", captureDeckScroll, true);
      boundIframeDocument.removeEventListener("keydown", onPresentationKeydown, true);
      boundIframeDocument = null;
    }
  }

  function bindIframeInteractionListeners() {
    const nextWindow = iframe.contentWindow || null;
    const nextDocument = iframe.contentDocument || null;
    if (!nextWindow || !nextDocument) return;
    if (boundIframeWindow === nextWindow && boundIframeDocument === nextDocument) return;
    detachIframeInteractionListeners();
    nextWindow.addEventListener("scroll", captureDeckScroll, {
      passive: true,
      signal: uiSignal,
    });
    nextDocument.addEventListener("scroll", captureDeckScroll, {
      passive: true,
      capture: true,
      signal: uiSignal,
    });
    nextDocument.addEventListener("keydown", onPresentationKeydown, {
      capture: true,
      signal: uiSignal,
    });
    boundIframeWindow = nextWindow;
    boundIframeDocument = nextDocument;
  }

  uiSignal.addEventListener(
    "abort",
    () => {
      clearPendingViewportFocus();
      detachIframeInteractionListeners();
    },
    { once: true },
  );

  function onSlideImagePickerMessage(e) {
    const layer = document.getElementById("experienceLayer");
    if (!layer?.classList.contains("visible")) return;
    if (!e.data || e.data.type !== "a20-slide-edit" || e.data.action !== "open-image-picker") return;
    if (e.source !== iframe.contentWindow) return;
    const mountEl =
      document.fullscreenElement === viewport ||
      document.webkitFullscreenElement === viewport ||
      viewport.classList.contains("exp-slide-viewport--faux-fs")
        ? viewport
        : document.body;
    openSlideImagePicker((url) => {
      try {
        iframe.contentWindow?.postMessage({ type: "a20-slide-edit", action: "set-image-url", url }, "*");
      } catch (_) {
        /* ignore */
      }
    }, mountEl);
  }
  window.addEventListener("message", onSlideImagePickerMessage, { signal: uiSignal });

  /** @type {"presentation" | "scroll"} */
  let viewMode = "presentation";

  /** Bỏ qua phím ←/→ ngay sau đổi fullscreen (tránh sự kiện lạ kích hoạt chuyển slide). */
  let suppressArrowNavUntil = 0;

  const modeBar = document.createElement("div");
  modeBar.className = "exp-slide-mode-bar";
  const modePresBtn = document.createElement("button");
  modePresBtn.type = "button";
  modePresBtn.className = "exp-slide-mode-btn";
  modePresBtn.textContent = "Trình chiếu";
  modePresBtn.setAttribute("aria-pressed", "true");
  const modeScrollBtn = document.createElement("button");
  modeScrollBtn.type = "button";
  modeScrollBtn.className = "exp-slide-mode-btn";
  modeScrollBtn.textContent = "Lướt";
  modeScrollBtn.setAttribute("aria-pressed", "false");
  modeBar.append(modePresBtn, modeScrollBtn);

  const viewport = document.createElement("div");
  viewport.className = "exp-slide-viewport";
  viewport.tabIndex = -1;

  const fsBtn = document.createElement("button");
  fsBtn.type = "button";
  fsBtn.className = "exp-slide-fs-btn";
  fsBtn.setAttribute("aria-label", "Toàn màn hình");
  fsBtn.title = "Toàn màn hình (chế độ Trình chiếu)";
  fsBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10-18h3a2 2 0 0 1 2 2v3M3 8V5a2 2 0 0 1 2-2h3"/></svg>';

  const visualEditBtn = document.createElement("button");
  visualEditBtn.type = "button";
  visualEditBtn.className = "exp-slide-visual-edit-btn";
  visualEditBtn.disabled = true;
  visualEditBtn.hidden = true;
  visualEditBtn.title = "Chỉnh sửa trên slide (kéo, màu, font, ảnh)";
  visualEditBtn.setAttribute("aria-label", "Chế độ chỉnh sửa slide");
  visualEditBtn.setAttribute("aria-pressed", "false");
  visualEditBtn.innerHTML = `<svg class="exp-slide-visual-edit-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg><span>Sửa</span>`;
  visualEditBtn.addEventListener("click", () => {
    if (!shellReady) return;
    visualEditOn = !visualEditOn;
    visualEditBtn.classList.toggle("is-active", visualEditOn);
    visualEditBtn.setAttribute("aria-pressed", visualEditOn ? "true" : "false");
    setSlideVisualEditMode(iframe, visualEditOn);
  });

  const prevArrow = document.createElement("button");
  prevArrow.type = "button";
  prevArrow.className = "exp-slide-arrow exp-slide-arrow--prev";
  prevArrow.setAttribute("aria-label", "Slide trước");
  prevArrow.textContent = "←";

  const nextArrow = document.createElement("button");
  nextArrow.type = "button";
  nextArrow.className = "exp-slide-arrow exp-slide-arrow--next";
  nextArrow.setAttribute("aria-label", "Slide sau");
  nextArrow.textContent = "→";

  function syncViewModeToIframe() {
    if (!shellReady) return;
    setSlideShellNavMode(
      iframe,
      viewMode === "scroll" ? "scroll" : "active",
      index,
      viewMode === "presentation" ? readDeckScrollState() : undefined,
    );
  }

  window.addEventListener(
    "resize",
    () => {
      if (!shellReady) return;
      syncViewModeToIframe();
      paintSlideChrome();
    },
    { passive: true, signal: uiSignal },
  );

  function isKeyboardEditingTarget(target) {
    return !!(
      target instanceof Element &&
      target.closest('input, textarea, select, [contenteditable="true"], [data-edit-text-active="1"]')
    );
  }

  function captureDeckScroll() {
    if (!shellReady || viewMode !== "presentation") return;
    readDeckScrollState();
  }

  function focusSlideViewport() {
    if (viewMode !== "presentation") return;
    if (focusViewportRaf) return;
    focusViewportRaf = requestAnimationFrame(() => {
      focusViewportRaf = 0;
      if (uiSignal.aborted || viewMode !== "presentation" || !viewport.isConnected) return;
      const activeEl = document.activeElement;
      try {
        if (activeEl instanceof HTMLElement && isKeyboardEditingTarget(activeEl)) {
          activeEl.blur();
        }
      } catch (_) {
        /* ignore */
      }
      if (document.activeElement === viewport) return;
      try {
        viewport.focus({ preventScroll: true });
      } catch (_) {
        /* ignore */
      }
    });
  }

  /** Fullscreen API (trình duyệt) — vẫn xử lý nếu từng có; không dùng cho nút toàn màn hình (xem faux-fs). */
  function isNativeSlideViewportFullscreen() {
    return document.fullscreenElement === viewport || document.webkitFullscreenElement === viewport;
  }

  /** Trình chiếu phủ màn hình: CSS `.exp-slide-viewport--faux-fs` (tránh thoát khi mở chọn tệp). */
  function isSlidePresentationFullscreen() {
    return isNativeSlideViewportFullscreen() || viewport.classList.contains("exp-slide-viewport--faux-fs");
  }

  function paintSlideChrome() {
    const s = slides[index];
    const pres = viewMode === "presentation";
    const fsMode = isSlidePresentationFullscreen();
    modePresBtn.setAttribute("aria-pressed", pres ? "true" : "false");
    modeScrollBtn.setAttribute("aria-pressed", pres ? "false" : "true");
    modePresBtn.classList.toggle("is-selected", pres);
    modeScrollBtn.classList.toggle("is-selected", !pres);
    prevArrow.disabled = index <= 0;
    nextArrow.disabled = !s || index >= total - 1;
    prevArrow.hidden = !pres || !shellReady;
    nextArrow.hidden = !pres || !shellReady;
    fsBtn.hidden = !pres || !shellReady;
    /* Ẩn Sửa chỉ khi dùng Fullscreen API — chế độ faux-fs vẫn bật Sửa để chọn ảnh */
    visualEditBtn.hidden = !pres || !shellReady || isNativeSlideViewportFullscreen();
    modeBar.hidden = !shellReady;
    fsBtn.setAttribute("aria-label", fsMode ? "Thoát toàn màn hình" : "Toàn màn hình");
    fsBtn.title = fsMode ? "Thoát toàn màn hình" : "Toàn màn hình (chế độ Trình chiếu)";
    fsBtn.innerHTML = fsMode
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10-18h3a2 2 0 0 1 2 2v3M3 8V5a2 2 0 0 1 2-2h3"/></svg>';
  }

  function applyViewMode(next) {
    viewport.classList.remove("exp-slide-viewport--faux-fs");
    if (document.fullscreenElement === viewport) {
      void document.exitFullscreen();
    }
    viewMode = next;
    syncViewModeToIframe();
    paintSlideChrome();
    focusSlideViewport();
  }

  modePresBtn.addEventListener("click", () => applyViewMode("presentation"));
  modeScrollBtn.addEventListener("click", () => applyViewMode("scroll"));

  fsBtn.addEventListener("click", () => {
    if (!shellReady || viewMode !== "presentation") return;
    if (isNativeSlideViewportFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (typeof exit === "function") void exit.call(document);
      return;
    }
    viewport.classList.toggle("exp-slide-viewport--faux-fs");
    suppressArrowNavUntil = performance.now() + 320;
    paintSlideChrome();
  });

  function goPrev() {
    if (index <= 0) return;
    index -= 1;
    renderSlide();
  }

  function goNext() {
    if (!slides[index]) return;
    if (index >= total - 1) return;
    index += 1;
    renderSlide();
  }

  prevArrow.addEventListener("click", () => goPrev());
  nextArrow.addEventListener("click", () => goNext());

  function onFsChange() {
    suppressArrowNavUntil = performance.now() + 320;
    const nativeFs = isNativeSlideViewportFullscreen();
    if (nativeFs && visualEditOn) {
      visualEditOn = false;
      setSlideVisualEditMode(iframe, false);
      visualEditBtn.classList.remove("is-active");
      visualEditBtn.setAttribute("aria-pressed", "false");
    }
    paintSlideChrome();
  }
  document.addEventListener("fullscreenchange", onFsChange, { signal: uiSignal });
  document.addEventListener("webkitfullscreenchange", onFsChange, { signal: uiSignal });

  function onPresentationKeydown(e) {
    const layer = document.getElementById("experienceLayer");
    if (!layer?.classList.contains("visible") || !shellReady || viewMode !== "presentation") return;
    if (performance.now() < suppressArrowNavUntil) return;
    if (isKeyboardEditingTarget(e.target)) return;
    if (
      e.key === "Escape" &&
      viewport.classList.contains("exp-slide-viewport--faux-fs") &&
      !document.querySelector(".exp-slide-img-picker-backdrop")
    ) {
      e.preventDefault();
      viewport.classList.remove("exp-slide-viewport--faux-fs");
      suppressArrowNavUntil = performance.now() + 320;
      paintSlideChrome();
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  }
  document.addEventListener("keydown", onPresentationKeydown, { signal: uiSignal, capture: true });

  shell.appendChild(stage);

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: slides.length === 0 });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "slide",
      meta: { ...meta },
      title: deckTitle,
      total: slides.length,
      index,
    });
  }

  function paintNav() {
    const s = slides[index];
    progress.paint({ total, index, correct: 0, wrong: 0 });
    backBtn.disabled = index <= 0;
    nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    nextBtn.disabled = !s;
    if (shellReady) {
      syncShellSlideNav(iframe, index, readDeckScrollState());
    }
    paintSlideChrome();
    emitState();
    restoreOuterScrollSoon();
    focusSlideViewport();
  }

  function renderSlide() {
    const s = slides[index];
    if (!s) {
      stage.innerHTML = `<p class="exp-empty">Không có slide trong bộ mock.</p>`;
      backBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    if (!shellReady) {
      renderSlidesPlain(stage, slides, index);
    }
    paintNav();
  }

  backBtn.addEventListener("click", () => {
    if (index <= 0) return;
    index -= 1;
    renderSlide();
  });

  nextBtn.addEventListener("click", () => {
    if (total <= 1 || index >= total - 1) {
      deps?.onContinueCreate?.("slide");
      return;
    }
    index += 1;
    renderSlide();
  });

  if (slides.length > 0) {
    stage.innerHTML = `<p class="exp-empty">Đang tải giao diện slide...</p>`;
  }

  (async () => {
    if (slides.length === 0) return;
    try {
      const file = resolveSlideShellFilename(meta.slideTemplate);
      const html = await fetchSlideShellHtml(file);
      const maxRenderableSlides = countRenderableShellSlides(html);
      if (maxRenderableSlides > 0 && slides.length > maxRenderableSlides) {
        slides = slides.slice(0, maxRenderableSlides);
        total = Math.max(1, slides.length);
        index = Math.min(index, Math.max(0, slides.length - 1));
      }
      const srcdoc = buildSlideDeckSrcdoc(html, slides, {
        ...meta,
        shellYear: String(meta.shellYear || new Date().getFullYear()),
        slideNavMode: "active",
      });
      stage.innerHTML = "";
      iframe.style.border = "0";
      iframe.style.display = "none";
      iframeFrame.appendChild(iframe);
      viewport.append(iframeFrame, visualEditBtn, prevArrow, nextArrow, fsBtn);
      stage.append(modeBar, viewport);
      const loadPromise = new Promise((resolve) => {
        iframe.addEventListener("load", resolve, { once: true, signal: uiSignal });
      });
      iframe.srcdoc = srcdoc;
      await Promise.race([
        loadPromise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("iframe load timeout")), IFRAME_LOAD_TIMEOUT_MS);
        }),
      ]);
      shellReady = true;
      bindIframeInteractionListeners();
      iframe.style.display = "";
      viewMode = "presentation";
      syncViewModeToIframe();
      visualEditBtn.disabled = false;
      paintNav();
    } catch (err) {
      console.warn("[slide-shell] fallback to plain slide view", err);
      shellReady = false;
      summary.textContent = `${summary.textContent} | Cảnh báo: không tải được giao diện mẫu, đang hiển thị dạng đơn giản.`;
      renderSlide();
    }
  })();

  root.appendChild(shell);
  paintSlideChrome();
  if (slides.length === 0) {
    renderSlide();
  }
}

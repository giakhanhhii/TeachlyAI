import { SLIDE_PAD_PX_DEFAULT } from "../constants.js";
import { SLIDE_VISUAL_EDITOR_CSS, SLIDE_VISUAL_EDITOR_JS } from "./slideVisualEditorIframe.js";

const slideShellScrollViewportSyncJobs = new WeakMap();
const slideShellActiveViewportSyncJobs = new WeakMap();

/**
 * @param {Document} doc
 */
function injectSlideVisualEditor(doc) {
  if (!doc.querySelector("style[data-slide-visual-editor]")) {
    const st = doc.createElement("style");
    st.setAttribute("data-slide-visual-editor", "1");
    st.textContent = SLIDE_VISUAL_EDITOR_CSS;
    doc.head.appendChild(st);
  }
  if (doc.querySelector("script[data-slide-visual-editor]")) return;
  const s = doc.createElement("script");
  s.setAttribute("data-slide-visual-editor", "1");
  s.textContent = SLIDE_VISUAL_EDITOR_JS;
  doc.body.appendChild(s);
}

/**
 * @param {Document} doc
 * @param {string} year
 */
function applyShellYear(doc, year) {
  const t = doc.querySelector("title");
  if (t && /20\d{2}/.test(t.textContent)) {
    t.textContent = t.textContent.replace(/20\d{2}/, year);
  }
}

/** @param {Document} doc */
function stripIframeScripts(doc) {
  doc.querySelectorAll("script").forEach((s) => s.remove());
}

/**
 * Full-deck HTML: collect removable slide roots (order stable).
 * @param {Document} doc
 * @returns {Element[]}
 */
function collectStaticSlideRoots(doc) {
  const seen = new Set();
  const out = [];
  doc.querySelectorAll(".slide-container").forEach((n) => {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  });
  if (out.length) return out;
  doc.querySelectorAll("div.slide").forEach((n) => {
    if (n.classList.contains("slide") && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  });
  return out;
}

/**
 * @param {Document} doc
 * @returns {boolean}
 */
function isComicThemeDoc(doc) {
  return !!(doc.body && doc.body.classList.contains("shell-theme-comic")) || !!doc.querySelector('link[href*="Bangers"]');
}

/**
 * Comic full-deck files contain many decorative/static-only slides (TOC, section cards, tables)
 * that are not compatible with generic title+bullets shell filling. Keep only list-friendly
 * content slides so generated comic decks stay aligned with the original template intent.
 * @param {Document} doc
 * @param {Element[]} roots
 * @returns {Element[]}
 */
function filterShellVariantRoots(doc, roots) {
  if (!roots.length) return roots;
  if (!isComicThemeDoc(doc)) return roots;
  const filtered = roots.filter((root) => {
    if (root.querySelector("table, .table-layout, .activity-table, .task-grid")) return false;
    return Boolean(root.querySelector("ul.comic-list, ul.styled-list, ul.legend, .bullet-list ul, ul"));
  });
  return filtered.length ? filtered : roots;
}

/**
 * Keep the comic opening slide as the first generated slide so the deck starts
 * with the same hero composition as the original template.
 * @param {Element} root
 * @param {Document} doc
 */
function decorateComicCoverPrototype(root, doc) {
  root.removeAttribute("id");
  const panel = root.querySelector(".comic-panel") || root;
  const title =
    panel.querySelector(".comic-title") || panel.querySelector("h1") || panel.querySelector("h2") || panel.querySelector("p");
  if (title) {
    title.setAttribute("data-shell", "title");
    title.textContent = "";
  }
  Array.from(panel.querySelectorAll("h1, h2, p")).forEach((el) => {
    if (el !== title) el.remove();
  });
  let ul = panel.querySelector("ul[data-shell=\"bullets\"]");
  if (!ul) {
    ul = panel.querySelector("ul.comic-list, ul");
  }
  if (!ul) {
    const nu = doc.createElement("ul");
    nu.className = "comic-list";
    nu.style.marginTop = "30px";
    nu.style.textAlign = "left";
    nu.style.width = "100%";
    nu.setAttribute("data-shell", "bullets");
    panel.appendChild(nu);
  } else {
    ul.setAttribute("data-shell", "bullets");
    ul.replaceChildren();
  }
}

/**
 * Mark title + bullets placeholders on a cloned slide for data fill.
 * @param {Element} root
 * @param {Document} doc
 */
function decorateSlidePrototype(root, doc) {
  root.removeAttribute("id");

  const title =
    root.querySelector("h2.slide-title") ||
    root.querySelector("h1.main-title") ||
    root.querySelector("h1") ||
    root.querySelector("h2") ||
    root.querySelector(".comic-title") ||
    root.querySelector(".outer-title") ||
    root.querySelector(".section-title") ||
    root.querySelector(".cta-title");

  if (title) {
    title.setAttribute("data-shell", "title");
    title.textContent = "";
  }

  let ul = root.querySelector("ul[data-shell=\"bullets\"]");
  if (!ul) {
    ul =
      root.querySelector("ul.comic-list, ul.styled-list, ul.legend, ul") ||
      root.querySelector(".content-area ul") ||
      root.querySelector(".bullet-list ul");
  }
  if (ul) {
    ul.setAttribute("data-shell", "bullets");
    ul.replaceChildren();
  } else {
    /* Ưu tiên vùng nội dung trong card/template gốc — tránh gắn <ul> trực tiếp lên .slide-container (lệch layout, đè sticker). */
    const sink =
      root.querySelector(".content-area") ||
      root.querySelector(".comic-panel") ||
      root.querySelector(".title-content") ||
      root.querySelector(".card") ||
      root;
    const nu = doc.createElement("ul");
    nu.setAttribute("data-shell", "bullets");
    sink.appendChild(nu);
  }
}

/**
 * When HTML has no #slides-master-container / template#layout-content, derive them from static slides.
 * Each distinct slide root becomes a `<template data-shell-layout-variant>` so deck slides can cycle
 * layouts (theme / structure) like the source `slide_html_template/*.html` files.
 * @param {Document} doc
 * @returns {boolean}
 */
function ensureShellFromFullDeck(doc) {
  const master = doc.querySelector("#slides-master-container");
  const tpl =
    doc.querySelector("template#layout-content") ||
    doc.querySelector("template#shell-slide-content") ||
    doc.querySelector("template[data-shell-layout=\"content\"]");

  if (master && tpl) return true;

  const allRoots = collectStaticSlideRoots(doc);
  const roots = filterShellVariantRoots(doc, allRoots);
  if (!allRoots.length || !roots.length) return false;

  if (isComicThemeDoc(doc) && allRoots[0]) {
    const coverProto = allRoots[0].cloneNode(true);
    decorateComicCoverPrototype(coverProto, doc);
    const coverTpl = doc.createElement("template");
    coverTpl.id = "layout-cover";
    coverTpl.setAttribute("data-shell-layout-role", "cover");
    coverTpl.content.appendChild(coverProto);
    doc.body.appendChild(coverTpl);
  }

  roots.forEach((root, idx) => {
    const proto = root.cloneNode(true);
    decorateSlidePrototype(proto, doc);
    const t = doc.createElement("template");
    t.id = idx === 0 ? "layout-content" : `layout-content-v${idx}`;
    t.setAttribute("data-shell-layout-variant", String(idx));
    t.content.appendChild(proto);
    doc.body.appendChild(t);
  });

  allRoots.forEach((r) => r.remove());

  if (!master) {
    const m = doc.createElement("div");
    m.id = "slides-master-container";
    const inPresentation = Boolean(doc.getElementById("presentation-area"));
    m.setAttribute("data-nav-mode", inPresentation ? "active" : "scroll");
    const pa = doc.getElementById("presentation-area");
    if (pa) pa.appendChild(m);
    else doc.body.appendChild(m);
  }

  return true;
}

/**
 * @param {Document} doc
 * @returns {HTMLTemplateElement | null}
 */
function getShellCoverTemplate(doc) {
  const cover = doc.querySelector("template[data-shell-layout-role=\"cover\"]");
  return cover instanceof HTMLTemplateElement ? cover : null;
}

/**
 * Layout templates: multiple variants from `ensureShellFromFullDeck`, or a single author template.
 * @param {Document} doc
 * @returns {HTMLTemplateElement[]}
 */
function getShellVariantTemplates(doc) {
  const multi = doc.querySelectorAll("template[data-shell-layout-variant]");
  if (multi.length) {
    return Array.from(multi).sort(
      (a, b) =>
        Number(a.getAttribute("data-shell-layout-variant") || 0) -
        Number(b.getAttribute("data-shell-layout-variant") || 0),
    );
  }
  const single =
    doc.querySelector("template#layout-content") ||
    doc.querySelector("template#shell-slide-content") ||
    doc.querySelector("template[data-shell-layout=\"content\"]");
  return single ? [single] : [];
}

/**
 * Makes fixed 1280×720 slide shells scale to the iframe width so the preview
 * does not show inner scrollbars (outer `.experience-body` still scrolls if needed).
 * @param {Document} doc
 */
function injectShellPreviewFit(doc) {
  if (doc.querySelector("style[data-slide-shell-fit]")) return;
  const style = doc.createElement("style");
  style.setAttribute("data-slide-shell-fit", "1");
  style.textContent = `
    html { overflow-x: hidden; }
    /* Override theme body { display: grid } so sibling <template> nodes do not shift slides sideways */
    body {
      overflow-x: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: flex-start !important;
      margin: 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      box-sizing: border-box !important;
    }
    body > template {
      display: none !important;
    }
    #presentation-area {
      max-width: 100% !important;
      width: 100% !important;
      overflow-x: hidden;
      box-sizing: border-box;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    #slides-master-container {
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    #slides-master-container[data-nav-mode="scroll"] {
      gap: 28px !important;
      padding-bottom: 24px !important;
    }
    /* Trình chiếu: một slide (themes comic / color không có sẵn rule .active) */
    #slides-master-container[data-nav-mode="active"] .shell-slide-instance:not(.active) {
      display: none !important;
    }
    .shell-slide-instance.slide-container,
    .shell-slide-instance.slide {
      width: 100% !important;
      max-width: 1280px !important;
      margin-left: auto !important;
      margin-right: auto !important;
      height: auto !important;
      min-height: 0 !important;
      aspect-ratio: 16 / 9 !important;
      box-sizing: border-box !important;
      align-self: center !important;
      overflow: visible !important;
      position: relative !important;
    }
    /* Sticker đưa vào trong .card (JS): luôn nổi trên chữ/nội dung của theme */
    .shell-slide-instance .card > .sticker,
    .shell-slide-instance .content-card > .sticker,
    .shell-slide-instance .comic-panel > .sticker,
    .shell-slide-instance > .sticker {
      pointer-events: none !important;
      z-index: 620 !important;
    }
    .shell-slide-instance .card > .sticker[data-sticker-side="left"],
    .shell-slide-instance .content-card > .sticker[data-sticker-side="left"],
    .shell-slide-instance .comic-panel > .sticker[data-sticker-side="left"],
    .shell-slide-instance > .sticker[data-sticker-side="left"] {
      left: var(--sticker-inline-offset, 22px) !important;
      right: auto !important;
    }
    .shell-slide-instance .card > .sticker[data-sticker-side="right"],
    .shell-slide-instance .content-card > .sticker[data-sticker-side="right"],
    .shell-slide-instance .comic-panel > .sticker[data-sticker-side="right"],
    .shell-slide-instance > .sticker[data-sticker-side="right"] {
      right: var(--sticker-inline-offset, 22px) !important;
      left: auto !important;
    }
    .shell-slide-instance .card > .sticker[data-sticker-vertical="top"],
    .shell-slide-instance .content-card > .sticker[data-sticker-vertical="top"],
    .shell-slide-instance .comic-panel > .sticker[data-sticker-vertical="top"],
    .shell-slide-instance > .sticker[data-sticker-vertical="top"] {
      top: var(--sticker-block-offset, 24px) !important;
      bottom: auto !important;
    }
    .shell-slide-instance .card > .sticker[data-sticker-vertical="bottom"],
    .shell-slide-instance .content-card > .sticker[data-sticker-vertical="bottom"],
    .shell-slide-instance .comic-panel > .sticker[data-sticker-vertical="bottom"],
    .shell-slide-instance > .sticker[data-sticker-vertical="bottom"] {
      bottom: var(--sticker-block-offset, 20px) !important;
      top: auto !important;
    }
    .shell-slide-instance .title-card,
    .shell-slide-instance .section-card {
      padding-left: 170px !important;
      padding-right: 170px !important;
    }
    /* Khung nội dung: khớp chế độ Sửa — không transform:scale (xem slideVisualEditorIframe) */
    .shell-slide-instance .card,
    .shell-slide-instance .content-card,
    .shell-slide-instance .comic-panel {
      min-height: 0 !important;
      overflow: visible !important;
    }
    .shell-slide-instance .shell-panel-fit-sizer {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
    }
    .shell-slide-instance .shell-panel-fit-host {
      display: flex;
      flex-direction: column;
    }
    .shell-slide-instance .shell-panel-fit-outer {
      flex-shrink: 0;
      box-sizing: border-box;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
    }
    .shell-slide-instance .shell-panel-fit-scaled {
      box-sizing: border-box;
      transform-origin: 0 0;
      transform: none !important;
      width: auto !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
    }
    /* Phần tử đã chỉnh (data-edit-geom): cùng stacking + position như khi bật slide-visual-edit-on */
    .shell-slide-instance [data-edit-geom="1"][data-shell="title"],
    .shell-slide-instance ul[data-shell="bullets"][data-edit-geom="1"],
    .shell-slide-instance ul[data-shell="bullets"] > li[data-edit-geom="1"] {
      position: absolute !important;
      z-index: 520 !important;
    }
    .shell-slide-instance img[data-edit-geom="1"] {
      position: absolute !important;
      z-index: 380 !important;
    }
    .shell-slide-instance .sticker[data-edit-geom="1"] {
      position: absolute !important;
      z-index: 400 !important;
    }
    .shell-slide-instance .card[data-edit-geom="1"],
    .shell-slide-instance .content-card[data-edit-geom="1"],
    .shell-slide-instance .comic-panel[data-edit-geom="1"] {
      position: absolute !important;
      z-index: 1 !important;
    }
    /*
     * Keep theme font-families by default. Vietnamese glyph fallback is handled by
     * the template font stacks or theme-specific overrides below.
     */
    .shell-slide-instance [data-shell="title"],
    .shell-slide-instance ul[data-shell="bullets"],
    .shell-slide-instance ul[data-shell="bullets"] li {
      font-synthesis: none !important;
      text-rendering: optimizeLegibility;
    }
    .shell-slide-instance [data-shell="title"],
    .shell-slide-instance .slide-title,
    .shell-slide-instance .section-card h1,
    .shell-slide-instance .title-card h1,
    .shell-slide-instance .comic-title {
      overflow-wrap: anywhere;
      word-break: break-word;
      max-width: 100%;
      box-sizing: border-box;
    }
    .shell-slide-instance ul[data-shell="bullets"],
    .shell-slide-instance ul[data-shell="bullets"] li {
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .shell-slide-instance .outer-title {
      max-width: 100%;
      box-sizing: border-box;
      padding-left: 12px;
      padding-right: 12px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .shell-slide-instance .content-area {
      max-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
      min-height: 0 !important;
    }
    /* Danh sách động trong khung tiêu đề (vd. sealife .title-content): căn lề, tách khỏi đoạn phụ đề */
    .shell-slide-instance .title-content ul[data-shell="bullets"] {
      margin-top: 18px;
      width: 100%;
      max-width: 960px;
      text-align: left;
      align-self: stretch;
    }
    /*
     * Comic (8.comic.html): giữ Bangers / Comic Neue và căn chỉnh như template gốc.
     * Shell trước đó ép system-ui + căn giữa flex khiến hero đẹp nhưng slide có .content-area bị “lơ” giữa khung.
     */
    .shell-theme-comic .shell-slide-instance.slide-container {
      align-items: center !important;
      justify-content: center !important;
    }
    .shell-theme-comic .shell-slide-instance .content-area {
      align-items: center !important;
    }
    /* Khung trắng trong vùng nội dung chính: bám trên, căn ngang giữa */
    .shell-theme-comic .shell-slide-instance .content-area .shell-panel-fit-sizer {
      align-items: flex-start !important;
      justify-content: center !important;
    }
    /* Hero / panel trắng trực tiếp dưới slide (BAM! / SPLASH!): căn giữa như mẫu */
    .shell-theme-comic .shell-slide-instance.slide-container > .comic-panel.shell-panel-fit-host > .shell-panel-fit-sizer {
      align-items: center !important;
      justify-content: center !important;
    }
    .shell-theme-comic .shell-slide-instance [data-shell="title"],
    .shell-theme-comic .shell-slide-instance .comic-title,
    .shell-theme-comic .shell-slide-instance .slide-title,
    .shell-theme-comic .shell-slide-instance .toc-item h3,
    .shell-theme-comic .shell-slide-instance .toc-item p {
      font-family: 'Bangers', system-ui, sans-serif !important;
    }
    .shell-theme-comic .shell-slide-instance h3 {
      font-family: 'Bangers', system-ui, sans-serif !important;
    }
    .shell-theme-comic .shell-slide-instance p:not([data-shell]),
    .shell-theme-comic .shell-slide-instance li,
    .shell-theme-comic .shell-slide-instance .subtitle,
    .shell-theme-comic .shell-slide-instance ul[data-shell="bullets"],
    .shell-theme-comic .shell-slide-instance ul[data-shell="bullets"] li {
      font-family: 'Comic Neue', 'Comic Sans MS', cursive, system-ui, sans-serif !important;
    }
    .shell-theme-comic .shell-slide-instance .comic-title,
    .shell-theme-comic .shell-slide-instance [data-shell="title"] {
      word-break: normal;
      overflow-wrap: break-word;
    }
  `;
  doc.head.appendChild(style);
}

/**
 * Script trong iframe: bọc nội dung khung trắng (.card / .comic-panel / .content-card),
 * đo kích thước và scale để vừa — không dùng thanh cuộn.
 * @param {Document} doc
 */
function injectShellPanelFitScript(doc) {
  if (doc.querySelector("script[data-slide-shell-panel-fit]")) return;
  const s = doc.createElement("script");
  s.setAttribute("data-slide-shell-panel-fit", "1");
  s.textContent = `(function(){
  function hasComicPanelAncestor(el) {
    var p = el.parentElement;
    while (p) {
      if (p.classList && p.classList.contains("comic-panel")) return true;
      p = p.parentElement;
    }
    return false;
  }
  function collectPanels(doc) {
    var sel = ".shell-slide-instance .card, .shell-slide-instance .content-card, .shell-slide-instance .comic-panel";
    return Array.prototype.filter.call(doc.querySelectorAll(sel), function (el) {
      if (el.classList.contains("comic-panel") && hasComicPanelAncestor(el)) return false;
      return true;
    });
  }
  function applyPanelLayoutToElement(cs, el, display) {
    if (!cs || !el) return;
    el.style.minWidth = "0";
    el.style.minHeight = "0";
    el.style.overflow = "visible";
    if (display.indexOf("flex") !== -1) {
      el.style.display = "flex";
      el.style.flexDirection = cs.flexDirection || "column";
      el.style.flexWrap = cs.flexWrap || "nowrap";
      el.style.justifyContent = cs.justifyContent || "flex-start";
      el.style.alignItems = cs.alignItems || "stretch";
      el.style.alignContent = cs.alignContent || "stretch";
      el.style.gap = cs.gap || "";
      el.style.rowGap = cs.rowGap || "";
      el.style.columnGap = cs.columnGap || "";
      el.style.flex = "1 1 auto";
      el.style.alignSelf = "stretch";
    } else if (display.indexOf("grid") !== -1) {
      el.style.display = "grid";
      el.style.gridTemplateColumns = cs.gridTemplateColumns || "";
      el.style.gridTemplateRows = cs.gridTemplateRows || "";
      el.style.gridAutoFlow = cs.gridAutoFlow || "";
      el.style.gridAutoColumns = cs.gridAutoColumns || "";
      el.style.gridAutoRows = cs.gridAutoRows || "";
      el.style.justifyItems = cs.justifyItems || "";
      el.style.alignItems = cs.alignItems || "";
      el.style.justifyContent = cs.justifyContent || "";
      el.style.alignContent = cs.alignContent || "";
      el.style.gap = cs.gap || "";
      el.style.rowGap = cs.rowGap || "";
      el.style.columnGap = cs.columnGap || "";
      el.style.justifySelf = "stretch";
      el.style.alignSelf = "stretch";
    } else if (display) {
      el.style.display = display;
    }
    el.style.width = "100%";
  }
  function applyPanelLayoutToScaled(panel, outer, scaled) {
    if (!panel || !outer || !scaled || !window.getComputedStyle) return;
    var cs = window.getComputedStyle(panel);
    var display = cs && cs.display ? cs.display : "";
    applyPanelLayoutToElement(cs, outer, display);
    applyPanelLayoutToElement(cs, scaled, display);
  }
  function wrapPanel(panel) {
    if (panel.querySelector(":scope > .shell-panel-fit-sizer")) return;
    panel.classList.add("shell-panel-fit-host");
    var sizer = document.createElement("div");
    sizer.className = "shell-panel-fit-sizer";
    var outer = document.createElement("div");
    outer.className = "shell-panel-fit-outer";
    var scaled = document.createElement("div");
    scaled.className = "shell-panel-fit-scaled";
    applyPanelLayoutToScaled(panel, outer, scaled);
    while (panel.firstChild) scaled.appendChild(panel.firstChild);
    outer.appendChild(scaled);
    sizer.appendChild(outer);
    panel.appendChild(sizer);
  }
  var fitEditPaused = false;
  function measureAndFit(panel) {
    if (fitEditPaused || (document.body && document.body.classList.contains("slide-visual-edit-on"))) return;
    var sizer = panel.querySelector(":scope > .shell-panel-fit-sizer");
    if (!sizer) return;
    var outer = sizer.querySelector(":scope > .shell-panel-fit-outer");
    var scaled = outer && outer.querySelector(":scope > .shell-panel-fit-scaled");
    if (!scaled) return;
    scaled.style.transform = "";
    scaled.style.width = "";
    scaled.style.height = "";
    if (outer) {
      outer.style.width = "";
      outer.style.height = "";
    }
    /* Không scale — CSS !important trong injectShellPreviewFit khớp chế độ Sửa (transform:none). */
  }
  function run() {
    if (fitEditPaused) return;
    if (document.body && document.body.classList.contains("slide-visual-edit-on")) return;
    collectPanels(document).forEach(function (panel) {
      wrapPanel(panel);
      measureAndFit(panel);
    });
  }
  window.__slideShellPanelFitRun = run;
  var shellPanelFitRO = null;
  function onWindowResizeForShellPanelFit() {
    run();
  }
  function teardownShellPanelFitObservers() {
    if (shellPanelFitRO) {
      try {
        shellPanelFitRO.disconnect();
      } catch (e) {}
      shellPanelFitRO = null;
    }
    try {
      window.removeEventListener("resize", onWindowResizeForShellPanelFit);
    } catch (e) {}
  }
  function setupShellPanelFitObservers() {
    teardownShellPanelFitObservers();
    if (typeof ResizeObserver !== "undefined") {
      shellPanelFitRO = new ResizeObserver(function () {
        run();
      });
      Array.prototype.forEach.call(document.querySelectorAll(".shell-slide-instance"), function (slide) {
        shellPanelFitRO.observe(slide);
      });
    } else {
      window.addEventListener("resize", onWindowResizeForShellPanelFit);
    }
  }
  /*
   * Bật Sửa: ngắt ResizeObserver + cờ pause — tránh race khiến run() vẫn scale cả khối
   * khi kéo một dòng chữ (scrollWidth/Height đổi → RO → đổi scale chung).
   * Tắt Sửa: gọi với on=false sau khi đã bỏ class slide-visual-edit-on trên body.
   */
  window.__slideShellPanelFitSetEditMode = function (on) {
    fitEditPaused = !!on;
    if (fitEditPaused) {
      teardownShellPanelFitObservers();
    } else {
      run();
      setupShellPanelFitObservers();
    }
  };
  function init() {
    function start() {
      run();
      setupShellPanelFitObservers();
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(start);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();`;
  doc.body.appendChild(s);
}

/** Minimal fallback if theme file has no recognizable slides. */
function minimalShellDocument(year) {
  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"/><title>Slide</title>
<style>
  *{box-sizing:border-box;} body{margin:0;padding:24px;background:#0f172a;font-family:system-ui,sans-serif;}
  #slides-master-container{display:grid;gap:24px;}
  .slide-container{width:min(1280px,100%);min-height:720px;margin:0 auto;border-radius:14px;padding:48px;background:#fff;box-shadow:0 16px 40px rgba(0,0,0,.35);}
  .slide-title{margin:0 0 20px;font-size:48px;font-weight:800;color:#1d4ed8;line-height:1.15;}
  ul[data-shell="bullets"]{margin:0;padding-left:28px;font-size:22px;line-height:1.55;}
</style></head><body>
<template id="layout-content"><div class="slide-container"><h2 class="slide-title" data-shell="title"></h2><ul data-shell="bullets"></ul></div></template>
<div id="slides-master-container" data-nav-mode="active"></div>
</body></html>`;
}

/**
 * Đưa .sticker (con trực tiếp của slide) vào trong khung .card / .content-card / .comic-panel:
 * emoji vẫn nằm trên nền trắng góc, nhưng thứ tự DOM đặt sticker trước → chữ/badge/nội dung vẽ đè lên, không bị che.
 * Theme sealife: slide có padding 60px, tọa độ absolute cũ gắn với slide → khi CB chuyển sang .card, bù trừ top/left (px).
 * @param {Element} slideRoot
 */
function relocateThemeStickersUnderSlideContent(slideRoot) {
  const preferSlideCorners = !!(
    slideRoot.querySelector(".title-card") ||
    slideRoot.querySelector(".section-card") ||
    slideRoot.querySelector(".outer-title") ||
    slideRoot.querySelector(".toc-grid") ||
    slideRoot.querySelector(".image-layout") ||
    slideRoot.querySelector(".activity-table") ||
    slideRoot.querySelector(".task-grid")
  );
  const host = preferSlideCorners
    ? slideRoot
    : slideRoot.querySelector(".card") || slideRoot.querySelector(".content-card") || slideRoot.querySelector(".comic-panel");
  if (!host) return;
  const stickers = Array.from(slideRoot.querySelectorAll(":scope > .sticker"));
  if (!stickers.length) return;
  const slidePad = Number(slideRoot.getAttribute("data-slide-pad"));
  const slidePadPx = Number.isFinite(slidePad) ? slidePad : SLIDE_PAD_PX_DEFAULT;
  /** @type {Map<string, number>} */
  const laneCounts = new Map();
  const inlineBasePx = preferSlideCorners ? 12 : 22;
  const inlineStepPx = preferSlideCorners ? 56 : 74;
  const topBasePx = preferSlideCorners && slideRoot.querySelector(".outer-title") ? 96 : preferSlideCorners ? 14 : 24;
  const topStepPx = 44;
  const bottomBasePx = preferSlideCorners ? 14 : 20;
  const bottomStepPx = 46;
  stickers.reverse().forEach((st) => {
    const side = st.style.right ? "right" : "left";
    const vertical = st.style.bottom ? "bottom" : "top";
    const laneKey = `${side}-${vertical}`;
    const lane = laneCounts.get(laneKey) || 0;
    const laneIndex = Number.isFinite(lane) && lane >= 0 ? lane : 0;
    laneCounts.set(laneKey, laneIndex + 1);
    st.dataset.stickerSide = side;
    st.dataset.stickerVertical = vertical;
    // Keep the full lane index so third/fourth stickers continue offsetting
    // instead of collapsing onto the second sticker in the same corner.
    st.dataset.stickerLane = String(laneIndex);
    st.style.setProperty("--sticker-inline-offset", `${inlineBasePx + laneIndex * inlineStepPx}px`);
    st.style.setProperty(
      "--sticker-block-offset",
      vertical === "bottom"
        ? `${bottomBasePx + laneIndex * bottomStepPx}px`
        : `${topBasePx + laneIndex * topStepPx}px`,
    );
    host.insertBefore(st, host.firstChild);
    const top = st.style.top;
    const left = st.style.left;
    const bottom = st.style.bottom;
    const right = st.style.right;
    if (top && /^\d+px$/.test(top.trim())) {
      const v = parseInt(top, 10);
      if (!Number.isNaN(v)) st.style.top = `${v - slidePadPx}px`;
    }
    if (left && /^\d+px$/.test(left.trim())) {
      const v = parseInt(left, 10);
      if (!Number.isNaN(v)) st.style.left = `${v - slidePadPx}px`;
    }
    if (bottom && /^-?\d+px$/.test(bottom.trim())) {
      const v = parseInt(bottom, 10);
      if (!Number.isNaN(v)) st.style.bottom = `${v - slidePadPx}px`;
    }
    if (right && /^\d+px$/.test(right.trim())) {
      const v = parseInt(right, 10);
      if (!Number.isNaN(v)) st.style.right = `${v - slidePadPx}px`;
    }
  });
}

/**
 * @param {ParentNode} root
 * @param {string} title
 * @param {string[]} bullets
 */
function fillContentSlots(root, title, bullets) {
  const titleEl = root.querySelector("[data-shell=\"title\"]");
  if (titleEl) titleEl.textContent = title;
  const ul = root.querySelector("ul[data-shell=\"bullets\"]");
  if (ul) {
    ul.replaceChildren();
    bullets.forEach((b) => {
      const li = ul.ownerDocument.createElement("li");
      li.textContent = b;
      ul.appendChild(li);
    });
  }
}

/**
 * Builds full HTML for iframe srcdoc: clones `layout-content` per slide.
 * @param {string} shellHtml raw shell file
 * @param {{ title?: string, bullets?: string[] }[]} slides
 * @param {Record<string, string>} meta
 * @returns {string}
 */
export function buildSlideDeckSrcdoc(shellHtml, slides, meta) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(shellHtml, "text/html");
  const year = String(meta?.shellYear || new Date().getFullYear());
  applyShellYear(doc, year);
  stripIframeScripts(doc);
  /** Comic template: đảm bảo class theme dù file chưa cập nhật tay */
  if (doc.querySelector('link[href*="Bangers"]') && doc.body && !doc.body.classList.contains("shell-theme-comic")) {
    doc.body.classList.add("shell-theme-comic");
  }

  let master = doc.querySelector("#slides-master-container");
  let tpl =
    doc.querySelector("template#layout-content") ||
    doc.querySelector("template#shell-slide-content") ||
    doc.querySelector("template[data-shell-layout=\"content\"]");

  if (!master || !tpl) {
    if (!ensureShellFromFullDeck(doc)) {
      doc = parser.parseFromString(minimalShellDocument(year), "text/html");
      applyShellYear(doc, year);
    }
  }

  master = doc.querySelector("#slides-master-container");
  const coverTemplate = getShellCoverTemplate(doc);
  const variantTemplates = getShellVariantTemplates(doc);

  if (!master || (!coverTemplate && !variantTemplates.length)) {
    injectShellPreviewFit(doc);
    injectShellPanelFitScript(doc);
    injectSlideVisualEditor(doc);
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  master.replaceChildren();

  const list = Array.isArray(slides) ? slides : [];
  const variantCount = variantTemplates.length;
  list.forEach((s, i) => {
    const pick =
      coverTemplate && i === 0
        ? coverTemplate
        : variantCount
          ? variantTemplates[(coverTemplate ? i - 1 : i) % variantCount]
          : coverTemplate;
    if (!pick) return;
    const frag = pick.content.cloneNode(true);
    const first = frag.firstElementChild;
    if (!first) return;
    first.setAttribute("data-shell-slide-index", String(i));
    first.classList.add("shell-slide-instance");
    fillContentSlots(frag, String(s?.title || ""), Array.isArray(s?.bullets) ? s.bullets.map(String) : []);
    if (first instanceof Element) relocateThemeStickersUnderSlideContent(first);
    master.appendChild(frag);
  });

  const navMode = meta?.slideNavMode === "scroll" ? "scroll" : "active";
  master.setAttribute("data-nav-mode", navMode);
  if (navMode === "active") {
    master.querySelectorAll(".shell-slide-instance").forEach((el, i) => {
      el.classList.toggle("active", i === 0);
    });
  } else {
    master.querySelectorAll(".shell-slide-instance").forEach((el) => el.classList.remove("active"));
  }

  injectShellPreviewFit(doc);
  injectShellPanelFitScript(doc);
  injectSlideVisualEditor(doc);
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {boolean} enabled
 */
export function setSlideVisualEditMode(iframe, enabled) {
  try {
    const w = /** @type {{ __setSlideVisualEditEnabled?: (v: boolean) => void }} */ (iframe.contentWindow);
    w?.__setSlideVisualEditEnabled?.(!!enabled);
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {number} index
 */
export function scrollShellSlideIntoView(iframe, index) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const el = doc.querySelector(`[data-shell-slide-index="${index}"]`);
  if (el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "auto", block: "start" });
  }
}

/**
 * @param {HTMLIFrameElement} iframe
 * @returns {number}
 */
function measureSlideShellDeckHeight(iframe) {
  const doc = iframe.contentDocument;
  if (!doc) return 0;
  const master = doc.querySelector("#slides-master-container");
  const body = doc.body;
  const root = doc.documentElement;
  const values = [
    master?.scrollHeight || 0,
    body?.scrollHeight || 0,
    body?.offsetHeight || 0,
    root?.scrollHeight || 0,
    root?.offsetHeight || 0,
  ];
  if (master && typeof master.getBoundingClientRect === "function") {
    values.push(master.getBoundingClientRect().height || 0);
  }
  return Math.max(...values.map((n) => Math.ceil(Number(n) || 0)), 0);
}

/**
 * @param {Document} doc
 * @param {"active" | "scroll"} mode
 */
function setSlideShellDocumentViewportMode(doc, mode) {
  const root = doc.documentElement;
  const body = doc.body;
  const master = doc.querySelector("#slides-master-container");
  [root, body, master].forEach((node) => {
    if (!node) return;
    if (mode === "active") {
      node.style.overflowX = "hidden";
      node.style.removeProperty("overflow-y");
    } else {
      node.style.removeProperty("overflow");
      node.style.removeProperty("overflow-x");
      node.style.removeProperty("overflow-y");
    }
  });
}

/**
 * @param {Document} doc
 */
function readSlideShellDocumentScroll(doc) {
  const nodes = [doc.scrollingElement, doc.documentElement, doc.body];
  for (const node of nodes) {
    if (!node) continue;
    const top = Number(node.scrollTop);
    if (Number.isFinite(top) && top > 0) return top;
  }
  return 0;
}

/**
 * @param {Document} doc
 * @returns {{ top: number, max: number }}
 */
function measureSlideShellDocumentScrollMetrics(doc) {
  const root = doc.documentElement;
  const body = doc.body;
  const scrolling = doc.scrollingElement;
  const nodes = [scrolling, root, body];
  const viewportHeight = Math.max(
    Number(doc.defaultView?.innerHeight) || 0,
    Number(root?.clientHeight) || 0,
    Number(body?.clientHeight) || 0,
  );
  const maxScroll = Math.max(
    Number(scrolling?.scrollHeight || 0) - Number(scrolling?.clientHeight || viewportHeight),
    Number(root?.scrollHeight || 0) - Number(root?.clientHeight || viewportHeight),
    Number(body?.scrollHeight || 0) - Number(body?.clientHeight || viewportHeight),
    0,
  );
  let top = 0;
  for (const node of nodes) {
    if (!node) continue;
    const nextTop = Number(node.scrollTop);
    if (Number.isFinite(nextTop) && nextTop > 0) {
      top = nextTop;
      break;
    }
  }
  return {
    top,
    max: Math.max(0, Math.ceil(maxScroll)),
  };
}

/**
 * @param {Document} doc
 * @param {{ top?: number, ratio?: number } | undefined} scrollState
 * @returns {number}
 */
function resolveSlideShellDocumentScrollTop(doc, scrollState) {
  const { max } = measureSlideShellDocumentScrollMetrics(doc);
  if (!scrollState || max <= 0) return 0;
  const ratio = Number(scrollState.ratio);
  if (Number.isFinite(ratio) && ratio > 0) {
    return Math.max(0, Math.min(max, Math.round(max * Math.max(0, Math.min(1, ratio)))));
  }
  const top = Number(scrollState.top);
  if (Number.isFinite(top) && top > 0) {
    return Math.max(0, Math.min(max, Math.round(top)));
  }
  return 0;
}

/**
 * @param {Document} doc
 * @param {number} top
 */
function setSlideShellDocumentScroll(doc, top = 0) {
  const nextTop = Math.max(0, Math.round(Number(top) || 0));
  const nodes = [doc.scrollingElement, doc.documentElement, doc.body];
  nodes.forEach((node) => {
    if (!node) return;
    node.scrollTop = nextTop;
    node.scrollLeft = 0;
  });
  try {
    doc.defaultView?.scrollTo(0, nextTop);
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {HTMLIFrameElement} iframe
 */
function syncSlideShellScrollViewport(iframe) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const master = doc.querySelector("#slides-master-container");
  if (!master || master.getAttribute("data-nav-mode") !== "scroll") return;
  setSlideShellDocumentViewportMode(doc, "scroll");
  const height = measureSlideShellDeckHeight(iframe);
  if (height > 0) {
    iframe.style.height = `${height}px`;
  }
  iframe.style.aspectRatio = "auto";
  iframe.style.overflow = "hidden";
}

/**
 * @param {{ raf1?: number | null, raf2?: number | null, timeoutId?: number | null, cancelRaf?: ((id: number) => void) | null } | undefined} job
 */
function cancelSlideShellViewportSyncJob(job) {
  if (!job) return;
  if (job.cancelRaf) {
    if (job.raf1 != null) job.cancelRaf(job.raf1);
    if (job.raf2 != null) job.cancelRaf(job.raf2);
  }
  if (job.timeoutId != null) {
    clearTimeout(job.timeoutId);
  }
}

/**
 * @param {HTMLIFrameElement} iframe
 */
function scheduleSlideShellScrollViewportSync(iframe) {
  cancelSlideShellViewportSyncJob(slideShellScrollViewportSyncJobs.get(iframe));
  syncSlideShellScrollViewport(iframe);
  const win = iframe.contentWindow;
  const raf =
    (win && typeof win.requestAnimationFrame === "function" && win.requestAnimationFrame.bind(win)) ||
    (typeof requestAnimationFrame === "function" ? requestAnimationFrame.bind(window) : null);
  const cancelRaf =
    (win && typeof win.cancelAnimationFrame === "function" && win.cancelAnimationFrame.bind(win)) ||
    (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame.bind(window) : null);
  const job = { raf1: null, raf2: null, timeoutId: null, cancelRaf };
  slideShellScrollViewportSyncJobs.set(iframe, job);
  const runIfCurrent = () => {
    if (slideShellScrollViewportSyncJobs.get(iframe) !== job) return false;
    syncSlideShellScrollViewport(iframe);
    return true;
  };
  if (raf) {
    job.raf1 = raf(() => {
      job.raf1 = null;
      if (!runIfCurrent()) return;
      job.raf2 = raf(() => {
        job.raf2 = null;
        runIfCurrent();
      });
    });
  }
  job.timeoutId = setTimeout(() => {
    job.timeoutId = null;
    runIfCurrent();
  }, 80);
}

/**
 * @param {Element} slide
 * @returns {number}
 */
function measureSlideShellActiveHeight(slide) {
  if (!slide || typeof slide.getBoundingClientRect !== "function") return 0;
  const slideRect = slide.getBoundingClientRect();
  const win = slide.ownerDocument?.defaultView || window;
  let maxBottom = slideRect.bottom;
  const nodes = slide.querySelectorAll("*");
  nodes.forEach((node) => {
    if (!node || node.nodeType !== 1) return;
    const cs = win.getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden") return;
    const rect = node.getBoundingClientRect();
    if (!rect || (!rect.height && !rect.width)) return;
    maxBottom = Math.max(maxBottom, rect.bottom);
  });
  const ownHeights = [
    slide.scrollHeight || 0,
    slide.offsetHeight || 0,
    slide.clientHeight || 0,
    slideRect.height || 0,
    maxBottom - slideRect.top,
  ];
  return Math.max(...ownHeights.map((n) => Math.ceil(Number(n) || 0)), 0);
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {{ top?: number, ratio?: number } | undefined} scrollState
 */
function syncSlideShellActiveViewport(iframe, scrollState) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const master = doc.querySelector("#slides-master-container");
  if (!master || master.getAttribute("data-nav-mode") !== "active") return;
  setSlideShellDocumentViewportMode(doc, "active");
  const activeSlide =
    doc.querySelector(".shell-slide-instance.active") ||
    doc.querySelector(".shell-slide-instance");
  const height = activeSlide ? measureSlideShellActiveHeight(activeSlide) : 0;
  if (height > 0) {
    iframe.style.height = `${height}px`;
  } else {
    iframe.style.removeProperty("height");
  }
  iframe.style.aspectRatio = "auto";
  iframe.style.overflow = "hidden";
  setSlideShellDocumentScroll(doc, resolveSlideShellDocumentScrollTop(doc, scrollState));
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {{ top?: number, ratio?: number } | undefined} scrollState
 */
function scheduleSlideShellActiveViewportSync(iframe, scrollState) {
  cancelSlideShellViewportSyncJob(slideShellActiveViewportSyncJobs.get(iframe));
  syncSlideShellActiveViewport(iframe, scrollState);
  const win = iframe.contentWindow;
  const raf =
    (win && typeof win.requestAnimationFrame === "function" && win.requestAnimationFrame.bind(win)) ||
    (typeof requestAnimationFrame === "function" ? requestAnimationFrame.bind(window) : null);
  const cancelRaf =
    (win && typeof win.cancelAnimationFrame === "function" && win.cancelAnimationFrame.bind(win)) ||
    (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame.bind(window) : null);
  const job = { raf1: null, raf2: null, timeoutId: null, cancelRaf };
  slideShellActiveViewportSyncJobs.set(iframe, job);
  const runIfCurrent = () => {
    if (slideShellActiveViewportSyncJobs.get(iframe) !== job) return false;
    syncSlideShellActiveViewport(iframe, scrollState);
    return true;
  };
  if (raf) {
    job.raf1 = raf(() => {
      job.raf1 = null;
      if (!runIfCurrent()) return;
      job.raf2 = raf(() => {
        job.raf2 = null;
        runIfCurrent();
      });
    });
  }
  job.timeoutId = setTimeout(() => {
    job.timeoutId = null;
    runIfCurrent();
  }, 80);
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {number} index
 * @param {{ top?: number, ratio?: number } | undefined} [scrollState]
 */
export function syncShellSlideNav(iframe, index, scrollState) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  try {
    const w = /** @type {{ __slideVisualEditIndex?: number, __slideVisualEditorRefresh?: () => void }} */ (
      iframe.contentWindow
    );
    if (w) w.__slideVisualEditIndex = index;
    w?.__slideVisualEditorRefresh?.();
  } catch (_) {
    /* ignore */
  }
  const master = doc.querySelector("#slides-master-container");
  const mode = master?.getAttribute("data-nav-mode") || "scroll";
  const inst = doc.querySelectorAll(".shell-slide-instance");
  if (!inst.length) return;
  const idx = Math.min(Math.max(0, Number(index) || 0), inst.length - 1);
  if (mode === "active") {
    inst.forEach((el, i) => {
      el.classList.toggle("active", i === idx);
    });
    scheduleSlideShellActiveViewportSync(iframe, scrollState);
    return;
  }
  scheduleSlideShellScrollViewportSync(iframe);
  scrollShellSlideIntoView(iframe, idx);
}

/**
 * @param {HTMLIFrameElement} iframe
 * @param {"active" | "scroll"} mode
 * @param {number} index current slide index
 * @param {{ top?: number, ratio?: number } | undefined} [scrollState]
 */
export function setSlideShellNavMode(iframe, mode, index, scrollState) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const master = doc.querySelector("#slides-master-container");
  if (!master) return;
  const next = mode === "scroll" ? "scroll" : "active";
  master.setAttribute("data-nav-mode", next);
  const inst = doc.querySelectorAll(".shell-slide-instance");
  if (!inst.length) return;
  const idx = Math.min(Math.max(0, index), inst.length - 1);
  try {
    const w = /** @type {{ __slideVisualEditIndex?: number, __slideVisualEditorRefresh?: () => void }} */ (
      iframe.contentWindow
    );
    if (w) w.__slideVisualEditIndex = idx;
    w?.__slideVisualEditorRefresh?.();
  } catch (_) {
    /* ignore */
  }
  if (next === "active") {
    inst.forEach((el, j) => el.classList.toggle("active", j === idx));
    scheduleSlideShellActiveViewportSync(iframe, scrollState);
    return;
  }
  inst.forEach((el) => el.classList.remove("active"));
  scheduleSlideShellScrollViewportSync(iframe);
  scrollShellSlideIntoView(iframe, idx);
}

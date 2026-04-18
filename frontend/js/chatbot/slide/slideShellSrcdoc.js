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
    ul.innerHTML = "";
  } else {
    const sink = root.querySelector(".content-area") || root.querySelector(".comic-panel") || root;
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

  const roots = collectStaticSlideRoots(doc);
  if (!roots.length) return false;

  roots.forEach((root, idx) => {
    const proto = root.cloneNode(true);
    decorateSlidePrototype(proto, doc);
    const t = doc.createElement("template");
    t.id = idx === 0 ? "layout-content" : `layout-content-v${idx}`;
    t.setAttribute("data-shell-layout-variant", String(idx));
    t.content.appendChild(proto);
    doc.body.appendChild(t);
  });

  roots.forEach((r) => r.remove());

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
    }
    .shell-slide-instance .content-area {
      max-width: 100% !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
  `;
  doc.head.appendChild(style);
}

/** Minimal fallback if theme file has no recognizable slides. */
function minimalShellDocument(year) {
  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"/><title>Slide</title>
<style>
  *{box-sizing:border-box;} body{margin:0;padding:24px;background:#0f172a;font-family:system-ui,sans-serif;}
  #slides-master-container{display:grid;gap:24px;}
  .slide-container{width:min(1280px,100%);min-height:720px;margin:0 auto;border-radius:14px;padding:48px;background:#fff;box-shadow:0 16px 40px rgba(0,0,0,.35);}
  .slide-title{margin:0 0 20px;font-size:clamp(28px,3vw,48px);font-weight:800;color:#1d4ed8;}
  ul[data-shell="bullets"]{margin:0;padding-left:28px;font-size:clamp(18px,1.8vw,28px);line-height:1.5;}
</style></head><body>
<template id="layout-content"><div class="slide-container"><h2 class="slide-title" data-shell="title"></h2><ul data-shell="bullets"></ul></div></template>
<div id="slides-master-container" data-nav-mode="scroll"></div>
</body></html>`;
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
    ul.innerHTML = "";
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
  const variantTemplates = getShellVariantTemplates(doc);

  if (!master || !variantTemplates.length) {
    injectShellPreviewFit(doc);
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  master.innerHTML = "";

  const list = Array.isArray(slides) ? slides : [];
  const variantCount = variantTemplates.length;
  list.forEach((s, i) => {
    const pick = variantTemplates[i % variantCount];
    const frag = pick.content.cloneNode(true);
    const first = frag.firstElementChild;
    if (!first) return;
    first.setAttribute("data-shell-slide-index", String(i));
    first.classList.add("shell-slide-instance");
    fillContentSlots(frag, String(s?.title || ""), Array.isArray(s?.bullets) ? s.bullets.map(String) : []);
    master.appendChild(frag);
  });

  if (master.getAttribute("data-nav-mode") === "active") {
    master.querySelectorAll(".shell-slide-instance").forEach((el, i) => {
      el.classList.toggle("active", i === 0);
    });
  }

  injectShellPreviewFit(doc);
  return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
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
 * @param {number} index
 */
export function syncShellSlideNav(iframe, index) {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const master = doc.querySelector("#slides-master-container");
  const mode = master?.getAttribute("data-nav-mode") || "scroll";
  const inst = doc.querySelectorAll(".shell-slide-instance");
  if (!inst.length) return;
  if (mode === "active") {
    inst.forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });
    return;
  }
  scrollShellSlideIntoView(iframe, index);
}

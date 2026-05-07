import { SLIDE_PAD_PX_DEFAULT } from "../constants.js";
import { SLIDE_VISUAL_EDITOR_CSS, SLIDE_VISUAL_EDITOR_JS } from "./slideVisualEditorIframe.js";

const slideShellScrollViewportSyncJobs = new WeakMap();
const slideShellActiveViewportSyncJobs = new WeakMap();
const SLIDE_SHELL_DESKTOP_VIEWPORT_WIDTH_PX = 1280;
const SLIDE_SHELL_MOBILE_VIEWPORT_WIDTH_PX = 1600;
const SLIDE_SHELL_STAGE_WIDTH_PX = 1280;
const SLIDE_SHELL_MOBILE_INLINE_GUTTER_PX = 16;
const SLIDE_SHELL_MOBILE_BLOCK_GUTTER_PX = 20;
const SLIDE_SHELL_MOBILE_FRAME_FOOTER_GAP_PX = 12;

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

/**
 * Force the slide shell to keep a desktop-sized viewport even when the host device
 * is a phone, so theme templates render exactly like their original PC layout.
 *
 * @param {Document} doc
 */
function enforceSlideShellDesktopViewport(doc) {
  const viewportContent = `width=${SLIDE_SHELL_DESKTOP_VIEWPORT_WIDTH_PX}, initial-scale=1.0`;
  let viewportMeta = doc.querySelector('meta[name="viewport"]');
  if (!(viewportMeta instanceof HTMLMetaElement)) {
    viewportMeta = doc.createElement("meta");
    viewportMeta.setAttribute("name", "viewport");
    doc.head?.prepend(viewportMeta);
  }
  viewportMeta.setAttribute("content", viewportContent);
}

/**
 * @param {Document} doc
 * @param {number} viewportWidth
 */
function setSlideShellViewportWidth(doc, viewportWidth) {
  const safeViewportWidth = Math.max(1, Math.round(Number(viewportWidth) || SLIDE_SHELL_DESKTOP_VIEWPORT_WIDTH_PX));
  let viewportMeta = doc.querySelector('meta[name="viewport"]');
  if (!(viewportMeta instanceof HTMLMetaElement)) {
    viewportMeta = doc.createElement("meta");
    viewportMeta.setAttribute("name", "viewport");
    doc.head?.prepend(viewportMeta);
  }
  viewportMeta.setAttribute("content", `width=${safeViewportWidth}, initial-scale=1.0`);
  doc.documentElement?.style.setProperty("--slide-shell-preview-viewport-width", `${safeViewportWidth}px`);
  doc.documentElement?.style.setProperty("--slide-shell-preview-stage-width", `${SLIDE_SHELL_STAGE_WIDTH_PX}px`);
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
 * Keep the source order of theme layouts intact.
 * We intentionally do not filter out table/grid/timeline slides here because the editor
 * now relies on the full set of authored slide variants to avoid visible repetition when
 * users generate a 30-slide deck from a 30-layout template.
 * @param {Document} doc
 * @param {Element[]} roots
 * @returns {Element[]}
 */
function filterShellVariantRoots(doc, roots) {
  void doc;
  return roots;
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
    panel.querySelector(".comic-title") ||
    panel.querySelector("h1") ||
    panel.querySelector("h2") ||
    root.querySelector("h2.slide-title") ||
    root.querySelector("h1") ||
    root.querySelector("h2") ||
    panel.querySelector("p");
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
 * @param {Element} el
 * @returns {boolean}
 */
function isDecorativeShellNode(el) {
  const cls =
    typeof el.className === "string"
      ? el.className
      : Array.isArray(el.classList)
        ? el.classList.join(" ")
        : String(el.getAttribute?.("class") || "");
  if (/(badge|decor|sticker|spark|shape|burst|bubble|ribbon|tag|halo|glow|star|pow|bam|wham|zap|boom|swoosh|flash|snap|crack)/i.test(cls)) {
    return true;
  }
  if (el.tagName === "I" && /\bfa[srldb]?\b|\bfa-/.test(cls)) return true;
  return false;
}

/**
 * @param {Element} root
 * @returns {Element}
 */
function resolveShellContentSink(root) {
  return (
    root.querySelector(
      ".content-area, .bullet-list, .text-column, .text-content, .content-panel, .panel-content, .section-center, .title-group, .title-content, .content-card, .comic-panel, .card",
    ) || root
  );
}

/**
 * @param {Element} sink
 * @param {Element | null} title
 * @returns {Element[]}
 */
function collectShellTextTargets(sink, title) {
  const selector = [
    "li",
    "p",
    "td",
    "th",
    "blockquote",
    "cite",
    "h3",
    "h4",
    ".t-desc",
    ".label",
    ".box-label",
    ".subtitle",
    ".text-column p",
    ".timeline-content p",
    ".timeline-content h4",
    ".timeline-item h3",
    ".timeline-item p",
    ".tile h3",
    ".tile p",
    ".small-tile h3",
    ".small-tile p",
    ".label-pill",
    ".row-text",
    ".mini-panel h3",
    ".mini-panel p",
    ".g-card h3",
    ".g-card p",
    ".error-item h3",
    ".error-item p",
    ".v-card h3",
    ".v-card p",
    ".tl-card strong",
    ".tl-card p",
    ".time-item .t-desc",
  ].join(", ");
  return Array.from(sink.querySelectorAll(selector)).filter((el) => {
    if (!(el instanceof Element)) return false;
    if (title && (el === title || el.contains(title))) return false;
    if (isDecorativeShellNode(el)) return false;
    if (el.querySelector(selector)) return false;
    return true;
  });
}

/**
 * @param {Document} doc
 * @param {Element} sink
 * @returns {HTMLUListElement}
 */
function ensureFallbackShellList(doc, sink) {
  let body = sink.querySelector('[data-shell="body"]');
  if (!(body instanceof HTMLElement)) {
    body = doc.createElement("div");
    body.className = "shell-dynamic-body";
    body.setAttribute("data-shell", "body");
    sink.appendChild(body);
  }
  let list = body.querySelector('ul[data-shell="bullets"]');
  if (!(list instanceof HTMLUListElement)) {
    list = doc.createElement("ul");
    list.setAttribute("data-shell", "bullets");
    body.appendChild(list);
  }
  return list;
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function splitSlideTextFragments(value) {
  const source = String(value || "").replace(/\r\n/g, "\n");
  const raw = source.replace(/\s+/g, " ").trim();
  if (!raw) return [];
  if (source.includes("\n")) {
    return [];
  }
  if (/^(?:track|mạch|mach)\s+\d+\s*:/iu.test(raw)) {
    return [];
  }
  return raw
    .split(/\s*(?:\||•|;)\s*|\.\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeSlideHeadline(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const routeMatch = raw.match(/^(?:mạch|mach)\s+(\d+)\b/iu);
  if (routeMatch) {
    return `Track ${routeMatch[1]}`;
  }
  return raw;
}

/**
 * @param {string} value
 * @returns {{ headline: string, detail: string }}
 */
function buildSlideTextPair(value) {
  const raw = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
  if (!raw) return { headline: "", detail: "" };
  const routeLines = raw.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  if (routeLines.length > 1 && /^(?:track|mạch|mach)\s+\d+\s*:/iu.test(routeLines[0])) {
    const firstLine = routeLines[0];
    const match = firstLine.match(/^((?:Track|Mạch)\s+\d+)\s*:\s*(.+)$/iu);
    const headline = match ? normalizeSlideHeadline(match[1]) : normalizeSlideHeadline(firstLine);
    const detailLines = [
      match ? match[2].trim() : "",
      ...routeLines.slice(1),
    ].filter(Boolean);
    return {
      headline,
      detail: detailLines.join("\n"),
    };
  }
  const colonParts = raw.split(/\s*:\s*/).map((part) => part.trim()).filter(Boolean);
  if (colonParts.length >= 2) {
    return {
      headline: normalizeSlideHeadline(colonParts[0]),
      detail: colonParts.slice(1).join(": "),
    };
  }
  const arrowParts = raw.split(/\s*->\s*/).map((part) => part.trim()).filter(Boolean);
  if (arrowParts.length >= 2) {
    return {
      headline: normalizeSlideHeadline(arrowParts[0]),
      detail: arrowParts.slice(1).join(" -> "),
    };
  }
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length >= 10) {
    return {
      headline: normalizeSlideHeadline(words.slice(0, 5).join(" ")),
      detail: raw,
    };
  }
  return {
    headline: normalizeSlideHeadline(raw),
    detail: raw,
  };
}

/**
 * @param {string} title
 * @param {string[]} bullets
 * @param {number} want
 * @returns {Array<{ headline: string, detail: string }>}
 */
function buildSlideTextPool(title, bullets, want) {
  const unique = [];
  const seen = new Set();
  const push = (value) => {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(normalized);
  };

  bullets.forEach((bullet) => {
    push(bullet);
    splitSlideTextFragments(bullet).forEach(push);
  });
  push(title);

  const pool = unique.map((item) => buildSlideTextPair(item)).filter((item) => item.headline || item.detail);
  if (!pool.length) return Array.from({ length: Math.max(1, want) }, () => ({ headline: title, detail: title }));
  while (pool.length < want) {
    const next = pool[pool.length % Math.max(1, unique.length)];
    pool.push({
      headline: next.headline,
      detail: next.detail || next.headline,
    });
  }
  return pool;
}

/**
 * @param {string[]} values
 * @returns {string[]}
 */
function collectUniqueSlideTextValues(values) {
  const unique = [];
  const seen = new Set();
  values.forEach((value) => {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(normalized);
  });
  return unique;
}

/**
 * @param {ParentNode} root
 * @returns {Element | null}
 */
function getRootSlideElement(root) {
  if (root instanceof Element) {
    return root;
  }
  if (root && "querySelector" in root) {
    const nestedSlide = root.querySelector(".shell-slide-instance, .slide-container, .slide");
    if (nestedSlide instanceof Element) {
      return nestedSlide;
    }
  }
  return root && "firstElementChild" in root && root.firstElementChild instanceof Element
    ? root.firstElementChild
    : null;
}

/**
 * @param {ParentNode} root
 * @param {{ forceSpaceBright?: boolean }} [opts]
 * @returns {"comic" | "space-bright" | "space-black" | "sealife" | ""}
 */
function resolveSlideShellThemeKey(root, opts = {}) {
  if (opts.forceSpaceBright) return "space-bright";
  const slide = getRootSlideElement(root);
  const doc =
    slide?.ownerDocument ||
    (root && "ownerDocument" in root ? root.ownerDocument : null) ||
    (root && "firstElementChild" in root ? root.firstElementChild?.ownerDocument : null);
  const classList = doc?.body?.classList;
  if (
    classList?.contains("shell-theme-comic") ||
    slide?.querySelector?.(
      ".comic-panel, .comic-list, .comic-title, .comic-grid-2, .comic-grid-3, .strategy-strip, .check-grid, .timeline",
    )
  ) {
    return "comic";
  }
  if (classList?.contains("shell-theme-space-bright")) return "space-bright";
  if (classList?.contains("shell-theme-space-black")) return "space-black";
  if (classList?.contains("shell-theme-sealife")) return "sealife";
  if (
    slide?.querySelector?.(
      ".title-card, .section-card, .outer-title, .cols-3, .task-grid, .timeline-container, .pct-item, .image-layout",
    )
  ) {
    return "sealife";
  }
  return "";
}

/**
 * @param {ParentNode} root
 * @returns {boolean}
 */
function isSpaceBrightSlideRoot(root) {
  return resolveSlideShellThemeKey(root) === "space-bright";
}

/**
 * @param {string} value
 * @param {{ maxChars?: number, maxSentences?: number, maxWords?: number }} [opts]
 * @returns {string}
 */
function compactSlideTextValue(value, opts = {}) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const maxWordsRaw = Math.floor(Number(opts.maxWords) || 0);
  const maxWords = maxWordsRaw > 0 ? maxWordsRaw : 0;
  let next = raw;
  if (maxWords) {
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) {
      next = `${words.slice(0, maxWords).join(" ")}...`;
    }
  }
  const sentences = next
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const maxSentencesRaw = Math.floor(Number(opts.maxSentences) || 0);
  const maxSentences = maxSentencesRaw > 0 ? maxSentencesRaw : 0;
  if (maxSentences && sentences.length > maxSentences) {
    next = sentences.slice(0, maxSentences).join(" ");
  }
  const maxCharsRaw = Math.floor(Number(opts.maxChars) || 0);
  const maxChars = maxCharsRaw > 0 ? maxCharsRaw : 0;
  if (maxChars && next.length > maxChars) {
    const trimmed = next.slice(0, maxChars).replace(/[,:;\s]+$/u, "").trim();
    return `${trimmed}...`;
  }
  return next;
}

/**
 * @param {string} value
 * @returns {string}
 */
function capitalizeSlideLead(value) {
  const raw = String(value || "");
  const match = raw.match(/\p{L}/u);
  if (!match || match.index == null) return raw;
  const idx = match.index;
  return `${raw.slice(0, idx)}${raw.slice(idx, idx + 1).toLocaleUpperCase("vi-VN")}${raw.slice(idx + 1)}`;
}

/**
 * @param {ParentNode} root
 * @returns {{ headline: { maxWords: number, maxChars: number }, detail: { maxChars: number, maxSentences: number } }}
 */
function getSpaceBrightTextBudget(root) {
  const slide = getRootSlideElement(root);
  if (!slide) {
    return {
      headline: { maxWords: 6, maxChars: 42 },
      detail: { maxChars: 100, maxSentences: 1 },
    };
  }
  if (slide.querySelector(".grid-2 .table-like") && slide.querySelector(".grid-2 .big-icon")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 38, maxSentences: 1 },
    };
  }
  if (slide.querySelector(".tiled-content > .tile")) {
    return {
      headline: { maxWords: 6, maxChars: 36 },
      detail: { maxChars: 88, maxSentences: 1 },
    };
  }
  if (slide.querySelector(".grid-3 > .small-tile, .grid-2 > .small-tile")) {
    return {
      headline: { maxWords: 5, maxChars: 30 },
      detail: { maxChars: 82, maxSentences: 1 },
    };
  }
  if (slide.querySelector(".table-like")) {
    return {
      headline: { maxWords: 4, maxChars: 22 },
      detail: { maxChars: 72, maxSentences: 1 },
    };
  }
  if (slide.querySelector(".timeline-layout")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 54, maxSentences: 1 },
    };
  }
  if (slide.querySelector(".quote-layout")) {
    return {
      headline: { maxWords: 6, maxChars: 34 },
      detail: { maxChars: 110, maxSentences: 1 },
    };
  }
  if (slide.querySelector(".two-column")) {
    return {
      headline: { maxWords: 6, maxChars: 38 },
      detail: { maxChars: 84, maxSentences: 1 },
    };
  }
  return {
      headline: { maxWords: 6, maxChars: 42 },
      detail: { maxChars: 96, maxSentences: 1 },
  };
}

/**
 * @param {ParentNode} root
 * @returns {{ headline: { maxWords: number, maxChars: number }, detail: { maxChars: number, maxSentences: number } }}
 */
function getSpaceBlackTextBudget(root) {
  const slide = getRootSlideElement(root);
  if (!slide) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 72, maxSentences: 1, maxWords: 12 },
    };
  }
  if (slide.querySelector(".grid-2 .table-like") && slide.querySelector(".grid-2 .big-icon")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 40, maxSentences: 1, maxWords: 8 },
    };
  }
  if (slide.querySelector(".table-like")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 56, maxSentences: 1, maxWords: 10 },
    };
  }
  if (slide.querySelector(".grid-2 > .small-tile, .grid-3 > .small-tile")) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 62, maxSentences: 1, maxWords: 11 },
    };
  }
  if (slide.querySelector(".timeline-layout")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 44, maxSentences: 1, maxWords: 9 },
    };
  }
  if (slide.querySelector(".styled-bullets")) {
    return {
      headline: { maxWords: 4, maxChars: 22 },
      detail: { maxChars: 60, maxSentences: 1, maxWords: 11 },
    };
  }
  if (slide.querySelector(".tiled-content > .tile")) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 64, maxSentences: 1, maxWords: 10 },
    };
  }
  if (slide.querySelector(".two-column")) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 60, maxSentences: 1, maxWords: 10 },
    };
  }
  return {
    headline: { maxWords: 4, maxChars: 26 },
    detail: { maxChars: 68, maxSentences: 1, maxWords: 12 },
  };
}

/**
 * @param {ParentNode} root
 * @returns {{ headline: { maxWords: number, maxChars: number }, detail: { maxChars: number, maxSentences: number } }}
 */
function getSealifeTextBudget(root) {
  const slide = getRootSlideElement(root);
  if (!slide) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 88, maxSentences: 2, maxWords: 18 },
    };
  }
  if (slide.querySelector(".cols-3")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 38, maxSentences: 1, maxWords: 7 },
    };
  }
  if (slide.querySelector(".task-grid")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 40, maxSentences: 1, maxWords: 7 },
    };
  }
  if (slide.querySelector(".table-like")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 50, maxSentences: 1, maxWords: 9 },
    };
  }
  if (slide.querySelector(".timeline-container")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 38, maxSentences: 1, maxWords: 7 },
    };
  }
  if (slide.querySelector(".pct-item")) {
    return {
      headline: { maxWords: 3, maxChars: 18 },
      detail: { maxChars: 42, maxSentences: 1, maxWords: 8 },
    };
  }
  if (slide.querySelector(".image-layout")) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 180, maxSentences: 2, maxWords: 36 },
    };
  }
  if (slide.querySelector(".title-card, .section-card")) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 260, maxSentences: 2, maxWords: 52 },
    };
  }
  return {
    headline: { maxWords: 4, maxChars: 24 },
    detail: { maxChars: 88, maxSentences: 2, maxWords: 18 },
  };
}

/**
 * @param {ParentNode} root
 * @returns {{ headline: { maxWords: number, maxChars: number }, detail: { maxChars: number, maxSentences: number, maxWords?: number } }}
 */
function getComicTextBudget(root) {
  const slide = getRootSlideElement(root);
  if (!slide) {
    return {
      headline: { maxWords: 6, maxChars: 42 },
      detail: { maxChars: 52, maxSentences: 1, maxWords: 10 },
    };
  }
  if (slide.querySelector(".two-column .comic-list")) {
    return {
      headline: { maxWords: 5, maxChars: 30 },
      detail: { maxChars: 48, maxSentences: 1, maxWords: 9 },
    };
  }
  if (slide.querySelector(".comic-grid-2 .comic-list")) {
    return {
      headline: { maxWords: 4, maxChars: 26 },
      detail: { maxChars: 40, maxSentences: 1, maxWords: 8 },
    };
  }
  if (slide.querySelector(".comic-list") && slide.querySelector("img, .image-wrapper")) {
    return {
      headline: { maxWords: 5, maxChars: 32 },
      detail: { maxChars: 52, maxSentences: 1, maxWords: 10 },
    };
  }
  if (slide.querySelector(".comic-list")) {
    return {
      headline: { maxWords: 5, maxChars: 34 },
      detail: { maxChars: 54, maxSentences: 1, maxWords: 10 },
    };
  }
  if (slide.querySelector(".table-layout")) {
    return {
      headline: { maxWords: 4, maxChars: 24 },
      detail: { maxChars: 32, maxSentences: 1, maxWords: 7 },
    };
  }
  if (slide.querySelector(".pronunciation-stack, .comic-rule-grid")) {
    return {
      headline: { maxWords: 4, maxChars: 28 },
      detail: { maxChars: 38, maxSentences: 1, maxWords: 8 },
    };
  }
  if (slide.querySelector(".strategy-strip")) {
    return {
      headline: { maxWords: 2, maxChars: 14 },
      detail: { maxChars: 34, maxSentences: 1, maxWords: 7 },
    };
  }
  if (slide.querySelector(".comic-grid-3, .check-grid")) {
    return {
      headline: { maxWords: 4, maxChars: 26 },
      detail: { maxChars: 36, maxSentences: 1, maxWords: 7 },
    };
  }
  if (slide.querySelector(".timeline")) {
    return {
      headline: { maxWords: 3, maxChars: 20 },
      detail: { maxChars: 34, maxSentences: 1, maxWords: 7 },
    };
  }
  if (slide.querySelector(".comic-grid-2, .two-column, .compact-card-row")) {
    return {
      headline: { maxWords: 5, maxChars: 32 },
      detail: { maxChars: 36, maxSentences: 1, maxWords: 7 },
    };
  }
  return {
    headline: { maxWords: 6, maxChars: 42 },
    detail: { maxChars: 52, maxSentences: 1, maxWords: 10 },
  };
}

/**
 * @param {ParentNode} root
 * @param {"comic" | "space-bright" | "space-black" | "sealife" | ""} themeKey
 * @returns {{ headline: { maxWords: number, maxChars: number }, detail: { maxChars: number, maxSentences: number, maxWords?: number } } | null}
 */
function getSlideShellThemeTextBudget(root, themeKey) {
  if (themeKey === "comic") return getComicTextBudget(root);
  if (themeKey === "space-bright") return getSpaceBrightTextBudget(root);
  if (themeKey === "space-black") return getSpaceBlackTextBudget(root);
  if (themeKey === "sealife") return getSealifeTextBudget(root);
  return null;
}

/**
 * @param {ParentNode} root
 * @param {Array<{ headline: string, detail: string }>} pairs
 * @returns {Array<{ headline: string, detail: string }>}
 */
function compactSpaceBrightTextPairs(root, pairs) {
  if (!isSpaceBrightSlideRoot(root)) return pairs;
  const budget = getSpaceBrightTextBudget(root);
  return pairs.map((pair) => ({
    headline: compactSlideTextValue(pair.headline, budget.headline),
    detail: compactSlideTextValue(pair.detail || pair.headline, budget.detail),
  }));
}

/**
 * @param {ParentNode} root
 * @param {string[]} items
 * @returns {string[]}
 */
function compactSpaceBrightBulletItems(root, items) {
  if (!isSpaceBrightSlideRoot(root)) return items;
  const budget = getSpaceBrightTextBudget(root);
  return items.map((item) => compactSlideTextValue(item, budget.detail));
}

/**
 * @param {string[]} bullets
 * @param {{ headline: { maxWords: number, maxChars: number }, detail: { maxChars: number, maxSentences: number, maxWords?: number } } | null} budget
 * @returns {string[]}
 */
function compactStructuredSlideColumns(bullets, budget) {
  if (!budget) return bullets;
  return bullets.map((bullet) =>
    String(bullet || "")
      .split(/\n+/)
      .map((part, idx) => compactSlideTextValue(part, idx === 0 ? budget.headline : budget.detail))
      .filter(Boolean)
      .join("\n"),
  );
}

/**
 * Sea Life has several intentionally roomy image/title cards; give those
 * cards enough lesson substance while keeping dense grids tightly capped.
 * @param {ParentNode} root
 * @returns {number}
 */
function getSealifeRoomyDetailCount(root) {
  const slide = getRootSlideElement(root);
  if (!slide) return 2;
  if (slide.querySelector(".image-layout")) return 3;
  if (slide.querySelector(".title-card, .section-card")) return 3;
  return 1;
}

/**
 * @param {string} title
 * @param {string[]} bullets
 * @param {{ detail: { maxChars: number, maxSentences: number, maxWords?: number } }} budget
 * @param {number} maxItems
 * @returns {string}
 */
function buildSealifeRichDetailText(title, bullets, budget, maxItems) {
  const values = collectUniqueSlideTextValues(bullets.length ? bullets : [title]);
  const details = values
    .map((value) => {
      const pair = buildSlideTextPair(value);
      return pair.detail || pair.headline;
    })
    .filter(Boolean)
    .slice(0, Math.max(1, maxItems));

  const joined = details.length ? details.join(" ") : title;
  return capitalizeSlideLead(compactSlideTextValue(joined, budget.detail));
}

/**
 * @param {string} title
 * @param {string[]} bullets
 * @param {{ headline: { maxWords: number, maxChars: number } }} budget
 * @returns {string}
 */
function buildSealifeLeadHeadlineText(title, bullets, budget) {
  const pair = buildSlideTextPair(bullets[0] || title);
  return capitalizeSlideLead(compactSlideTextValue(pair.headline || title, budget.headline));
}

/**
 * @param {Element | null} root
 * @param {HTMLUListElement | Element} ul
 * @param {number} desiredCount
 * @param {number} templateItemCount
 * @param {number} bulletCount
 * @returns {number}
 */
function resolveComicBulletCount(root, ul, desiredCount, templateItemCount, bulletCount) {
  const slide = root instanceof Element ? root : null;
  const availableCount = Math.max(1, bulletCount || templateItemCount || desiredCount || 1);
  const boundedCount = (fallback, max) => Math.min(max, Math.max(1, templateItemCount || fallback, availableCount));
  if (desiredCount > 0) return Math.min(desiredCount, 4);
  if (slide?.querySelector(".comic-title") && !slide.querySelector(".slide-title")) return 1;
  if (ul.closest(".comic-grid-3, .strategy-strip, .check-grid, .timeline")) return 1;
  if (ul.closest(".two-column, .comic-grid-2")) return boundedCount(4, 4);
  if (slide?.querySelector("img, .image-wrapper")) return boundedCount(3, 3);
  if (ul.closest(".comic-panel")) return boundedCount(3, 4);
  if (templateItemCount > 0) return boundedCount(templateItemCount, 3);
  return Math.min(3, availableCount);
}

/**
 * @param {ParentNode} root
 * @param {Element[]} targets
 * @returns {Element[]}
 */
function getSpaceBrightPrimaryTextTargets(root, targets) {
  if (!targets.length) return targets;
  const slide = getRootSlideElement(root);
  if (!slide) return targets;

  const keepWithin = (selector) => {
    const picked = targets.filter((node) => node.closest(selector));
    return picked.length ? picked : targets;
  };

  if (slide.querySelector(".grid-2 .table-like") && slide.querySelector(".grid-2 .big-icon")) {
    return keepWithin(".table-like").slice(0, 10);
  }
  if (slide.querySelector(".table-like")) {
    return keepWithin(".table-like");
  }
  if (slide.querySelector(".grid-2 > .small-tile, .grid-3 > .small-tile")) {
    return keepWithin(".small-tile");
  }
  if (slide.querySelector(".tiled-content > .tile")) {
    return keepWithin(".tile");
  }
  if (slide.querySelector(".timeline-layout")) {
    return keepWithin(".timeline-layout");
  }
  if (slide.querySelector(".quote-layout")) {
    return keepWithin(".quote-layout");
  }
  if (slide.querySelector(".styled-bullets")) {
    return keepWithin(".styled-bullets");
  }
  if (slide.querySelector(".highlight-numbers-layout")) {
    return keepWithin(".highlight-numbers-layout");
  }
  if (slide.querySelector(".two-column")) {
    const bulletItems = targets.filter((node) => node.closest(".bullet-list"));
    if (bulletItems.length) {
      return bulletItems.slice(0, 3);
    }
    const withinColumn = targets.filter((node) => node.closest(".two-column"));
    if (!withinColumn.length) return targets;
    let headlineCount = 0;
    let detailCount = 0;
    const picked = withinColumn.filter((node) => {
      if (isHeadlineShellTarget(node)) {
        if (headlineCount >= 1) return false;
        headlineCount += 1;
        return true;
      }
      if (detailCount >= 2) return false;
      detailCount += 1;
      return true;
    });
    return picked.length ? picked : withinColumn.slice(0, 3);
  }
  return targets;
}

/**
 * @param {ParentNode} root
 * @returns {boolean}
 */
function shouldSkipSpaceBrightFallbackBody(root) {
  const slide = getRootSlideElement(root);
  return !!slide?.querySelector(
    ".table-like, .grid-2, .grid-3, .quote-layout, .timeline-layout, .two-column, .tiled-content, .highlight-numbers-layout, .styled-bullets",
  );
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function splitSlideBulletFragments(value) {
  const raw = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (!raw) return [];
  return raw
    .split(/\s*(?:\n+|\||•|;)\s*|\.\s+/u)
    .map((part) => part.trim().replace(/[.。]+$/u, ""))
    .filter(Boolean);
}

/**
 * @param {string[]} values
 * @param {number} want
 * @returns {string[]}
 */
function buildCompactBulletLines(values, want) {
  const safeWant = Math.max(1, Math.floor(Number(want) || 0));
  const fragments = collectUniqueSlideTextValues(values.flatMap(splitSlideBulletFragments));
  const lines = [];
  fragments.forEach((fragment) => {
    if (lines.length >= safeWant) return;
    const words = fragment.split(/\s+/).filter(Boolean);
    if (words.length <= 14) {
      lines.push(fragment);
      return;
    }
    for (let idx = 0; idx < words.length && lines.length < safeWant; idx += 12) {
      lines.push(words.slice(idx, idx + 12).join(" "));
    }
  });
  return collectUniqueSlideTextValues(lines).slice(0, safeWant);
}

/**
 * @param {string} title
 * @param {string[]} bullets
 * @param {number} want
 * @returns {string[]}
 */
function buildSlideBulletItems(title, bullets, want) {
  const safeWant = Math.max(1, Math.floor(Number(want) || 0));
  const bulletValues = collectUniqueSlideTextValues(bullets);
  const compactLines = buildCompactBulletLines([...bulletValues, title], safeWant);
  if (compactLines.length >= safeWant) {
    return compactLines;
  }
  const fragmentValues = collectUniqueSlideTextValues(
    bulletValues.flatMap((bullet) => {
      const fragments = splitSlideTextFragments(bullet);
      return fragments.length >= 2 ? fragments : [bullet];
    }),
  );

  let items =
    fragmentValues.length >= safeWant
      ? fragmentValues
      : bulletValues.length >= safeWant
        ? bulletValues
        : collectUniqueSlideTextValues([...compactLines, ...fragmentValues, ...bulletValues, title]);

  if (!items.length) {
    items = title ? [title] : [];
  }
  if (!items.length) {
    return [];
  }
  while (items.length < safeWant) {
    items.push(items[items.length % items.length] || items[0]);
  }
  return items.slice(0, safeWant);
}

/**
 * @param {string} value
 * @returns {number}
 */
function measureSlideTextWeight(value) {
  return Math.max(1, String(value || "").replace(/\s+/g, " ").trim().length);
}

/**
 * @param {string[]} items
 * @param {number} want
 * @returns {string[][]}
 */
function partitionSlideTextGroups(items, want) {
  const normalized = collectUniqueSlideTextValues(items);
  const safeWant = Math.max(1, Math.floor(Number(want) || 0));
  const groupCount = Math.min(safeWant, normalized.length);
  if (!groupCount) return [];
  if (groupCount === 1) return [normalized];

  const totalWeight = normalized.reduce((sum, item) => sum + measureSlideTextWeight(item), 0);
  const targetWeight = totalWeight / groupCount;
  const groups = [];
  let current = [];
  let currentWeight = 0;

  normalized.forEach((item, idx) => {
    const remainingItems = normalized.length - idx;
    const remainingGroups = groupCount - groups.length;
    if (current.length && groups.length < groupCount - 1) {
      const shouldReserveRemaining = remainingItems === remainingGroups;
      const reachedTargetWeight = currentWeight >= targetWeight;
      if (shouldReserveRemaining || reachedTargetWeight) {
        groups.push(current);
        current = [];
        currentWeight = 0;
      }
    }

    current.push(item);
    currentWeight += measureSlideTextWeight(item);
  });

  if (current.length) {
    groups.push(current);
  }

  return groups;
}

/**
 * @param {string} title
 * @param {string[]} bullets
 * @param {number} want
 * @returns {Array<{ headline: string, detail: string }>}
 */
function buildBalancedSlideTextPairs(title, bullets, want) {
  const safeWant = Math.max(1, Math.floor(Number(want) || 0));
  const bulletValues = collectUniqueSlideTextValues(bullets);
  const routeValues = bulletValues.filter((bullet) => /^(?:track|mạch|mach)\s+\d+\s*:/iu.test(bullet));
  if (routeValues.length) {
    const routePairs = routeValues.slice(0, safeWant).map((bullet, index) => {
      const pair = buildSlideTextPair(bullet);
      return {
        headline: `Track ${index + 1}`,
        detail: pair.detail || pair.headline,
      };
    });
    while (routePairs.length < safeWant && routePairs.length) {
      const fallback = routePairs[routePairs.length % routePairs.length];
      routePairs.push({
        headline: `Track ${routePairs.length + 1}`,
        detail: fallback.detail || fallback.headline,
      });
    }
    if (routePairs.length) return routePairs.slice(0, safeWant);
  }

  const directGroups = bulletValues.length >= safeWant ? partitionSlideTextGroups(bulletValues, safeWant) : [];
  const fragmentValues = collectUniqueSlideTextValues(
    bulletValues.flatMap((bullet) => {
      const fragments = splitSlideTextFragments(bullet);
      return fragments.length >= 2 ? fragments : [bullet];
    }),
  );
  const balancedGroups =
    directGroups.length >= safeWant
      ? directGroups
      : fragmentValues.length >= safeWant
        ? partitionSlideTextGroups(fragmentValues, safeWant)
        : [];

  if (!balancedGroups.length) {
    return buildSlideTextPool(title, bullets, safeWant).slice(0, safeWant);
  }

  const pairs = balancedGroups
    .map((group) => buildSlideTextPair(group.join(". ")))
    .filter((item) => item.headline || item.detail);

  if (!pairs.length) {
    return buildSlideTextPool(title, bullets, safeWant).slice(0, safeWant);
  }

  while (pairs.length < safeWant) {
    const fallback = pairs[pairs.length % pairs.length];
    pairs.push({
      headline: fallback.headline,
      detail: fallback.detail || fallback.headline,
    });
  }

  return pairs.slice(0, safeWant);
}

/**
 * @param {Element} node
 * @param {string} value
 */
function setShellTextContent(node, value) {
  const raw = String(value || "").replace(/\s+/g, " ").trim();
  const fallback = String(node.getAttribute("data-shell-original-text") || "").replace(/\s+/g, " ").trim();
  const picked = raw || fallback || "Nội dung";
  const parts = picked.split(/\n/);
  node.replaceChildren();
  parts.forEach((part, index) => {
    if (index > 0) node.appendChild(node.ownerDocument.createElement("br"));
    node.appendChild(node.ownerDocument.createTextNode(part));
  });
}

/**
 * @param {ParentNode} root
 * @returns {{ maxChars: number, maxSentences: number }}
 */
function getSpaceBrightExampleBoxBudget(root) {
  const slide = getRootSlideElement(root);
  if (!slide) {
    return { maxChars: 118, maxSentences: 1 };
  }
  if (slide.querySelector(".grid-2 .table-like") && slide.querySelector(".grid-2 .big-icon")) {
    return { maxChars: 86, maxSentences: 1 };
  }
  if (slide.querySelector(".table-like")) {
    return { maxChars: 96, maxSentences: 1 };
  }
  if (slide.querySelector(".grid-2 > .small-tile, .grid-3 > .small-tile")) {
    return { maxChars: 118, maxSentences: 1 };
  }
  return { maxChars: 108, maxSentences: 1 };
}

/**
 * @param {string} title
 * @param {string} fallbackLabel
 * @returns {string}
 */
function resolveSpaceBrightExampleBoxLabel(title, fallbackLabel = "") {
  const rawTitle = String(title || "").trim();
  if (/chiến thuật|cloze|đọc hiểu|reading/i.test(rawTitle)) return "Chiến thuật";
  if (/luyện tập|practice/i.test(rawTitle)) return "Gợi ý";
  if (/trọng âm|stress|phát âm|thì|tense/i.test(rawTitle)) return "Mẹo";
  if (/tiền tố|prefix|hậu tố|suffix|word form/i.test(rawTitle)) return "Ghi nhớ";
  return String(fallbackLabel || "").trim() || "Ghi nhớ";
}

/**
 * @param {string} title
 * @param {string[]} bullets
 * @returns {string}
 */
function deriveSpaceBrightExampleBoxHint(title, bullets) {
  const rawTitle = String(title || "").trim();
  const joined = collectUniqueSlideTextValues(bullets).join(" ").toLowerCase();
  const normalized = `${rawTitle} ${joined}`.toLowerCase();

  if (/tiền tố|prefix/.test(normalized)) {
    return "xác định nghĩa gốc trước, rồi mới chọn tiền tố phủ định, lặp lại hay mức độ cho phù hợp.";
  }
  if (/hậu tố|suffix|word form/.test(normalized)) {
    return "nhìn vị trí trong câu trước để đoán danh từ, tính từ, trạng từ hay động từ rồi mới gắn hậu tố.";
  }
  if (/trọng âm|stress/.test(normalized)) {
    return "đọc nhanh cả bốn đáp án trong đầu để tìm từ có nhịp nhấn khác hẳn ba từ còn lại.";
  }
  if (/phát âm|pronunciation/.test(normalized)) {
    return "ưu tiên nhìn âm cuối và chữ cái đứng trước để loại nhanh những đáp án phát âm lệch quy tắc.";
  }
  if (/cloze|điền|đọc hiểu|reading/.test(normalized)) {
    return "đọc lướt toàn câu hoặc toàn đoạn trước, rồi mới khóa đáp án bằng cả ngữ pháp lẫn ngữ nghĩa.";
  }
  if (/thì|tense/.test(normalized)) {
    return "xem dấu hiệu thời gian trước, rồi đối chiếu xem hành động đã hoàn tất, đang diễn ra hay lặp lại.";
  }
  if (/lỗi sai|error/.test(normalized)) {
    return "kiểm tra lần lượt chủ vị, thì, từ loại và liên từ để loại đáp án sai theo từng lớp.";
  }
  return "";
}

/**
 * @param {ParentNode} root
 * @param {string} title
 * @param {string[]} bullets
 * @param {number} usedCount
 * @returns {boolean}
 */
function fillSpaceBrightExampleBox(root, title, bullets, usedCount = 0) {
  if (!isSpaceBrightSlideRoot(root)) return false;
  const paragraph = root.querySelector(".example-box p");
  if (!(paragraph instanceof HTMLElement)) return false;
  if (String(paragraph.textContent || "").replace(/\s+/g, " ").trim()) return true;

  const originalText = String(paragraph.getAttribute("data-shell-original-text") || "").replace(/\s+/g, " ").trim();
  const originalMatch = originalText.match(/^\s*([^:：]{1,24})[:：]\s*(.+)$/u);
  const fallbackLabel = originalMatch ? originalMatch[1].trim() : "";
  const fallbackDetail = originalMatch ? originalMatch[2].trim() : originalText;
  const label = resolveSpaceBrightExampleBoxLabel(title, fallbackLabel);

  const fragments = collectUniqueSlideTextValues(
    bullets.flatMap((bullet) => {
      const parts = splitSlideBulletFragments(bullet);
      return parts.length ? parts : [bullet];
    }),
  );
  const safeUsedCount = Math.max(0, Math.floor(Number(usedCount) || 0));
  const leftover = fragments.slice(safeUsedCount);
  const preferred = leftover.length ? leftover : fragments;
  const detailBudget = getSpaceBrightExampleBoxBudget(root);
  const leftoverText = leftover.slice(0, 2).join("; ");
  const derivedHint = deriveSpaceBrightExampleBoxHint(title, bullets);
  const synthesized =
    leftoverText ||
    derivedHint ||
    preferred.slice(0, 2).join("; ") ||
    fallbackDetail ||
    title;
  const compactDetail = capitalizeSlideLead(
    compactSlideTextValue(
      synthesized || derivedHint || fallbackDetail || title,
      detailBudget,
    ),
  );

  paragraph.replaceChildren();
  if (label) {
    const lead = paragraph.ownerDocument.createElement("span");
    lead.className = "formula";
    lead.textContent = `${label}:`;
    paragraph.appendChild(lead);
    paragraph.appendChild(paragraph.ownerDocument.createTextNode(` ${compactDetail}`));
  } else {
    paragraph.textContent = compactDetail;
  }
  return true;
}

/**
 * @param {ParentNode} root
 * @returns {number}
 */
function estimateSpaceBrightPrimarySlotUsage(root) {
  const targets = getSpaceBrightPrimaryTextTargets(
    root,
    Array.from(root.querySelectorAll("[data-shell-text-target]")).sort(
      (a, b) =>
        Number(a.getAttribute("data-shell-text-target") || 0) - Number(b.getAttribute("data-shell-text-target") || 0),
    ),
  );
  if (!targets.length) return 0;
  const pairCount = getStructuredShellTextPairCount(targets);
  return pairCount >= 2 ? pairCount : targets.length;
}

/**
 * @param {Element} slide
 * @param {string} title
 * @param {string[]} bullets
 */
function backfillSpaceBrightEmptyExampleBoxes(slide, title, bullets) {
  if (!(slide instanceof Element)) return;
  if (!slide.querySelector(".example-box p")) return;
  const usedCount = estimateSpaceBrightPrimarySlotUsage(slide);
  fillSpaceBrightExampleBox(slide, title, bullets, usedCount);
}

/**
 * @param {Element} root
 * @param {string[]} bullets
 * @returns {boolean}
 */
function fillStructuredTableColumns(root, bullets) {
  const table = root.querySelector(".table-layout table");
  if (!(table instanceof HTMLTableElement)) return false;
  if (!Array.isArray(bullets) || !bullets.length || !bullets.every((item) => String(item || "").includes("\n"))) return false;

  const headerCells = Array.from(table.querySelectorAll("thead th"));
  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  if (!headerCells.length || bullets.length !== headerCells.length || !bodyRows.length) return false;

  const bodyCellsByRow = bodyRows.map((row) => Array.from(row.querySelectorAll("td, th")));
  if (bodyCellsByRow.some((cells) => cells.length < headerCells.length)) return false;

  bullets.forEach((bullet, columnIndex) => {
    const parts = String(bullet || "")
      .split(/\n+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return;

    setShellTextContent(headerCells[columnIndex], parts[0]);

    const detailParts = parts.slice(1);
    bodyRows.forEach((_, rowIndex) => {
      const cell = bodyCellsByRow[rowIndex]?.[columnIndex];
      if (!(cell instanceof HTMLElement)) return;
      const remaining = detailParts.length - rowIndex;
      let content = "";
      if (rowIndex === bodyRows.length - 1 && remaining > 1) {
        content = detailParts.slice(rowIndex).join("\n");
      } else {
        content = detailParts[rowIndex] || "";
      }
      setShellTextContent(cell, content);
    });
  });

  return true;
}

/**
 * @param {Element} node
 * @returns {boolean}
 */
function isHeadlineShellTarget(node) {
  if (!(node instanceof Element)) return false;
  const tag = String(node.tagName || "").toUpperCase();
  if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || tag === "TH" || tag === "STRONG") return true;
  const cls = String(node.getAttribute("class") || "");
  return /(label|q-title|box-label|subtitle|number)/i.test(cls);
}

/**
 * @param {Element[]} targets
 * @returns {number}
 */
function getStructuredShellTextPairCount(targets) {
  if (!Array.isArray(targets) || targets.length < 4 || targets.length % 2 !== 0) return 0;
  for (let idx = 0; idx < targets.length; idx += 2) {
    if (!isHeadlineShellTarget(targets[idx]) || isHeadlineShellTarget(targets[idx + 1])) {
      return 0;
    }
  }
  return targets.length / 2;
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
    const originalItems = Array.from(ul.querySelectorAll(":scope > li")).map((li) => li.textContent || "");
    if (originalItems.length) {
      ul.setAttribute("data-shell-original-items", JSON.stringify(originalItems));
    }
    ul.replaceChildren();
    return;
  }

  const sink = resolveShellContentSink(root);
  const textTargets = collectShellTextTargets(sink, title instanceof Element ? title : null);
  if (textTargets.length) {
    textTargets.forEach((node, idx) => {
      node.setAttribute("data-shell-text-target", String(idx));
      node.setAttribute("data-shell-original-text", node.textContent || "");
      node.textContent = "";
    });
    return;
  }

  const list = ensureFallbackShellList(doc, sink);
  list.replaceChildren();
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

  const hasComicCover = isComicThemeDoc(doc) && !!allRoots[0];
  const variantRoots = hasComicCover ? roots.slice(1) : roots;

  if (hasComicCover) {
    const coverProto = allRoots[0].cloneNode(true);
    decorateComicCoverPrototype(coverProto, doc);
    const coverTpl = doc.createElement("template");
    coverTpl.id = "layout-cover";
    coverTpl.setAttribute("data-shell-layout-role", "cover");
    coverTpl.setAttribute("data-shell-authored-content", "1");
    coverTpl.content.appendChild(coverProto);
    doc.body.appendChild(coverTpl);
  }

  variantRoots.forEach((root, idx) => {
    const proto = root.cloneNode(true);
    decorateSlidePrototype(proto, doc);
    const t = doc.createElement("template");
    t.id = idx === 0 ? "layout-content" : `layout-content-v${idx}`;
    t.setAttribute("data-shell-layout-variant", String(idx));
    t.setAttribute("data-shell-authored-content", "1");
    if (idx === variantRoots.length - 1) {
      t.setAttribute("data-shell-layout-role", "ending");
    }
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
 * @param {Document} doc
 * @returns {HTMLTemplateElement | null}
 */
function getShellEndingTemplate(doc) {
  const ending = doc.querySelector("template[data-shell-layout-role=\"ending\"]");
  return ending instanceof HTMLTemplateElement ? ending : null;
}

/**
 * @param {HTMLTemplateElement | null | undefined} tpl
 * @returns {boolean}
 */
function isAuthoredShellTemplate(tpl) {
  return !!(tpl instanceof HTMLTemplateElement && tpl.getAttribute("data-shell-authored-content") === "1");
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
    :root {
      --slide-shell-preview-viewport-width: ${SLIDE_SHELL_DESKTOP_VIEWPORT_WIDTH_PX}px;
      --slide-shell-preview-stage-width: ${SLIDE_SHELL_STAGE_WIDTH_PX}px;
    }
    html {
      width: var(--slide-shell-preview-viewport-width) !important;
      min-width: var(--slide-shell-preview-viewport-width) !important;
      max-width: var(--slide-shell-preview-viewport-width) !important;
      overflow-x: hidden;
    }
    /* Override theme body { display: grid } so sibling <template> nodes do not shift slides sideways */
    body {
      width: var(--slide-shell-preview-viewport-width) !important;
      min-width: var(--slide-shell-preview-viewport-width) !important;
      max-width: var(--slide-shell-preview-viewport-width) !important;
      overflow-x: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: flex-start !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    body > template {
      display: none !important;
    }
    #presentation-area {
      width: var(--slide-shell-preview-viewport-width) !important;
      min-width: var(--slide-shell-preview-viewport-width) !important;
      max-width: var(--slide-shell-preview-viewport-width) !important;
      overflow-x: hidden;
      box-sizing: border-box;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    #slides-master-container {
      width: var(--slide-shell-preview-viewport-width) !important;
      min-width: var(--slide-shell-preview-viewport-width) !important;
      max-width: var(--slide-shell-preview-viewport-width) !important;
      box-sizing: border-box;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    #slides-master-container[data-nav-mode="scroll"] {
      gap: 28px !important;
      padding-bottom: 24px !important;
    }
    #slides-master-container[data-nav-mode="active"] {
      min-height: 100vh !important;
      justify-content: center !important;
      padding-top: 0 !important;
      padding-bottom: 0 !important;
    }
    /* Trình chiếu: một slide (themes comic / color không có sẵn rule .active) */
    #slides-master-container[data-nav-mode="active"] .shell-slide-instance:not(.active) {
      display: none !important;
    }
    .shell-slide-instance.slide-container,
    .shell-slide-instance.slide {
      width: var(--slide-shell-preview-stage-width) !important;
      min-width: var(--slide-shell-preview-stage-width) !important;
      max-width: var(--slide-shell-preview-stage-width) !important;
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
    .shell-slide-instance:not([data-shell-authored-slide="1"]) .title-card,
    .shell-slide-instance:not([data-shell-authored-slide="1"]) .section-card {
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
      align-items: flex-start;
      justify-content: center;
      overflow: hidden;
    }
    .shell-slide-instance .shell-panel-fit-host {
      display: flex;
      flex-direction: column;
    }
    .shell-slide-instance .shell-panel-fit-outer {
      flex-shrink: 0;
      box-sizing: border-box;
      width: 100%;
      height: auto;
      min-height: 0;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .shell-slide-instance .shell-panel-fit-scaled {
      box-sizing: border-box;
      transform-origin: top center;
      width: auto;
      max-width: none;
      height: auto;
      min-height: 0;
    }
    .shell-slide-instance [data-shell="body"] {
      width: 100% !important;
      max-width: 100% !important;
      flex: 1 1 auto !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      align-items: stretch !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      gap: 12px;
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
    .shell-slide-instance ul[data-shell="bullets"] {
      width: 100% !important;
      max-width: 100% !important;
      flex: 1 1 auto !important;
      min-height: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      margin-top: 0 !important;
    }
    .shell-slide-instance ul[data-shell="bullets"] li {
      margin-bottom: 10px;
    }
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"]:not(:has(.content-card)) ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list),
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"] .section-center ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list),
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"] .title-group ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list),
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"] .title-content ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list) {
      list-style: none !important;
      padding: 0 28px !important;
      margin: 54px auto 0 !important;
      width: min(1140px, calc(100% - 48px)) !important;
      max-width: 1140px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 20px !important;
      text-align: center !important;
    }
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"]:not(:has(.content-card)) ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list) li,
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"] .section-center ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list) li,
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"] .title-group ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list) li,
    body:not(.shell-theme-academic):not(.shell-theme-friendly):not(.shell-theme-space-bright):not(.shell-theme-space-black):not(.shell-theme-sealife) .shell-slide-instance[data-shell-authored-slide="1"] .title-content ul[data-shell="bullets"]:not(.styled-list):not(.legend):not(.comic-list) li {
      list-style: none !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-size: clamp(28px, 2.35vw, 40px) !important;
      line-height: 1.35 !important;
      font-weight: 700 !important;
      text-align: center !important;
      word-break: normal !important;
      overflow-wrap: break-word !important;
    }
    .shell-slide-instance[data-shell-authored-slide="1"] .section-center,
    .shell-slide-instance[data-shell-authored-slide="1"] .title-group,
    .shell-slide-instance[data-shell-authored-slide="1"] .title-content {
      justify-content: center !important;
    }
    .shell-slide-instance .outer-title {
      max-width: 100%;
      box-sizing: border-box;
      padding-left: 12px;
      padding-right: 12px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .shell-slide-instance .doughnut-chart {
      aspect-ratio: 1 / 1 !important;
      border-radius: 50% !important;
      flex: 0 0 auto !important;
      align-self: center !important;
    }
    .shell-slide-instance .doughnut-chart::after {
      aspect-ratio: 1 / 1 !important;
      border-radius: 50% !important;
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
    .shell-theme-comic .shell-slide-instance .comic-panel > .shell-panel-fit-sizer {
      padding-top: 40px !important;
      box-sizing: border-box !important;
    }
    /* Hero / panel trắng trực tiếp dưới slide (BAM! / SPLASH!): căn giữa như mẫu */
    .shell-theme-comic .shell-slide-instance.slide-container > .comic-panel.shell-panel-fit-host > .shell-panel-fit-sizer {
      align-items: center !important;
      justify-content: center !important;
    }
    .shell-theme-comic .shell-slide-instance .comic-badge,
    .shell-theme-comic .shell-slide-instance .comic-number,
    .shell-theme-comic .shell-slide-instance [style*="position: absolute"] {
      z-index: 8 !important;
    }
    .shell-theme-comic .shell-slide-instance [data-shell="title"],
    .shell-theme-comic .shell-slide-instance .comic-title,
    .shell-theme-comic .shell-slide-instance .slide-title,
    .shell-theme-comic .shell-slide-instance .toc-item h3,
    .shell-theme-comic .shell-slide-instance .toc-item p {
      font-family: 'Bangers', system-ui, sans-serif !important;
      position: relative;
      z-index: 16;
    }
    .shell-theme-comic .shell-slide-instance h3 {
      font-family: 'Bangers', system-ui, sans-serif !important;
      position: relative;
      z-index: 14;
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
    .shell-theme-comic .shell-slide-instance .comic-panel [data-shell="title"] {
      margin-top: 10px !important;
    }
    .shell-slide-instance[data-shell-authored-slide="1"] .card,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card,
    .shell-slide-instance[data-shell-authored-slide="1"] .comic-panel,
    .shell-slide-instance[data-shell-authored-slide="1"] [data-shell="body"],
    .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"],
    .shell-slide-instance[data-shell-authored-slide="1"] .content-area {
      overflow: visible !important;
      min-height: auto !important;
      max-height: none !important;
      height: auto !important;
    }
    .shell-slide-instance.slide-container[data-shell-authored-slide="1"],
    .shell-slide-instance.slide[data-shell-authored-slide="1"] {
      overflow: hidden !important;
    }
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card.centered-pack {
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: calc(100% - 28px) !important;
      margin-top: auto !important;
      margin-bottom: auto !important;
    }
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card.centered-pack .slide-title {
      margin-bottom: 24px !important;
    }
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card.centered-pack .content-area {
      flex: 0 1 auto !important;
      justify-content: center !important;
    }
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.doughnut-chart-container),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.tiled-content),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.styled-list),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.mini-grid),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.strategy-table),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.process-steps),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.flashcard-row),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.question-box),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.formula-strip),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.dos-donts),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.quote-block),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.score-bars),
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.radar-grid) {
      justify-content: center !important;
    }
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.doughnut-chart-container) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.tiled-content) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.styled-list) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.mini-grid) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.strategy-table) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.process-steps) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.flashcard-row) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.question-box) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.formula-strip) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.dos-donts) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.quote-block) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.score-bars) .content-area,
    .shell-slide-instance[data-shell-authored-slide="1"] .content-card:has(.radar-grid) .content-area {
      flex: 0 1 auto !important;
    }
    body:not(.shell-theme-space-bright) .shell-slide-instance[data-shell-authored-slide="1"] .shell-panel-fit-sizer,
    body:not(.shell-theme-space-bright) .shell-slide-instance[data-shell-authored-slide="1"] .shell-panel-fit-outer,
    body:not(.shell-theme-space-bright) .shell-slide-instance[data-shell-authored-slide="1"] .shell-panel-fit-scaled {
      overflow: visible !important;
      width: auto !important;
      height: auto !important;
      max-width: none !important;
      max-height: none !important;
      transform: none !important;
    }
    body.shell-theme-space-bright .shell-slide-instance.slide-container[data-shell-authored-slide="1"] {
      height: 720px !important;
      min-height: 720px !important;
      max-height: 720px !important;
      overflow: hidden !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .content-area {
      flex: 1 1 auto !important;
      min-height: 0 !important;
      max-height: 100% !important;
      overflow: hidden !important;
      justify-content: flex-start !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .content-area.shell-panel-fit-host > .shell-panel-fit-sizer {
      align-items: flex-start !important;
      justify-content: center !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .content-area.shell-panel-fit-host > .shell-panel-fit-sizer,
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .content-area.shell-panel-fit-host > .shell-panel-fit-sizer > .shell-panel-fit-outer {
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .content-area.shell-panel-fit-host > .shell-panel-fit-sizer > .shell-panel-fit-outer > .shell-panel-fit-scaled {
      transform-origin: top center !important;
    }
    body.shell-theme-friendly #presentation-area,
    body.shell-theme-friendly #slides-master-container {
      height: 720px !important;
      min-height: 720px !important;
      max-height: 720px !important;
      overflow: hidden !important;
    }
    body.shell-theme-friendly .shell-slide-instance.slide-container[data-shell-authored-slide="1"] {
      height: 720px !important;
      min-height: 720px !important;
      max-height: 720px !important;
      overflow: hidden !important;
      padding: 30px 64px 26px !important;
    }
    body.shell-theme-friendly .shell-slide-instance.slide-container[data-shell-authored-slide="1"]::before {
      top: 14px !important;
      right: 20px !important;
      bottom: 12px !important;
      left: 20px !important;
      min-height: 0 !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] .content-area {
      flex: 1 1 auto !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: 100% !important;
      overflow: hidden !important;
      justify-content: center !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] .table-layout {
      max-height: 500px !important;
      overflow: hidden !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] .table-layout table {
      table-layout: fixed !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] .table-layout th,
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] .table-layout td {
      padding: 13px 18px !important;
      word-break: break-word !important;
      vertical-align: top !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] .table-layout th {
      font-size: 22px !important;
      line-height: 1.3 !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] .table-layout td {
      font-size: 20px !important;
      line-height: 1.4 !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"][data-shell-no-bullets="1"] {
      list-style: none !important;
      padding-left: 0 !important;
    }
    body.shell-theme-friendly .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"][data-shell-no-bullets="1"] li {
      list-style: none !important;
      padding-left: 0 !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"] {
      width: min(920px, 100%) !important;
      margin: 0 auto !important;
      padding: 0 0 0 52px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      gap: 16px !important;
      list-style: none !important;
      align-self: center !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"] li {
      font-size: 22px !important;
      line-height: 1.45 !important;
      font-weight: 500 !important;
      text-align: left !important;
      width: 100% !important;
      margin: 0 !important;
      min-height: 76px !important;
      padding-top: 10px !important;
      padding-bottom: 10px !important;
      list-style: none !important;
    }
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"],
    body.shell-theme-sealife .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"] {
      width: min(900px, 100%) !important;
      max-width: 900px !important;
      margin: 18px auto 0 !important;
      padding-left: 28px !important;
      align-self: center !important;
      text-align: left !important;
    }
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"] li,
    body.shell-theme-sealife .shell-slide-instance[data-shell-authored-slide="1"] ul[data-shell="bullets"] li {
      font-size: 24px !important;
      line-height: 1.5 !important;
      font-weight: 500 !important;
      text-align: left !important;
      margin-bottom: 14px !important;
      overflow-wrap: break-word !important;
      word-break: normal !important;
    }
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] .two-column ul[data-shell="bullets"],
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] .bullet-list ul[data-shell="bullets"] {
      gap: 6px !important;
    }
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] .two-column,
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] .two-column.align-start {
      align-items: center !important;
    }
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] .two-column > :has(.image-wrapper) {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
    }
    body.shell-theme-space-black .shell-slide-instance[data-shell-authored-slide="1"] .two-column .image-wrapper {
      margin: 0 auto !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .content-area:has(> .tiled-content) {
      flex: 1 1 auto !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .tiled-content {
      height: auto !important;
      min-height: 0 !important;
      max-height: 100% !important;
      overflow: visible !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .tiled-content > .tile {
      min-height: 0 !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .table-like .table-row {
      align-items: stretch !important;
      grid-template-columns: minmax(300px, 340px) minmax(0, 1fr) !important;
      gap: 24px !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .table-like .label-pill,
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .table-like .row-text {
      min-height: 92px !important;
      display: flex !important;
      align-items: center !important;
      box-sizing: border-box !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .table-like .label-pill {
      justify-content: center !important;
      text-align: center !important;
      padding: 16px 24px !important;
      line-height: 1.25 !important;
    }
    body.shell-theme-space-bright .shell-slide-instance[data-shell-authored-slide="1"] .table-like .row-text {
      justify-content: flex-start !important;
      padding: 20px 26px !important;
      line-height: 1.4 !important;
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
  function isAuthoredAutoFitPanel(el) {
    if (!el || !el.matches) return false;
    if (!el.matches(".shell-slide-instance[data-shell-authored-slide=\\"1\\"] .content-area")) return false;
    if (el.classList.contains("shell-panel-fit-host") && el.querySelector(":scope > .shell-panel-fit-sizer")) {
      return true;
    }
    return !!el.querySelector(
      ":scope > .tiled-content, :scope > .grid-3, :scope > .grid-2, :scope > .styled-bullets, :scope > .table-like, :scope > .highlight-numbers-layout, :scope > .timeline-layout, :scope > .two-column, :scope > .quote-layout"
    );
  }
  function hasComicPanelAncestor(el) {
    var p = el.parentElement;
    while (p) {
      if (p.classList && p.classList.contains("comic-panel")) return true;
      p = p.parentElement;
    }
    return false;
  }
  function collectPanels(doc) {
    var sel = ".shell-slide-instance .card, .shell-slide-instance .content-card, .shell-slide-instance .comic-panel, .shell-slide-instance[data-shell-authored-slide=\\"1\\"] .content-area";
    return Array.prototype.filter.call(doc.querySelectorAll(sel), function (el) {
      var autoFitAuthored = isAuthoredAutoFitPanel(el);
      if (el.closest('.shell-slide-instance[data-shell-authored-slide="1"]') && !autoFitAuthored) return false;
      if (el.classList.contains("comic-panel") && hasComicPanelAncestor(el)) return false;
      if (el.matches && el.matches(".shell-slide-instance[data-shell-authored-slide=\\"1\\"] .content-area") && !autoFitAuthored) return false;
      return true;
    });
  }
  function getTitleHost(title) {
    return (
      title.closest(".comic-panel, .content-card, .card, .title-card, .section-card, .section-center, .title-group") ||
      title.closest(".shell-slide-instance") ||
      title.parentElement
    );
  }
  function getNumericCssValue(value) {
    var n = parseFloat(value || "");
    return isFinite(n) ? n : 0;
  }
  function fitTitle(title) {
    if (!title || title.getAttribute("data-edit-geom") === "1" || !window.getComputedStyle) return;
    var host = getTitleHost(title);
    if (!host) return;
    var isComicPanel = host.classList.contains("comic-panel");
    if (!title.dataset.shellBaseFontSize) {
      var baseCs = window.getComputedStyle(title);
      title.dataset.shellBaseFontSize = String(getNumericCssValue(baseCs.fontSize) || 0);
      title.dataset.shellBaseLineHeight = String(getNumericCssValue(baseCs.lineHeight) || 0);
    }
    var base = getNumericCssValue(title.dataset.shellBaseFontSize) || getNumericCssValue(window.getComputedStyle(title).fontSize) || 48;
    var min = isComicPanel ? Math.max(34, base * 0.52) : Math.max(24, base * 0.6);
    if (isComicPanel) {
      title.style.lineHeight = "0.92";
      title.style.maxWidth = "82%";
      title.style.marginLeft = "auto";
      title.style.marginRight = "auto";
      title.style.textAlign = "center";
    }
    var hostCs = window.getComputedStyle(host);
    var availW =
      (host.clientWidth || host.getBoundingClientRect().width || 0) -
      getNumericCssValue(hostCs.paddingLeft) -
      getNumericCssValue(hostCs.paddingRight) -
      (isComicPanel ? 36 : 16);
    if (!availW || availW < 80) return;
    var maxLines = isComicPanel ? 3 : 4;
    if (title.classList.contains("cta-title") || title.classList.contains("section-title")) {
      maxLines = 2;
    }
    var lineHeightRatio =
      (getNumericCssValue(title.dataset.shellBaseLineHeight) || 0) / Math.max(base, 1) || (isComicPanel ? 0.92 : 0.95);
    var cacheKey = [Math.round(availW), maxLines, base, min, title.textContent || ""].join("|");
    if (title.dataset.shellFitCacheKey === cacheKey && title.dataset.shellFitFontSize) {
      var cachedSize = title.dataset.shellFitFontSize + "px";
      if (title.style.fontSize !== cachedSize) {
        title.style.fontSize = cachedSize;
      }
      return;
    }
    title.style.fontSize = base + "px";
    function fitsAtSize(size) {
      title.style.fontSize = size + "px";
      var lineHeight = size * lineHeightRatio;
      var overW = title.scrollWidth > availW + 1;
      var overH = title.scrollHeight > lineHeight * maxLines + 2;
      return !overW && !overH;
    }
    var low = min;
    var high = base;
    var best = min;
    if (fitsAtSize(base)) {
      best = base;
    } else {
      while (high - low > 1) {
        var mid = Math.floor((low + high) / 2);
        if (fitsAtSize(mid)) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }
      if (best !== low && fitsAtSize(low)) best = low;
    }
    title.style.fontSize = best + "px";
    title.dataset.shellFitCacheKey = cacheKey;
    title.dataset.shellFitFontSize = String(best);
  }
  function fitShellTitles(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('.shell-slide-instance [data-shell="title"]'), function (title) {
      if (
        title.closest('.shell-slide-instance[data-shell-authored-slide="1"]') &&
        !(doc.body && doc.body.classList.contains("shell-theme-space-bright"))
      ) return;
      fitTitle(title);
    });
  }
  function getShellFitLineHeightRatio(el, fallback) {
    if (!el || !window.getComputedStyle) return fallback;
    var cs = window.getComputedStyle(el);
    var fontSize = getNumericCssValue(cs.fontSize) || 1;
    var lineHeight = getNumericCssValue(cs.lineHeight);
    return lineHeight > 0 ? lineHeight / fontSize : fallback;
  }
  function ensureTileTextFitBase(el, key) {
    if (!el || !window.getComputedStyle) return 0;
    var dataKey = "shellBase" + key + "FontSize";
    if (!el.dataset[dataKey]) {
      el.dataset[dataKey] = String(getNumericCssValue(window.getComputedStyle(el).fontSize) || 0);
    }
    return getNumericCssValue(el.dataset[dataKey]) || getNumericCssValue(window.getComputedStyle(el).fontSize) || 0;
  }
  function getSpaceBrightCardAvailableHeight(tile) {
    var rect = tile.getBoundingClientRect ? tile.getBoundingClientRect() : null;
    var area = tile.closest(".content-area");
    var slide = tile.closest(".shell-slide-instance");
    var areaRect = area && area.getBoundingClientRect ? area.getBoundingClientRect() : null;
    var slideRect = slide && slide.getBoundingClientRect ? slide.getBoundingClientRect() : null;
    var bottoms = [];
    if (areaRect && areaRect.height) bottoms.push(areaRect.bottom);
    if (slideRect && slideRect.height) bottoms.push(slideRect.bottom - 60);
    var bottom = bottoms.length ? Math.min.apply(Math, bottoms) : 0;
    var top = rect && rect.top ? rect.top : 0;
    var available = bottom > top ? Math.floor(bottom - top) : 0;
    return available || Math.floor((tile.clientHeight || tile.offsetHeight || 0));
  }
  function fitSpaceBrightCard(tile) {
    if (!tile || !window.getComputedStyle || tile.getAttribute("data-edit-geom") === "1") return;
    var heading = tile.querySelector("h3");
    var details = Array.prototype.filter.call(tile.querySelectorAll("p, li"), function (node) {
      return !!node && node.getAttribute("data-edit-geom") !== "1";
    });
    var detail = details[0] || null;
    if (!details.length && !heading) return;
    var baseHeading = ensureTileTextFitBase(heading, "Heading") || 32;
    var baseDetail = ensureTileTextFitBase(detail, "Detail") || 24;
    var headingRatio = getShellFitLineHeightRatio(heading, 1.2);
    var detailRatio = getShellFitLineHeightRatio(detail, 1.42);
    var minHeading = Math.max(20, Math.floor(baseHeading * 0.62));
    var minDetail = Math.max(14, Math.floor(baseDetail * 0.58));
    function setSizes(hSize, dSize) {
      if (heading) {
        heading.style.fontSize = hSize + "px";
        heading.style.lineHeight = headingRatio;
      }
      details.forEach(function (node) {
        node.style.fontSize = dSize + "px";
        node.style.lineHeight = detailRatio;
      });
    }
    setSizes(baseHeading, baseDetail);
    tile.style.height = "auto";
    var availableH = getSpaceBrightCardAvailableHeight(tile);
    if (availableH) {
      tile.style.maxHeight = availableH + "px";
    }
    var availableW = tile.clientWidth || tile.getBoundingClientRect().width || 0;
    if (!availableH || !availableW) return;
    var cacheKey = [
      Math.round(availableW),
      Math.round(availableH),
      heading ? heading.textContent || "" : "",
      details.map(function (node) { return node.textContent || ""; }).join("\\n"),
      baseHeading,
      baseDetail
    ].join("|");
    if (tile.dataset.shellTileFitCacheKey === cacheKey && tile.dataset.shellTileFitHeading && tile.dataset.shellTileFitDetail) {
      setSizes(Number(tile.dataset.shellTileFitHeading) || baseHeading, Number(tile.dataset.shellTileFitDetail) || baseDetail);
      return;
    }
    function fits(hSize, dSize) {
      setSizes(hSize, dSize);
      return tile.scrollHeight <= availableH + 1 && tile.scrollWidth <= availableW + 1;
    }
    var low = 0;
    var high = 1;
    var best = fits(baseHeading, baseDetail) ? 1 : 0;
    while (high - low > 0.02) {
      var mid = (low + high) / 2;
      var hSize = Math.round(minHeading + (baseHeading - minHeading) * mid);
      var dSize = Math.round(minDetail + (baseDetail - minDetail) * mid);
      if (fits(hSize, dSize)) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }
    var finalHeading = Math.round(minHeading + (baseHeading - minHeading) * best);
    var finalDetail = Math.round(minDetail + (baseDetail - minDetail) * best);
    setSizes(finalHeading, finalDetail);
    tile.dataset.shellTileFitCacheKey = cacheKey;
    tile.dataset.shellTileFitHeading = String(finalHeading);
    tile.dataset.shellTileFitDetail = String(finalDetail);
  }
  function fitSpaceBrightTiles(doc) {
    if (!doc.body || !doc.body.classList.contains("shell-theme-space-bright")) return;
    Array.prototype.forEach.call(
      doc.querySelectorAll(
        '.shell-slide-instance[data-shell-authored-slide="1"] .tiled-content > .tile, ' +
        '.shell-slide-instance[data-shell-authored-slide="1"] .grid-2 > .small-tile, ' +
        '.shell-slide-instance[data-shell-authored-slide="1"] .grid-3 > .small-tile'
      ),
      fitSpaceBrightCard
    );
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
  function measurePanelNaturalSize(scaled) {
    var baseRect = scaled && scaled.getBoundingClientRect ? scaled.getBoundingClientRect() : null;
    var maxRight = baseRect ? baseRect.left : 0;
    var maxBottom = baseRect ? baseRect.top : 0;
    Array.prototype.forEach.call(scaled.querySelectorAll("*"), function (node) {
      if (!node || node.nodeType !== 1) return;
      var cs = window.getComputedStyle(node);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      var rect = node.getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
    });
    return {
      width: Math.max(
        scaled.scrollWidth || 0,
        scaled.offsetWidth || 0,
        scaled.clientWidth || 0,
        baseRect ? Math.ceil(maxRight - baseRect.left) : 0,
        1
      ),
      height: Math.max(
        scaled.scrollHeight || 0,
        scaled.offsetHeight || 0,
        scaled.clientHeight || 0,
        baseRect ? Math.ceil(maxBottom - baseRect.top) : 0,
        1
      ),
    };
  }
  function wrapPanel(panel) {
    if (panel.closest('.shell-slide-instance[data-shell-authored-slide="1"]') && !isAuthoredAutoFitPanel(panel)) return;
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
    if (panel.closest('.shell-slide-instance[data-shell-authored-slide="1"]') && !isAuthoredAutoFitPanel(panel)) return;
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
    var panelRect = panel.getBoundingClientRect ? panel.getBoundingClientRect() : null;
    var availW = Math.max(0, Math.floor((panelRect && panelRect.width) || panel.clientWidth || panel.offsetWidth || 0));
    var availH = Math.max(0, Math.floor((panelRect && panelRect.height) || panel.clientHeight || panel.offsetHeight || 0));
    if (!availW || !availH) return;
    var measured = measurePanelNaturalSize(scaled);
    var naturalW = Math.max(measured.width || 0, 1);
    var naturalH = Math.max(measured.height || 0, 1);
    if (!naturalW || !naturalH) return;
    var scaleX = availW / naturalW;
    var scaleY = availH / naturalH;
    var scale = Math.min(1, scaleX, scaleY);
    if (
      document.body &&
      document.body.classList.contains("shell-theme-space-bright") &&
      panel.matches('.shell-slide-instance[data-shell-authored-slide="1"] .content-area') &&
      panel.querySelector('ul[data-shell="bullets"]')
    ) {
      scale = Math.max(scale, 0.92);
    }
    if (
      document.body &&
      document.body.classList.contains("shell-theme-space-bright") &&
      panel.matches('.shell-slide-instance[data-shell-authored-slide="1"] .content-area') &&
      panel.querySelector(".table-like")
    ) {
      scale = Math.max(scale, 0.95);
    }
    if (!isFinite(scale) || scale <= 0) scale = 1;
    scaled.style.width = naturalW + "px";
    scaled.style.height = naturalH + "px";
    scaled.style.transform = "scale(" + scale + ")";
    if (outer) {
      outer.style.height = Math.max(1, Math.floor(naturalH * scale)) + "px";
    }
  }
  function run() {
    if (fitEditPaused) return;
    if (document.body && document.body.classList.contains("slide-visual-edit-on")) return;
    fitShellTitles(document);
    fitSpaceBrightTiles(document);
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
        if (
          slide.matches('[data-shell-authored-slide="1"]') &&
          !(document.body && document.body.classList.contains("shell-theme-space-bright"))
        ) return;
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
 * @param {{ forceSpaceBright?: boolean }} [options]
 */
function fillContentSlots(root, title, bullets, options = {}) {
  const slideRoot = getRootSlideElement(root);
  const themeKey = resolveSlideShellThemeKey(slideRoot || root, { forceSpaceBright: options.forceSpaceBright });
  const isComic = themeKey === "comic";
  const isSealife = themeKey === "sealife";
  const isSpaceBright = themeKey === "space-bright";
  const isSpaceBlack = themeKey === "space-black";
  const themeTextBudget = getSlideShellThemeTextBudget(slideRoot || root, themeKey);
  const renderTitle =
    isComic && themeTextBudget
      ? capitalizeSlideLead(compactSlideTextValue(title, themeTextBudget.headline))
      : title;
  const compactPairs = (pairs) =>
    !themeTextBudget
      ? pairs
      : pairs.map((pair) => ({
          headline: capitalizeSlideLead(compactSlideTextValue(pair.headline, themeTextBudget.headline)),
          detail: capitalizeSlideLead(compactSlideTextValue(pair.detail || pair.headline, themeTextBudget.detail)),
        }));
  const compactItems = (items) =>
    !themeTextBudget
      ? items
      : items.map((item) => capitalizeSlideLead(compactSlideTextValue(item, themeTextBudget.detail)));

  const titleEl =
    root.querySelector("[data-shell=\"title\"]") ||
    (isComic ? root.querySelector("h2.slide-title, h1.comic-title, .comic-title, h1, h2") : null);
  if (titleEl) titleEl.textContent = renderTitle;
  const ul = root.querySelector("ul[data-shell=\"bullets\"]");
  if (ul) {
    const noBulletTitles = new Set([
      "Defining và non-defining - Lỗi thường gặp",
    ]);
    if (noBulletTitles.has(String(title || "").trim())) {
      ul.setAttribute("data-shell-no-bullets", "1");
    } else {
      ul.removeAttribute("data-shell-no-bullets");
    }
    ul.replaceChildren();
    const desiredCount = Number(ul.getAttribute("data-shell-bullet-count") || 0);
    const templateItemCount = (() => {
      try {
        const raw = ul.getAttribute("data-shell-original-items");
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch (_) {
        return 0;
      }
    })();
    const spaceBlackDefaultCount = (() => {
      if (!isSpaceBlack) return 3;
      const slide = getRootSlideElement(root);
      if (slide?.querySelector(".two-column, .bullet-list")) return Math.min(5, Math.max(5, bullets.length || 5));
      if (slide?.querySelector(".styled-bullets")) return Math.min(5, Math.max(4, bullets.length || 4));
      return Math.min(5, Math.max(4, bullets.length || 4));
    })();
    const compactCount = isComic
      ? resolveComicBulletCount(slideRoot || root, ul, desiredCount, templateItemCount, bullets.length)
      : desiredCount > 0
        ? desiredCount
        : isSpaceBlack
          ? spaceBlackDefaultCount
          : templateItemCount > 0
            ? templateItemCount
            : Math.min(3, Math.max(1, bullets.length || 1));
    const items =
      isSpaceBright || isSpaceBlack || isComic
        ? buildSlideBulletItems(renderTitle, bullets, compactCount)
        : desiredCount > 0
          ? buildSlideBulletItems(renderTitle, bullets, desiredCount)
          : bullets.length
            ? bullets.slice()
            : renderTitle
              ? [renderTitle]
              : [];
    compactItems(items).forEach((b) => {
      const li = ul.ownerDocument.createElement("li");
      li.textContent = b;
      ul.appendChild(li);
    });
    return;
  }
  if (fillStructuredTableColumns(root, compactStructuredSlideColumns(bullets, themeTextBudget))) {
    return;
  }
  const targets = isSpaceBright ? getSpaceBrightPrimaryTextTargets(
    root,
    Array.from(root.querySelectorAll("[data-shell-text-target]")).sort(
      (a, b) =>
        Number(a.getAttribute("data-shell-text-target") || 0) - Number(b.getAttribute("data-shell-text-target") || 0),
    ),
  ) : Array.from(root.querySelectorAll("[data-shell-text-target]")).sort(
    (a, b) =>
      Number(a.getAttribute("data-shell-text-target") || 0) - Number(b.getAttribute("data-shell-text-target") || 0),
  );
  if (targets.length) {
    if (
      isSealife &&
      targets.length === 2 &&
      targets.every((node) => !isHeadlineShellTarget(node)) &&
      themeTextBudget
    ) {
      setShellTextContent(targets[0], buildSealifeLeadHeadlineText(renderTitle, bullets, themeTextBudget));
      setShellTextContent(
        targets[1],
        buildSealifeRichDetailText(
          renderTitle,
          bullets,
          themeTextBudget,
          getSealifeRoomyDetailCount(slideRoot || root),
        ),
      );
      return;
    }
    if (isSealife && targets.length === 1 && !isHeadlineShellTarget(targets[0]) && themeTextBudget) {
      const detail = buildSealifeRichDetailText(
        renderTitle,
        bullets,
        themeTextBudget,
        getSealifeRoomyDetailCount(slideRoot || root),
      );
      setShellTextContent(targets[0], detail);
      return;
    }
    const pairCount = getStructuredShellTextPairCount(targets);
    if (pairCount >= 2) {
      const textPairs = compactPairs(buildBalancedSlideTextPairs(renderTitle, bullets, pairCount));
      textPairs.forEach((pick, idx) => {
        const headlineNode = targets[idx * 2];
        const detailNode = targets[idx * 2 + 1];
        if (headlineNode) {
          setShellTextContent(headlineNode, pick.headline);
        }
        if (detailNode) {
          setShellTextContent(detailNode, pick.detail || pick.headline);
        }
      });
      fillSpaceBrightExampleBox(root, renderTitle, bullets, pairCount);
      return;
    }

    const textPool = compactPairs(buildSlideTextPool(renderTitle, bullets, targets.length));
    let poolIndex = 0;
    let pendingPick = null;
    targets.forEach((node, idx) => {
      const isHeadline = isHeadlineShellTarget(node);
      const nextNode = targets[idx + 1] || null;
      const nextNeedsDetail = !!nextNode && !isHeadlineShellTarget(nextNode);

      if (isHeadline) {
        if (pendingPick) {
          poolIndex += 1;
          pendingPick = null;
        }
        const pick = textPool[poolIndex % textPool.length] || { headline: renderTitle, detail: renderTitle };
        setShellTextContent(node, pick.headline);
        if (nextNeedsDetail) {
          pendingPick = pick;
        } else {
          poolIndex += 1;
        }
        return;
      }

      const pick = pendingPick || textPool[poolIndex % textPool.length] || { headline: renderTitle, detail: renderTitle };
      setShellTextContent(node, pick.detail || pick.headline);
      poolIndex += 1;
      pendingPick = null;
    });
    fillSpaceBrightExampleBox(root, renderTitle, bullets, targets.length);
    return;
  }
  if (isSpaceBright && shouldSkipSpaceBrightFallbackBody(root)) {
    return;
  }
  const sink = resolveShellContentSink(slideRoot || /** @type {Element} */ (root));
  const listDoc = slideRoot?.ownerDocument || (root instanceof Element ? root.ownerDocument : null);
  if (!listDoc) {
    return;
  }
  const list = ensureFallbackShellList(listDoc, sink);
  list.replaceChildren();
  compactItems(buildSlideBulletItems(renderTitle, bullets, isSpaceBright || isComic ? 2 : 3)).forEach((b) => {
    const li = list.ownerDocument.createElement("li");
    li.textContent = b;
    list.appendChild(li);
  });
}

/**
 * Hard word-cap post-pass for space-black theme.
 * Runs after fillContentSlots to ensure no text node in content areas
 * exceeds layout-specific word limits, regardless of fill path taken.
 * @param {Element} slideRoot
 */
function enforceSpaceBlackWordCap(slideRoot) {
  /** @param {string} text @param {number} maxWords @returns {string} */
  const capWords = (text, maxWords) => {
    const trimmed = String(text || "").replace(/\s+/g, " ").trim();
    const words = trimmed.split(" ").filter(Boolean);
    if (words.length <= maxWords) return trimmed;
    return words.slice(0, maxWords).join(" ") + "...";
  };
  /** @param {Element} node @param {number} maxWords */
  const capElement = (node, maxWords) => {
    const current = node.textContent || "";
    const capped = capWords(current, maxWords);
    if (capped !== current.replace(/\s+/g, " ").trim()) {
      node.textContent = capped;
    }
  };

  const hasTiled = !!slideRoot.querySelector(".tiled-content > .tile");
  const hasTable = !!slideRoot.querySelector(".table-like");
  const hasGrid = !!slideRoot.querySelector(".grid-2 > .small-tile, .grid-3 > .small-tile");
  const hasTimeline = !!slideRoot.querySelector(".timeline-layout");
  const hasTwoCol = !!slideRoot.querySelector(".two-column");

  // Bullets (li)
  const bulletMaxWords = hasTwoCol ? 14 : hasTable ? 12 : hasTiled ? 9 : hasGrid ? 13 : 13;
  slideRoot.querySelectorAll("ul[data-shell='bullets'] li").forEach((li) => capElement(li, bulletMaxWords));

  // Table-like cells
  if (hasTable) {
    slideRoot.querySelectorAll(".label-pill").forEach((el) => capElement(el, 5));
    slideRoot.querySelectorAll(".row-text").forEach((el) => capElement(el, 14));
  }

  // Tile / small-tile detail paragraphs
  if (hasTiled) {
    slideRoot.querySelectorAll(".tiled-content .tile p, .tiled-content .tile h3").forEach((el) => {
      const isHeading = el.tagName === "H3";
      capElement(el, isHeading ? 5 : 10);
    });
  }
  if (hasGrid) {
    slideRoot.querySelectorAll(".small-tile p, .small-tile li").forEach((el) => capElement(el, 12));
    slideRoot.querySelectorAll(".small-tile h3").forEach((el) => capElement(el, 5));
  }

  // Styled-bullets detail
  slideRoot.querySelectorAll(".styled-bullets li p").forEach((el) => capElement(el, 12));

  // data-shell-text-target nodes not covered above
  const contentSelectors = ".tile h3, .tile p, .small-tile h3, .small-tile p, .label-pill, .row-text, .timeline-item h3, .timeline-item p";
  slideRoot.querySelectorAll(`[data-shell-text-target]:not(${contentSelectors})`).forEach((el) => {
    const isHeading = /H[1-4]|STRONG|TH/.test(el.tagName);
    capElement(el, isHeading ? 5 : 12);
  });
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
  enforceSlideShellDesktopViewport(doc);
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
      enforceSlideShellDesktopViewport(doc);
    }
  }

  master = doc.querySelector("#slides-master-container");
  const coverTemplate = getShellCoverTemplate(doc);
  const endingTemplate = getShellEndingTemplate(doc);
  const variantTemplates = getShellVariantTemplates(doc);
  const isSpaceBrightTheme = !!doc.body?.classList?.contains("shell-theme-space-bright");
  const isSpaceBlackTheme = !!doc.body?.classList?.contains("shell-theme-space-black");

  if (!master || (!coverTemplate && !variantTemplates.length)) {
    injectShellPreviewFit(doc);
    injectShellPanelFitScript(doc);
    injectSlideVisualEditor(doc);
    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  }

  master.replaceChildren();

  const list = Array.isArray(slides) ? slides : [];
  const bodyTemplates = endingTemplate ? variantTemplates.filter((tpl) => tpl !== endingTemplate) : variantTemplates;
  list.forEach((s, i) => {
    const isLastSlide = i === list.length - 1;
    const bodyIndex = coverTemplate ? i - 1 : i;
    const pick =
      list.length === 1 && endingTemplate
        ? endingTemplate
        : coverTemplate && i === 0
        ? coverTemplate
        : isLastSlide && endingTemplate
          ? endingTemplate
          : bodyTemplates[bodyIndex] || null;
    if (!pick) return;
    const frag = pick.content.cloneNode(true);
    const first = frag.firstElementChild;
    if (!first) return;
    first.setAttribute("data-shell-slide-index", String(i));
    first.classList.add("shell-slide-instance");
    const isAuthoredSlide = isAuthoredShellTemplate(pick);
    if (isAuthoredSlide) {
      first.setAttribute("data-shell-authored-slide", "1");
    }
    fillContentSlots(
      frag,
      String(s?.title || ""),
      Array.isArray(s?.bullets) ? s.bullets.map(String) : [],
      { forceSpaceBright: isSpaceBrightTheme },
    );
    if (first instanceof Element) relocateThemeStickersUnderSlideContent(first);
    master.appendChild(frag);
    if (isSpaceBrightTheme && first instanceof Element) {
      backfillSpaceBrightEmptyExampleBoxes(
        first,
        String(s?.title || ""),
        Array.isArray(s?.bullets) ? s.bullets.map(String) : [],
      );
    }
    if (isSpaceBlackTheme && first instanceof Element) {
      enforceSpaceBlackWordCap(first);
    }
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
 * Count how many authored slide layouts exist in a shell file.
 * No synthetic variants are added here; the number reflects the original template only.
 * @param {string} shellHtml
 * @returns {number}
 */
export function countRenderableShellSlides(shellHtml) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(String(shellHtml || ""), "text/html");
  stripIframeScripts(doc);
  if (doc.querySelector('link[href*="Bangers"]') && doc.body && !doc.body.classList.contains("shell-theme-comic")) {
    doc.body.classList.add("shell-theme-comic");
  }
  let master = doc.querySelector("#slides-master-container");
  let tpl =
    doc.querySelector("template#layout-content") ||
    doc.querySelector("template#shell-slide-content") ||
    doc.querySelector("template[data-shell-layout=\"content\"]");
  if (!master || !tpl) {
    if (!ensureShellFromFullDeck(doc)) return 0;
  }
  const coverTemplate = getShellCoverTemplate(doc);
  const variantTemplates = getShellVariantTemplates(doc);
  return (coverTemplate ? 1 : 0) + variantTemplates.length;
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
 * @param {HTMLIFrameElement} iframe
 * @returns {HTMLElement | null}
 */
function getSlideShellFrame(iframe) {
  const parent = iframe.parentElement;
  if (parent instanceof HTMLElement && parent.classList.contains("exp-slide-shell-frame")) return parent;
  return null;
}

/**
 * @param {HTMLIFrameElement} iframe
 * @returns {number}
 */
function measureSlideShellAvailableMobileHeight(iframe) {
  const frame = getSlideShellFrame(iframe);
  const frameRect =
    frame?.getBoundingClientRect?.() ||
    iframe.getBoundingClientRect?.() || {
      top: 0,
      bottom: 0,
      height: 0,
    };
  const shell = frame?.closest(".exp-shell") || iframe.closest(".exp-shell");
  const experienceBody =
    shell?.closest(".experience-body") ||
    iframe.closest(".experience-body") ||
    iframe.ownerDocument?.querySelector(".experience-body");
  const footer = shell?.querySelector(".exp-footer-bar");
  const bodyRect =
    experienceBody instanceof HTMLElement
      ? experienceBody.getBoundingClientRect()
      : iframe.ownerDocument?.documentElement?.getBoundingClientRect?.() || {
          top: 0,
          bottom: iframe.ownerDocument?.defaultView?.innerHeight || 0,
        };
  const footerHeight = footer instanceof HTMLElement ? Math.max(footer.offsetHeight, footer.getBoundingClientRect().height) : 0;
  const bodyPaddingBottom =
    experienceBody instanceof HTMLElement
      ? parseFloat((iframe.ownerDocument?.defaultView || window).getComputedStyle(experienceBody).paddingBottom || "0") || 0
      : 0;
  const availableHeight =
    Number(bodyRect.bottom || 0) -
    Number(frameRect.top || 0) -
    footerHeight -
    bodyPaddingBottom -
    SLIDE_SHELL_MOBILE_FRAME_FOOTER_GAP_PX;

  return Math.max(1, Math.floor(availableHeight));
}

/**
 * Keep mobile slide preview visually identical to the desktop template:
 * render the iframe at the original desktop width, then scale the full slide down
 * to the available phone width instead of letting the template reflow for a narrow viewport.
 *
 * @param {HTMLIFrameElement} iframe
 * @param {number} contentHeight
 * @param {{ fitHeight?: boolean }} [opts]
 */
function applySlideShellDesktopScale(iframe, contentHeight, opts = {}) {
  const frame = getSlideShellFrame(iframe);
  const doc = iframe.contentDocument;
  if (doc) setSlideShellViewportWidth(doc, SLIDE_SHELL_MOBILE_VIEWPORT_WIDTH_PX);
  /* Use the frame / viewport container width — NOT iframe.clientWidth which is
     set to baseWidth (1600) by this very function and would poison subsequent
     recalculations, producing scale ≈ 1 instead of the correct ~0.2 on phones. */
  const viewport = frame?.closest(".exp-slide-viewport") || null;
  const hostWidth = Math.max(
    Number(frame?.clientWidth) || 0,
    Number(viewport?.clientWidth) || 0,
    1,
  );
  const baseWidth = SLIDE_SHELL_MOBILE_VIEWPORT_WIDTH_PX;
  const safeHeight = Math.max(1, Math.ceil(Number(contentHeight) || 0));
  const innerGutter = SLIDE_SHELL_MOBILE_INLINE_GUTTER_PX * 2;
  const widthScale = Math.min(1, Math.max(1, hostWidth - innerGutter) / baseWidth);
  let scale = widthScale;
  if (opts.fitHeight) {
    const availableHeight = measureSlideShellAvailableMobileHeight(iframe);
    const heightScale = Math.min(1, availableHeight / safeHeight);
    scale = Math.min(scale, heightScale);
  }
  const scaledHeight = Math.max(1, Math.ceil(safeHeight * scale));

  if (frame) {
    frame.style.height = `${scaledHeight}px`;
    frame.style.overflow = "hidden";
  }

  iframe.style.width = `${baseWidth}px`;
  iframe.style.maxWidth = "none";
  iframe.style.height = `${safeHeight}px`;
  iframe.style.position = "absolute";
  iframe.style.top = "0";
  iframe.style.left = "50%";
  iframe.style.margin = "0";
  iframe.style.transform = `translateX(-50%) scale(${scale})`;
  iframe.style.transformOrigin = "top center";
  iframe.style.aspectRatio = "auto";
  iframe.style.overflow = "hidden";
}

/**
 * @param {HTMLIFrameElement} iframe
 */
function clearSlideShellDesktopScale(iframe) {
  const frame = getSlideShellFrame(iframe);
  const doc = iframe.contentDocument;
  if (doc) setSlideShellViewportWidth(doc, SLIDE_SHELL_DESKTOP_VIEWPORT_WIDTH_PX);
  if (frame) {
    frame.style.removeProperty("height");
    frame.style.removeProperty("overflow");
  }
  iframe.style.removeProperty("width");
  iframe.style.removeProperty("max-width");
  iframe.style.removeProperty("height");
  iframe.style.removeProperty("position");
  iframe.style.removeProperty("top");
  iframe.style.removeProperty("left");
  iframe.style.removeProperty("margin");
  iframe.style.removeProperty("transform");
  iframe.style.removeProperty("transform-origin");
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
        node.style.overflowY = "hidden";
      } else {
        node.style.removeProperty("overflow");
      node.style.removeProperty("overflow-x");
        node.style.removeProperty("overflow-y");
      }
    });
  if (master instanceof HTMLElement) {
    if (mode === "active") {
      master.style.minHeight = "100vh";
      master.style.justifyContent = "center";
      master.style.paddingTop = "0";
      master.style.paddingBottom = "0";
    } else {
      master.style.removeProperty("min-height");
      master.style.removeProperty("justify-content");
      master.style.removeProperty("padding-top");
      master.style.removeProperty("padding-bottom");
    }
  }
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
  const hostWin = iframe.ownerDocument?.defaultView || window;
  const isMobileViewport = Boolean(hostWin?.matchMedia?.("(max-width: 640px)")?.matches);
  const height = measureSlideShellDeckHeight(iframe);
  if (isMobileViewport) {
    applySlideShellDesktopScale(iframe, height || 720);
    return;
  }
  clearSlideShellDesktopScale(iframe);
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
  if (slide instanceof Element && slide.matches('[data-shell-authored-slide="1"]')) {
    // Authored shell slides are fixed 1280x720 canvases. Do not let scrollHeight
    // enlarge the iframe, or the preview reintroduces the black/white bars we
    // just removed. If content visually overflows, the slide layout itself should
    // be corrected inside the template rather than expanding the viewer height.
    const authoredBaseHeight = Math.max(
      Number(slideRect.height) || 0,
      Number(slide.offsetHeight) || 0,
      Number(slide.clientHeight) || 0,
      SLIDE_SHELL_STAGE_WIDTH_PX * 9 / 16,
    );
    return Math.max(0, Math.ceil(authoredBaseHeight));
  }
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
 * @param {Document} doc
 */
function runSlideShellPanelFit(doc) {
  try {
    const w = doc.defaultView;
    if (w && typeof w.__slideShellPanelFitRun === "function") {
      w.__slideShellPanelFitRun();
    }
  } catch (_) {
    /* ignore */
  }
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
  runSlideShellPanelFit(doc);
  const hostWin = iframe.ownerDocument?.defaultView || window;
  const isMobileViewport = Boolean(hostWin?.matchMedia?.("(max-width: 640px)")?.matches);
  const activeSlide =
    doc.querySelector(".shell-slide-instance.active") ||
    doc.querySelector(".shell-slide-instance");
  const height = activeSlide ? measureSlideShellActiveHeight(activeSlide) : 0;
  if (isMobileViewport) {
    applySlideShellDesktopScale(iframe, height || 720, { fitHeight: true });
    setSlideShellDocumentScroll(doc, 0);
    return;
  }
  clearSlideShellDesktopScale(iframe);
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

/**
 * CSS + JS nhúng vào srcdoc slide (chỉnh sửa trực quan: kéo, màu, font, ảnh).
 * Giữ ES5 trong JS để tương thích iframe.
 */

export const SLIDE_VISUAL_EDITOR_CSS = `
  body.slide-visual-edit-on {
    cursor: default;
  }
  /* Tránh bôi chữ / kéo chọn khi resize — làm chuột “nhảy” trên tiêu đề & bullet */
  body.slide-visual-edit-on #slides-master-container,
  body.slide-visual-edit-on .shell-slide-instance {
    -webkit-user-select: none;
    user-select: none;
  }
  body.slide-visual-edit-on .shell-slide-instance {
    cursor: grab;
  }
  body.slide-visual-edit-on .shell-slide-instance * {
    cursor: inherit;
  }
  body.slide-visual-edit-on .slide-visual-edit-toolbar,
  body.slide-visual-edit-on .slide-visual-edit-toolbar * {
    cursor: default;
  }
  body.slide-visual-edit-on .shell-slide-instance .sticker {
    pointer-events: auto !important;
  }
  body.slide-visual-edit-on .shell-slide-instance .sticker[data-edit-geom="1"] {
    right: auto !important;
    bottom: auto !important;
    --sticker-inline-offset: initial !important;
    --sticker-block-offset: initial !important;
  }
  /* Phase 1: nested text nodes và template pointer-events:none không được chặn hit-test */
  body.slide-visual-edit-on .shell-slide-instance img,
  body.slide-visual-edit-on .shell-slide-instance .card,
  body.slide-visual-edit-on .shell-slide-instance .content-card,
  body.slide-visual-edit-on .shell-slide-instance .comic-panel,
  body.slide-visual-edit-on .shell-slide-instance [data-shell="title"],
  body.slide-visual-edit-on .shell-slide-instance [data-shell="title"] *,
  body.slide-visual-edit-on .shell-slide-instance ul[data-shell="bullets"],
  body.slide-visual-edit-on .shell-slide-instance ul[data-shell="bullets"] *,
  body.slide-visual-edit-on .shell-slide-instance h1,
  body.slide-visual-edit-on .shell-slide-instance h2,
  body.slide-visual-edit-on .shell-slide-instance h3,
  body.slide-visual-edit-on .shell-slide-instance h4,
  body.slide-visual-edit-on .shell-slide-instance h5,
  body.slide-visual-edit-on .shell-slide-instance h6,
  body.slide-visual-edit-on .shell-slide-instance p,
  body.slide-visual-edit-on .shell-slide-instance li,
  body.slide-visual-edit-on .shell-slide-instance blockquote,
  body.slide-visual-edit-on .shell-slide-instance figcaption,
  body.slide-visual-edit-on .shell-slide-instance td,
  body.slide-visual-edit-on .shell-slide-instance th,
  body.slide-visual-edit-on .shell-slide-instance span,
  body.slide-visual-edit-on .shell-slide-instance a,
  body.slide-visual-edit-on .shell-slide-instance strong,
  body.slide-visual-edit-on .shell-slide-instance em,
  body.slide-visual-edit-on .shell-slide-instance b,
  body.slide-visual-edit-on .shell-slide-instance i {
    pointer-events: auto !important;
  }
  body.slide-visual-edit-on .shell-slide-instance .card,
  body.slide-visual-edit-on .shell-slide-instance .content-card,
  body.slide-visual-edit-on .shell-slide-instance .comic-panel {
    overflow: visible !important;
  }
  /* Phase 2: không đụng .shell-panel-fit-* ; không ép position:absolute cho title/card/… khi mới bật Sửa.
     Nếu ép toàn bộ trước khi ensureEditable() gán left/top/data-edit-geom → mọi khối chồng chữ (như ảnh user).
     Định vị tương tác: inline + [data-edit-geom="1"] (shell preview CSS) sau khi chọn phần tử. */
  body.slide-visual-edit-on .shell-slide-instance.slide-container,
  body.slide-visual-edit-on .shell-slide-instance.slide {
    overflow: visible !important;
  }
  /* Viền chọn: không ép position ở đây — ensureEditable gán left/top cùng lúc; ép absolute sớm làm nhảy layout 1 frame */
  body.slide-visual-edit-on [data-edit-selected="1"] {
    outline: none !important;
    z-index: 10050 !important;
  }
  /* Giữ chỗ trong luồng khi phần tử chuyển sang absolute — tránh cả khung slide co/giãn khi bấm chữ */
  body.slide-visual-edit-on .shell-slide-instance .slide-visual-edit-flow-spacer {
    box-sizing: border-box;
    flex-shrink: 0;
    visibility: hidden;
    pointer-events: none;
    padding: 0;
    border: 0;
  }
  /* Khung + tay cầm Canva */
  .slide-visual-edit-handles {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: none;
    pointer-events: none;
    z-index: 100100;
  }
  .slide-visual-edit-handles.is-visible {
    pointer-events: none;
  }
  .slide-visual-edit-handles .ve-outline {
    position: absolute;
    border: 2px solid #7c3aed;
    box-sizing: border-box;
    pointer-events: none;
    border-radius: 2px;
  }
  .slide-visual-edit-handles .ve-handle {
    position: absolute;
    pointer-events: auto;
    box-sizing: border-box;
    touch-action: none;
  }
  .slide-visual-edit-handles .ve-corner {
    width: 14px;
    height: 14px;
    margin-left: -7px;
    margin-top: -7px;
    border-radius: 50%;
    background: #1e88e5;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.35);
  }
  .slide-visual-edit-handles .ve-corner:hover {
    background: #43a047;
  }
  .slide-visual-edit-handles .ve-edge {
    background: #1e88e5;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.35);
  }
  .slide-visual-edit-handles .ve-edge:hover {
    background: #43a047;
  }
  .slide-visual-edit-handles .ve-edge.ve-n,
  .slide-visual-edit-handles .ve-edge.ve-s {
    width: 24px;
    height: 12px;
    margin-left: -12px;
    margin-top: -6px;
    border-radius: 6px;
  }
  .slide-visual-edit-handles .ve-edge.ve-e,
  .slide-visual-edit-handles .ve-edge.ve-w {
    width: 12px;
    height: 24px;
    margin-left: -6px;
    margin-top: -12px;
    border-radius: 6px;
  }
  .slide-visual-edit-handles .ve-nw { cursor: nwse-resize; }
  .slide-visual-edit-handles .ve-ne { cursor: nesw-resize; }
  .slide-visual-edit-handles .ve-sw { cursor: nesw-resize; }
  .slide-visual-edit-handles .ve-se { cursor: nwse-resize; }
  .slide-visual-edit-handles .ve-n { cursor: ns-resize; }
  .slide-visual-edit-handles .ve-s { cursor: ns-resize; }
  .slide-visual-edit-handles .ve-e { cursor: ew-resize; }
  .slide-visual-edit-handles .ve-w { cursor: ew-resize; }
  .slide-visual-edit-toolbar {
    position: fixed;
    left: 50%;
    bottom: 14px;
    transform: translateX(-50%);
    z-index: 99999;
    -webkit-user-select: auto;
    user-select: auto;
    display: none;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    max-width: min(96vw, 900px);
    padding: 12px 16px;
    border-radius: 14px;
    background: rgba(15, 23, 42, 0.92);
    color: #e2e8f0;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .slide-visual-edit-toolbar.is-visible {
    display: flex;
  }
  .slide-visual-edit-toolbar label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
  }
  .slide-visual-edit-toolbar input[type="color"] {
    width: 40px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    background: transparent;
  }
  .slide-visual-edit-toolbar select {
    min-height: 34px;
    border-radius: 8px;
    border: 1px solid #475569;
    background: #1e293b;
    color: #f1f5f9;
    padding: 0 8px;
    font-size: 13px;
    max-width: 200px;
  }
  .slide-visual-edit-toolbar button {
    border-radius: 10px;
    border: 1px solid #64748b;
    background: #334155;
    color: #f8fafc;
    font-weight: 600;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
  }
  .slide-visual-edit-toolbar button:hover {
    background: #475569;
  }
  .slide-visual-edit-hint {
    width: 100%;
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
  }
`;

/** Nội dung IIFE — không dùng template ${ */
export const SLIDE_VISUAL_EDITOR_JS = `(function(){
  var enabled = false;
  var selected = null;
  var drag = null;
  var toolbar = null;
  var handleLayer = null;
  var resizeState = null;
  var handlesRaf = 0;
  var ro = null;
  var DRAG_THRESHOLD = 5;

  function activeSlide() {
    var master = document.querySelector("#slides-master-container");
    var mode = master && master.getAttribute("data-nav-mode") === "active" ? "active" : "scroll";
    if (mode === "active") {
      var a = document.querySelector(".shell-slide-instance.active");
      if (a) return a;
    }
    var idx = typeof window.__slideVisualEditIndex === "number" ? window.__slideVisualEditIndex : 0;
    return document.querySelector('[data-shell-slide-index="' + idx + '"]');
  }

  function collectOuterPanels(slide) {
    var nodes = slide.querySelectorAll(".card, .content-card, .comic-panel");
    var out = [];
    Array.prototype.forEach.call(nodes, function (el) {
      var p = el.parentElement;
      var under = false;
      while (p && p !== slide) {
        if (
          p.classList &&
          (p.classList.contains("card") ||
            p.classList.contains("content-card") ||
            p.classList.contains("comic-panel"))
        ) {
          under = true;
          break;
        }
        p = p.parentElement;
      }
      if (!under) out.push(el);
    });
    return out;
  }

  function hasVisibleText(el) {
    return !!(el && typeof el.textContent === "string" && /\\S/.test(el.textContent));
  }

  function hasDirectText(el) {
    if (!el || !el.childNodes) return false;
    for (var i = 0; i < el.childNodes.length; i++) {
      var child = el.childNodes[i];
      if (child && child.nodeType === 3 && /\\S/.test(child.nodeValue || "")) return true;
    }
    return false;
  }

  function isTextLeafLike(el) {
    if (!el || !el.children || !el.children.length) return false;
    for (var i = 0; i < el.children.length; i++) {
      var child = el.children[i];
      if (!child || child.nodeType !== 1) continue;
      var tag = child.tagName;
      var inlineOnly =
        tag === "SPAN" ||
        tag === "A" ||
        tag === "STRONG" ||
        tag === "EM" ||
        tag === "B" ||
        tag === "I" ||
        tag === "U" ||
        tag === "SMALL" ||
        tag === "SUB" ||
        tag === "SUP" ||
        tag === "MARK" ||
        tag === "BR";
      if (!inlineOnly) return false;
      if (tag !== "BR" && !hasDirectText(child) && !isTextLeafLike(child)) return false;
    }
    return hasVisibleText(el);
  }

  function isEditableTextElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (
      el.classList &&
      (el.classList.contains("sticker") ||
        el.classList.contains("card") ||
        el.classList.contains("content-card") ||
        el.classList.contains("comic-panel") ||
        el.classList.contains("slide-visual-edit-flow-spacer"))
    ) {
      return false;
    }
    var tag = el.tagName;
    if (
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "TEMPLATE" ||
      tag === "IMG" ||
      tag === "SVG" ||
      tag === "PATH" ||
      tag === "BR" ||
      tag === "HR"
    ) {
      return false;
    }
    if (el.getAttribute("data-shell") === "title") return true;
    if (tag === "UL" && el.getAttribute("data-shell") === "bullets") return true;
    if (tag === "LI" && el.parentElement && el.parentElement.getAttribute("data-shell") === "bullets") return true;
    if (!hasVisibleText(el)) return false;
    if (
      tag === "H1" ||
      tag === "H2" ||
      tag === "H3" ||
      tag === "H4" ||
      tag === "H5" ||
      tag === "H6" ||
      tag === "P" ||
      tag === "LI" ||
      tag === "BLOCKQUOTE" ||
      tag === "FIGCAPTION" ||
      tag === "TD" ||
      tag === "TH" ||
      tag === "CAPTION"
    ) {
      return true;
    }
    if (tag === "DIV") {
      return hasDirectText(el);
    }
    if (tag === "SPAN" || tag === "A") {
      if (hasDirectText(el)) return true;
      return isTextLeafLike(el);
    }
    return false;
  }

  function isStructuredTextTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName;
    if (el.getAttribute("data-shell") === "title") return true;
    if (tag === "UL" && el.getAttribute("data-shell") === "bullets") return true;
    return (
      tag === "H1" ||
      tag === "H2" ||
      tag === "H3" ||
      tag === "H4" ||
      tag === "H5" ||
      tag === "H6" ||
      tag === "P" ||
      tag === "LI" ||
      tag === "BLOCKQUOTE" ||
      tag === "FIGCAPTION" ||
      tag === "TD" ||
      tag === "TH" ||
      tag === "CAPTION"
    );
  }

  function isTransparentColor(value) {
    return !value || value === "transparent" || value === "rgba(0, 0, 0, 0)";
  }

  function hasVisibleBorder(cs) {
    if (!cs) return false;
    var sides = [
      [cs.borderTopStyle, cs.borderTopWidth],
      [cs.borderRightStyle, cs.borderRightWidth],
      [cs.borderBottomStyle, cs.borderBottomWidth],
      [cs.borderLeftStyle, cs.borderLeftWidth],
    ];
    for (var i = 0; i < sides.length; i++) {
      var style = sides[i][0];
      var width = parseFloat(sides[i][1]) || 0;
      if (style && style !== "none" && width > 0) return true;
    }
    return false;
  }

  function isEditablePanelElement(el, slide) {
    if (!el || el.nodeType !== 1 || !slide || el === slide) return false;
    if (
      el.classList &&
      (el.classList.contains("sticker") ||
        el.classList.contains("slide-visual-edit-flow-spacer") ||
        el.classList.contains("shell-panel-fit-wrap") ||
        el.classList.contains("shell-panel-fit-sizer"))
    ) {
      return false;
    }
    var tag = el.tagName;
    if (
      tag === "IMG" ||
      tag === "SVG" ||
      tag === "PATH" ||
      tag === "SCRIPT" ||
      tag === "STYLE" ||
      tag === "TEMPLATE" ||
      tag === "BR" ||
      tag === "HR"
    ) {
      return false;
    }
    if (isEditableTextElement(el)) return false;
    var cs = window.getComputedStyle(el);
    if (!cs || cs.display === "contents" || cs.display === "inline") return false;
    if (isTransparentColor(cs.backgroundColor) && cs.boxShadow === "none" && !hasVisibleBorder(cs)) {
      return false;
    }
    if (!hasVisibleText(el) && !el.querySelector("img,svg,video,canvas")) return false;
    var rect = el.getBoundingClientRect();
    var slideRect = slide.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 28) return false;
    if (rect.width >= slideRect.width * 0.985 && rect.height >= slideRect.height * 0.985) return false;
    return true;
  }

  function collectTargets(slide) {
    if (!slide) return [];
    var list = [];
    collectOuterPanels(slide).forEach(function (panel) {
      list.push(panel);
    });
    slide.querySelectorAll("div,section,article,aside,figure").forEach(function (node) {
      if (isEditablePanelElement(node, slide)) list.push(node);
    });
    slide.querySelectorAll("img").forEach(function (img) {
      list.push(img);
    });
    var t = slide.querySelector('[data-shell="title"]');
    if (t) list.push(t);
    slide.querySelectorAll('ul[data-shell="bullets"]').forEach(function (bul) {
      list.push(bul);
    });
    slide
      .querySelectorAll(
        'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,caption,div,span,a,[data-shell="title"],ul[data-shell="bullets"]'
      )
      .forEach(function (node) {
        if (isEditableTextElement(node)) list.push(node);
      });
    slide.querySelectorAll(".sticker").forEach(function (s) {
      list.push(s);
    });
    return list;
  }

  function targetSet(slide) {
    return new Set(collectTargets(slide));
  }

  function resolveHit(slide, node) {
    var set = targetSet(slide);
    var n = node;
    var fallback = null;
    /* span/b/i; text node; shadow root (parentElement === null) */
    while (n && n !== slide) {
      if (n.nodeType === 3) {
        n = n.parentNode;
        continue;
      }
      if (set.has(n)) {
        if (isStructuredTextTarget(n)) return n;
        if (!fallback) fallback = n;
      }
      var pe = n.parentElement;
      if (pe) {
        n = pe;
      } else if (n.parentNode && n.parentNode.nodeType === 11 && n.parentNode.host) {
        n = n.parentNode.host;
      } else {
        n = null;
      }
    }
    return fallback;
  }

  function getSlideInstance(el) {
    var n = el;
    while (n) {
      if (n.classList && n.classList.contains("shell-slide-instance")) return n;
      n = n.parentElement;
    }
    return null;
  }

  /**
   * Khối chứa cho position:absolute của el (ancestor gần nhất có position ≠ static hoặc transform/filter).
   * left/top phải tính theo khối này — nếu tính theo .shell-slide-instance trong khi neo vào .shell-panel-fit-sizer
   * thì chữ sẽ nhảy khi lần đầu chọn.
   */
  function absoluteContainingBlock(el, slide) {
    var p = el.parentElement;
    while (p && p !== slide) {
      var cs = window.getComputedStyle(p);
      if (cs.position !== "static") return p;
      if (cs.transform && cs.transform !== "none") return p;
      if (cs.filter && cs.filter !== "none") return p;
      if (cs.perspective && cs.perspective !== "none") return p;
      p = p.parentElement;
    }
    return slide;
  }

  function createFlowSpacerElement(el) {
    if (!el || !el.tagName) return document.createElement("div");
    var tag = el.tagName;
    if (
      tag === "TD" ||
      tag === "TH" ||
      tag === "CAPTION" ||
      tag === "LI" ||
      tag === "UL" ||
      tag === "OL"
    ) {
      return document.createElement(tag.toLowerCase());
    }
    return document.createElement("div");
  }

  /**
   * Khi đưa title/bullet/card sang absolute, chỗ cũ trong flex/block bị mất → panel nhảy.
   * Chèn spacer (invisible, cùng kích thước ô cũ) trước khi absolute — chỉ khi phần tử vẫn đang trong luồng.
   */
  function insertFlowSpacerIfNeeded(el) {
    if (!el || el.getAttribute("data-edit-has-flow-spacer") === "1") return false;
    var cs0 = window.getComputedStyle(el);
    if (cs0.position === "absolute" || cs0.position === "fixed") return false;
    var parent = el.parentElement;
    if (!parent) return false;
    /*
     * offset*: ô layout (transform trên element không đổi offsetHeight).
     * getBoundingClientRect: có tổ tiên transform thì AABB phình; chữ có text-shadow/stroke có thể rect > offset 1–2px.
     * Lấy min(ô layout, rect) để spacer không cao/rộng hơn chỗ trong luồng → tránh tụt ~1mm (comic và theme khác).
     */
    var r = el.getBoundingClientRect();
    var ow = el.offsetWidth;
    var oh = el.offsetHeight;
    var w = Math.max(1, Math.min(ow, r.width));
    var hBorder = Math.max(1, Math.min(oh, r.height));
    var sp = createFlowSpacerElement(el);
    sp.className = "slide-visual-edit-flow-spacer";
    sp.setAttribute("data-edit-flow-spacer", "1");
    sp.setAttribute("aria-hidden", "true");
    if (el.hasAttribute("colspan")) sp.setAttribute("colspan", el.getAttribute("colspan"));
    if (el.hasAttribute("rowspan")) sp.setAttribute("rowspan", el.getAttribute("rowspan"));
    sp.style.marginTop = cs0.marginTop;
    sp.style.marginBottom = cs0.marginBottom;
    sp.style.marginLeft = cs0.marginLeft;
    sp.style.marginRight = cs0.marginRight;
    sp.style.boxSizing = "border-box";
    sp.style.display = cs0.display;
    sp.style.verticalAlign = cs0.verticalAlign;
    sp.style.paddingTop = cs0.paddingTop;
    sp.style.paddingRight = cs0.paddingRight;
    sp.style.paddingBottom = cs0.paddingBottom;
    sp.style.paddingLeft = cs0.paddingLeft;
    sp.style.borderTopWidth = cs0.borderTopWidth;
    sp.style.borderRightWidth = cs0.borderRightWidth;
    sp.style.borderBottomWidth = cs0.borderBottomWidth;
    sp.style.borderLeftWidth = cs0.borderLeftWidth;
    sp.style.borderTopStyle = cs0.borderTopStyle;
    sp.style.borderRightStyle = cs0.borderRightStyle;
    sp.style.borderBottomStyle = cs0.borderBottomStyle;
    sp.style.borderLeftStyle = cs0.borderLeftStyle;
    sp.style.borderTopColor = cs0.borderTopColor;
    sp.style.borderRightColor = cs0.borderRightColor;
    sp.style.borderBottomColor = cs0.borderBottomColor;
    sp.style.borderLeftColor = cs0.borderLeftColor;
    sp.style.listStyleType = "none";
    var pcs = window.getComputedStyle(parent);
    var disp = pcs.display;
    var isFlex = disp === "flex" || disp === "inline-flex";
    var flexDir = isFlex ? pcs.flexDirection || "row" : "";
    var isRow = isFlex && (flexDir === "row" || flexDir === "row-reverse");
    if (isFlex) {
      sp.style.flexGrow = cs0.flexGrow;
      sp.style.flexShrink = cs0.flexShrink;
      sp.style.flexBasis = cs0.flexBasis;
    }
    /*
     * Flex row containers need an explicit measured spacer; width:auto can collapse
     * once the edited element becomes absolute and leaves the flex layout.
     */
    if (isRow) {
      sp.style.width = w + "px";
      sp.style.minWidth = w + "px";
      sp.style.maxWidth = "none";
      sp.style.height = hBorder + "px";
      sp.style.minHeight = hBorder + "px";
    } else {
      sp.style.width = w + "px";
      sp.style.height = hBorder + "px";
      sp.style.minHeight = hBorder + "px";
    }
    if (cs0.alignSelf && cs0.alignSelf !== "auto") {
      sp.style.alignSelf = cs0.alignSelf;
    }
    parent.insertBefore(sp, el);
    el.setAttribute("data-edit-has-flow-spacer", "1");
    return true;
  }

  function ensureEditable(el) {
    var slide = getSlideInstance(el);
    if (!slide) return;

    function offsetFromContainingBlock() {
      var cb = absoluteContainingBlock(el, slide);
      var isSticker = !!(el.classList && el.classList.contains("sticker"));
      if (isSticker && el.offsetParent === cb) {
        var elCs0 = window.getComputedStyle(el);
        var mElL0 = parseFloat(elCs0.marginLeft) || 0;
        var mElT0 = parseFloat(elCs0.marginTop) || 0;
        var lx0 = el.offsetLeft - mElL0 + cb.scrollLeft;
        var ty0 = el.offsetTop - mElT0 + cb.scrollTop;
        var ow0 = el.offsetWidth;
        var oh0 = el.offsetHeight;
        var availW0 = Math.max(1, cb.clientWidth - lx0);
        return {
          cb: cb,
          lx: lx0,
          ty: ty0,
          wpx: Math.max(1, ow0),
          hpx: Math.max(1, oh0),
          ow: ow0,
          oh: oh0,
          availW: availW0,
        };
      }
      var er = el.getBoundingClientRect();
      var br = cb.getBoundingClientRect();
      /*
       * CSS position:absolute tính left/top từ padding-edge của containing block,
       * nhưng getBoundingClientRect() bắt đầu từ border-edge.
       * Phải trừ border của cb để lx/ty khớp với CSS coordinate system — tránh shift nhẹ.
       * Không Math.round — tránh lệch subpixel so với vị trí thật trên màn hình.
       */
      var cbCs = window.getComputedStyle(cb);
      var elCs = window.getComputedStyle(el);
      var cbBL = parseFloat(cbCs.borderLeftWidth) || 0;
      var cbBT = parseFloat(cbCs.borderTopWidth) || 0;
      var mElL = parseFloat(elCs.marginLeft) || 0;
      var mElT = parseFloat(elCs.marginTop) || 0;
      /* position:absolute: top/left là khoảng tới margin edge — rect là border box */
      var lx = er.left - br.left - cbBL + cb.scrollLeft - mElL;
      var ty = er.top - br.top - cbBT + cb.scrollTop - mElT;
      /* Chụp sớm — trước khi chèn spacer thay đổi layout */
      var ow = el.offsetWidth;
      var oh = el.offsetHeight;
      var wpx = Math.max(1, er.width, ow);
      var hpx = Math.max(1, er.height, oh);
      /*
       * Khi element ở in-flow có width:100% (vd. .slide-title), width = container contentWidth.
       * Sau khi chuyển sang position:absolute, width của element tính từ padding-edge của cb.
       * cb.clientWidth = nội dung + padding của cb (không trừ padding).
       * cb left-offset của el = lx (kể cả padding trái của cb).
       * => max available = cb.clientWidth - lx.
       * Dùng giá trị này đảm bảo width không hẹp hơn in-flow width.
       */
      var availW = Math.max(1, cb.clientWidth - lx);
      return {
        cb: cb,
        lx: lx,
        ty: ty,
        wpx: wpx,
        hpx: hpx,
        ow: ow,
        oh: oh,
        availW: availW,
      };
    }

    function releaseStickerAnchors(frozenX, frozenY) {
      if (!(el.classList && el.classList.contains("sticker"))) return;
      var nextX = typeof frozenX === "number" && isFinite(frozenX) ? frozenX : parseFloat(el.getAttribute("data-edit-x"));
      var nextY = typeof frozenY === "number" && isFinite(frozenY) ? frozenY : parseFloat(el.getAttribute("data-edit-y"));
      if (isFinite(nextX)) {
        el.style.setProperty("left", pxStr(nextX), "important");
      }
      if (isFinite(nextY)) {
        el.style.setProperty("top", pxStr(nextY), "important");
      }
      el.style.setProperty("--sticker-inline-offset", "initial", "important");
      el.style.setProperty("--sticker-block-offset", "initial", "important");
      el.style.setProperty("right", "auto", "important");
      el.style.setProperty("bottom", "auto", "important");
      el.removeAttribute("data-sticker-side");
      el.removeAttribute("data-sticker-vertical");
      el.removeAttribute("data-sticker-lane");
    }

    function applyTextBoxStyles(snap) {
      if (el.classList && el.classList.contains("sticker")) {
        el.style.removeProperty("width");
        el.style.removeProperty("height");
        el.style.removeProperty("min-height");
        el.style.removeProperty("max-height");
        el.style.removeProperty("max-width");
        el.style.setProperty("width", "auto", "important");
        el.style.setProperty("height", "auto", "important");
        return;
      }
      if (isEditableTextElement(el)) {
        var isTitle = el.getAttribute("data-shell") === "title";
        /*
         * Khoá theo kích thước đang hiển thị thực tế để không làm text box “nở” ngang
         * khi chuyển sang absolute. Cách lấy chiều rộng theo available-width trước đây
         * từng làm cell/bullet/title rộng sang cột khác rồi chữ từ nhiều dòng bị dồn thành 1 dòng.
         */
        var wPx = isTitle ? Math.max(snap.wpx, snap.ow) : Math.ceil(Math.max(snap.wpx, snap.ow));
        var hMin = isTitle ? Math.max(snap.hpx, snap.oh) : Math.ceil(Math.max(snap.hpx, snap.oh));
        el.style.setProperty("box-sizing", "border-box", "important");
        el.style.setProperty("width", pxStr(wPx), "important");
        el.style.setProperty("min-height", pxStr(hMin), "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("max-width", "none", "important");
        el.style.setProperty("white-space", "pre-wrap", "important");
        el.style.setProperty("overflow-wrap", "break-word", "important");
      } else if (isEditablePanelElement(el, slide)) {
        /*
         * Card/panel chứa nhiều text thường đang dùng flex/grid hoặc phụ thuộc natural height.
         * Nếu khóa cứng height ngay khi click chọn, chỉ cần width lệch nhẹ là nội dung reflow
         * rồi tiêu đề/đoạn/list bị tụt xuống trong hầu hết template.
         * Giữ width theo kích thước hiện tại nhưng để height:auto và chỉ neo min-height gốc.
         */
        el.style.setProperty("box-sizing", "border-box", "important");
        var wPanel = Math.max(1, Math.min(snap.wpx, snap.ow));
        var hPanel = Math.max(1, Math.min(snap.hpx, snap.oh));
        el.style.setProperty("width", pxStr(wPanel), "important");
        el.style.setProperty("min-height", pxStr(hPanel), "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("max-width", "none", "important");
      } else {
        /* Khối .card / .comic-panel / ảnh: max(er, offset) dễ làm panel “nở” so với ô flex — khóa theo min */
        el.style.boxSizing = "border-box";
        var wLock = Math.max(1, Math.min(snap.wpx, snap.ow));
        var hLock = Math.max(1, Math.min(snap.hpx, snap.oh));
        el.style.width = pxStr(wLock);
        el.style.height = pxStr(hLock);
      }
    }

    function pxStr(v) {
      var n = Math.round(v * 1000) / 1000;
      return n + "px";
    }

    if (el.getAttribute("data-edit-geom") === "1") {
      var x = parseFloat(el.getAttribute("data-edit-x"));
      var y = parseFloat(el.getAttribute("data-edit-y"));
      var cs1 = window.getComputedStyle(el);
      if ((cs1.position === "absolute" || cs1.position === "fixed") && !isNaN(x) && !isNaN(y)) {
        /* Fast-path: phần tử đã absolute + đã có toạ độ lưu.
         * Vẫn cần đảm bảo width/height đang được lock (có thể bị template CSS reset giữa 2 click).
         * Đo nhanh và re-apply nếu chưa được set inline. */
        releaseStickerAnchors(x, y);
        el.style.setProperty("position", "absolute", "important");
        el.style.left = pxStr(x);
        el.style.top = pxStr(y);
        if (isEditableTextElement(el) && !el.style.width) {
          var snapFast = offsetFromContainingBlock();
          applyTextBoxStyles(snapFast);
        }
        return;
      }
      /* Chụp TRƯỚC khi chèn spacer — sau khi chèn, phần tử bị đẩy trong luồng; đo sau sẽ sai và làm chữ nhảy */
      var snapG = offsetFromContainingBlock();
      var insertedGeom = insertFlowSpacerIfNeeded(el);
      if (insertedGeom || isNaN(x) || isNaN(y)) {
        if (insertedGeom || isNaN(x)) x = snapG.lx;
        if (insertedGeom || isNaN(y)) y = snapG.ty;
        el.setAttribute("data-edit-x", String(x));
        el.setAttribute("data-edit-y", String(y));
        if (!el.style.width) {
          applyTextBoxStyles(snapG);
        }
      }
      /* applyTextBoxStyles phải chạy trước absolute (xem nhánh snap3) */
      releaseStickerAnchors(x, y);
      el.style.setProperty("position", "absolute", "important");
      el.style.left = pxStr(x);
      el.style.top = pxStr(y);
      return;
    }

    var sx = el.getAttribute("data-edit-x");
    var sy = el.getAttribute("data-edit-y");
    if (sx != null && sx !== "" && sy != null && sy !== "") {
      var snap2 = offsetFromContainingBlock();
      var insertedAttr = insertFlowSpacerIfNeeded(el);
      var lx0 = parseFloat(sx);
      var ty0 = parseFloat(sy);
      if (insertedAttr || isNaN(lx0) || isNaN(ty0)) {
        lx0 = snap2.lx;
        ty0 = snap2.ty;
        el.setAttribute("data-edit-x", String(lx0));
        el.setAttribute("data-edit-y", String(ty0));
      }
      /* Đảm bảo width/height luôn được lock trước absolute — kể cả lần đầu tiên */
      applyTextBoxStyles(snap2);
      releaseStickerAnchors(lx0, ty0);
      el.style.setProperty("position", "absolute", "important");
      el.style.left = pxStr(lx0);
      el.style.top = pxStr(ty0);
      el.setAttribute("data-edit-geom", "1");
      return;
    }

    var snap3 = offsetFromContainingBlock();
    insertFlowSpacerIfNeeded(el);
    var lx = snap3.lx;
    var ty = snap3.ty;
    el.setAttribute("data-edit-x", String(lx));
    el.setAttribute("data-edit-y", String(ty));
    applyTextBoxStyles(snap3);
    releaseStickerAnchors(lx, ty);
    el.style.setProperty("position", "absolute", "important");
    el.style.left = pxStr(lx);
    el.style.top = pxStr(ty);
    el.setAttribute("data-edit-geom", "1");
  }

  function clearSelectedAttr() {
    document.querySelectorAll('[data-edit-selected="1"]').forEach(function (n) {
      n.removeAttribute("data-edit-selected");
    });
  }

  function resizeElementKind(el) {
    if (!el) return "block";
    if (el.classList && el.classList.contains("sticker")) return "sticker";
    if (el.tagName === "IMG") return "img";
    if (isEditableTextElement(el)) return "text";
    return "block";
  }

  function lockStickerForResize(el) {
    return el.getBoundingClientRect();
  }

  function placeCornerAnchored(el, handle, baseX, baseY, startW, startH) {
    var rect = el.getBoundingClientRect();
    var curW = Math.max(1, rect.width);
    var curH = Math.max(1, rect.height);
    var nextX = baseX;
    var nextY = baseY;
    if (handle === "nw" || handle === "sw") nextX = baseX + (startW - curW);
    if (handle === "nw" || handle === "ne") nextY = baseY + (startH - curH);
    el.setAttribute("data-edit-x", String(nextX));
    el.setAttribute("data-edit-y", String(nextY));
    el.style.left = nextX + "px";
    el.style.top = nextY + "px";
  }

  /**
   * Chữ (tiêu đề / li): đo width lúc block/list-item rồi khóa px — tránh lần đầu đổi sang inline-block làm startW lệch (khung nhảy / thu một nửa).
   */
  function lockTextBoxForEdgeResize(el) {
    el.style.boxSizing = "border-box";
    el.style.minWidth = "0";
    el.style.maxWidth = "none";
    if (el.tagName === "LI") {
      el.style.display = "block";
      el.style.listStylePosition = "inside";
    } else if (el.tagName === "UL" && el.getAttribute("data-shell") === "bullets") {
      el.style.display = "block";
      el.style.listStylePosition = "inside";
    } else {
      el.style.display = "block";
    }
    var r0 = el.getBoundingClientRect();
    var wpx = Math.max(32, r0.width);
    el.style.width = wpx + "px";
    el.style.maxWidth = wpx + "px";
    void el.offsetWidth;
    return el.getBoundingClientRect();
  }

  /** Khóa cả width + height (px) để kéo góc neo đúng — phóng về phía góc đang kéo, góc đối diện đứng yên */
  function lockTextBoxForCornerResize(el) {
    el.style.boxSizing = "border-box";
    el.style.minWidth = "0";
    el.style.maxWidth = "none";
    if (el.tagName === "LI") {
      el.style.display = "block";
      el.style.listStylePosition = "inside";
    } else if (el.tagName === "UL" && el.getAttribute("data-shell") === "bullets") {
      el.style.display = "block";
      el.style.listStylePosition = "inside";
    } else {
      el.style.display = "block";
    }
    var r0 = el.getBoundingClientRect();
    var wpx = Math.max(32, r0.width);
    el.style.width = wpx + "px";
    el.style.maxWidth = wpx + "px";
    el.style.minHeight = "0";
    el.style.height = "auto";
    el.style.maxHeight = "none";
    void el.offsetWidth;
    return el.getBoundingClientRect();
  }

  function buildHandleLayer() {
    if (handleLayer) return;
    handleLayer = document.createElement("div");
    handleLayer.className = "slide-visual-edit-handles";
    handleLayer.setAttribute("aria-hidden", "true");
    handleLayer.style.display = "none";
    handleLayer.innerHTML =
      '<div class="ve-outline"></div>' +
      '<div class="ve-handle ve-corner ve-nw" data-ve-handle="nw"></div>' +
      '<div class="ve-handle ve-corner ve-ne" data-ve-handle="ne"></div>' +
      '<div class="ve-handle ve-corner ve-sw" data-ve-handle="sw"></div>' +
      '<div class="ve-handle ve-corner ve-se" data-ve-handle="se"></div>' +
      '<div class="ve-handle ve-edge ve-n" data-ve-handle="n"></div>' +
      '<div class="ve-handle ve-edge ve-s" data-ve-handle="s"></div>' +
      '<div class="ve-handle ve-edge ve-e" data-ve-handle="e"></div>' +
      '<div class="ve-handle ve-edge ve-w" data-ve-handle="w"></div>';
    document.body.appendChild(handleLayer);
    handleLayer.querySelectorAll("[data-ve-handle]").forEach(function (node) {
      node.addEventListener("pointerdown", onHandlePointerDown, true);
    });
  }

  function onHandlePointerDown(e) {
    if (!enabled || !selected) return;
    var h = e.target && e.target.getAttribute("data-ve-handle");
    if (!h) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (e.pointerId != null && e.currentTarget && e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (err) {}
    ensureEditable(selected);
    var kind = resizeElementKind(selected);
    var r = selected.getBoundingClientRect();
    if (kind === "sticker") {
      r = lockStickerForResize(selected);
    } else if (kind === "text" && (h === "e" || h === "w")) {
      r = lockTextBoxForEdgeResize(selected);
      selected.style.height = "auto";
      selected.style.maxHeight = "none";
    } else if (kind === "text" && (h === "nw" || h === "ne" || h === "sw" || h === "se")) {
      r = lockTextBoxForCornerResize(selected);
    }
    var cs = window.getComputedStyle(selected);
    resizeState = {
      handle: h,
      captureEl: e.currentTarget,
      startX: e.clientX,
      startY: e.clientY,
      startW: r.width,
      startH: r.height,
      startRectLeft: r.left,
      startRectRight: r.right,
      startRectTop: r.top,
      startRectBottom: r.bottom,
      startDataEditX: parseFloat(selected.getAttribute("data-edit-x")) || 0,
      startDataEditY: parseFloat(selected.getAttribute("data-edit-y")) || 0,
      startFont: parseFloat(cs.fontSize) || 16,
      kind: kind,
    };
  }

  function applyResize(e) {
    if (!resizeState || !selected) return;
    if (e.type === "pointermove" && (e.buttons & 1) === 0) return;
    var dx = e.clientX - resizeState.startX;
    var dy = e.clientY - resizeState.startY;
    var h = resizeState.handle;
    var el = selected;
    var kind = resizeState.kind;
    var sw = resizeState.startW;
    var sh = resizeState.startH;

    if (h === "nw" || h === "ne" || h === "sw" || h === "se") {
      var d = 0;
      if (h === "se") d = (dx + dy) / 2;
      else if (h === "nw") d = (-dx - dy) / 2;
      else if (h === "ne") d = (dx - dy) / 2;
      else if (h === "sw") d = (-dx + dy) / 2;
      var bx = resizeState.startDataEditX;
      var by = resizeState.startDataEditY;
      var nwC;
      var nhC;
      if (h === "se") {
        nwC = Math.max(32, sw + dx);
        nhC = Math.max(24, sh + dy);
      } else if (h === "nw") {
        nwC = Math.max(32, sw - dx);
        nhC = Math.max(24, sh - dy);
      } else if (h === "ne") {
        nwC = Math.max(32, sw + dx);
        nhC = Math.max(24, sh - dy);
      } else {
        nwC = Math.max(32, sw - dx);
        nhC = Math.max(24, sh + dy);
      }
      if (kind === "text") {
        var rawTextScale = Math.max(nwC / Math.max(sw, 1), nhC / Math.max(sh, 1));
        var textScale = Math.max(0.35, Math.min(4, rawTextScale));
        var scaledWidth = Math.max(32, sw * textScale);
        el.style.width = scaledWidth + "px";
        el.style.maxWidth = scaledWidth + "px";
        el.style.minHeight = "0";
        el.style.height = "auto";
        el.style.maxHeight = "none";
        el.style.boxSizing = "border-box";
        var sf0 = resizeState.startFont || 16;
        var nf = Math.max(6, Math.min(260, sf0 * textScale));
        el.style.setProperty("font-size", nf + "px", "important");
        placeCornerAnchored(el, h, bx, by, sw, sh);
        return;
      } else if (kind === "sticker") {
        var sfSticker = resizeState.startFont || 16;
        var rawStickerScale = Math.max(nwC / Math.max(sw, 1), nhC / Math.max(sh, 1));
        var stickerScale = Math.max(0.35, Math.min(4.5, rawStickerScale));
        var nextFont = Math.max(8, Math.min(520, sfSticker * stickerScale));
        el.style.setProperty("width", "auto", "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("font-size", nextFont + "px", "important");
        placeCornerAnchored(el, h, bx, by, sw, sh);
        return;
      } else if (kind === "img") {
        var s = 1 + d / 200;
        s = Math.max(0.15, Math.min(6, s));
        var nw = Math.max(24, Math.min(2000, sw * s));
        el.style.width = nw + "px";
        el.style.height = "auto";
        if (el.naturalWidth && el.naturalHeight) {
          var nh = (nw / el.naturalWidth) * el.naturalHeight;
          el.style.height = nh + "px";
        }
        placeCornerAnchored(el, h, bx, by, sw, sh);
      } else {
        var sc2 = 1 + d / 220;
        sc2 = Math.max(0.25, Math.min(4, sc2));
        el.style.width = Math.max(40, sw * sc2) + "px";
        el.style.height = Math.max(40, sh * sc2) + "px";
        el.style.boxSizing = "border-box";
        placeCornerAnchored(el, h, bx, by, sw, sh);
      }
      return;
    }

    if (h === "e" || h === "w") {
      /* Chỉ dùng delta so với lúc nhấn — tránh lệch tọa độ khi slide/iframe có transform scale */
      var nw2 = h === "e" ? Math.max(32, sw + dx) : Math.max(32, sw - dx);
      if (kind === "text") {
        el.style.boxSizing = "border-box";
        el.style.minWidth = "0";
      }
      if (h === "w") {
        var nlx = resizeState.startDataEditX + dx;
        el.setAttribute("data-edit-x", String(nlx));
        el.style.left = nlx + "px";
      }
      el.style.width = nw2 + "px";
      el.style.maxWidth = nw2 + "px";
      el.style.boxSizing = "border-box";
      if (kind === "text") {
        el.style.height = "auto";
        el.style.maxHeight = "none";
      }
      if (kind === "img") {
        el.style.height = "auto";
      }
      return;
    }

    if (h === "n" || h === "s") {
      if (kind === "text") return;
      var nh2 = h === "s" ? Math.max(24, sh + dy) : Math.max(24, sh - dy);
      if (h === "n") {
        var nty = resizeState.startDataEditY + dy;
        el.setAttribute("data-edit-y", String(nty));
        el.style.top = nty + "px";
      }
      el.style.height = nh2 + "px";
      el.style.boxSizing = "border-box";
      if (kind === "img") {
        el.style.width = "auto";
      }
    }
  }

  function scheduleSyncHandles() {
    if (handlesRaf) return;
    handlesRaf = requestAnimationFrame(function () {
      handlesRaf = 0;
      syncHandlePositions();
    });
  }

  function syncHandlePositions() {
    buildHandleLayer();
    if (!handleLayer || !enabled) return;
    if (!selected) {
      handleLayer.style.display = "none";
      handleLayer.classList.remove("is-visible");
      return;
    }
    void selected.offsetWidth;
    var rr = selected.getBoundingClientRect();
    /* getBoundingClientRect đã gồm transform (vd. shell-panel-fit scale); làm tròn giảm lệch subpixel tay cầm */
    var r = {
      left: Math.round(rr.left),
      top: Math.round(rr.top),
      right: Math.round(rr.right),
      bottom: Math.round(rr.bottom),
      width: rr.width,
      height: rr.height,
    };
    if (r.width < 2 || r.height < 2) {
      handleLayer.style.display = "none";
      return;
    }
    var kind = resizeElementKind(selected);
    handleLayer.style.display = "block";
    handleLayer.classList.add("is-visible");
    var o = handleLayer.querySelector(".ve-outline");
    o.style.left = r.left + "px";
    o.style.top = r.top + "px";
    o.style.width = r.width + "px";
    o.style.height = r.height + "px";

    function place(sel, x, y) {
      var n = handleLayer.querySelector(sel);
      if (n) {
        n.style.left = x + "px";
        n.style.top = y + "px";
      }
    }
    place(".ve-nw", r.left, r.top);
    place(".ve-ne", r.right, r.top);
    place(".ve-sw", r.left, r.bottom);
    place(".ve-se", r.right, r.bottom);
    var mx = (r.left + r.right) / 2;
    var my = (r.top + r.bottom) / 2;
    place(".ve-n", mx, r.top);
    place(".ve-s", mx, r.bottom);
    place(".ve-e", r.right, my);
    place(".ve-w", r.left, my);

    var hideNS = kind === "text";
    var nEl = handleLayer.querySelector(".ve-n");
    var sEl = handleLayer.querySelector(".ve-s");
    if (nEl) nEl.style.display = hideNS ? "none" : "";
    if (sEl) sEl.style.display = hideNS ? "none" : "";
  }

  function observeSelected() {
    if (ro && selected) {
      try {
        ro.disconnect();
      } catch (e) {}
    }
    if (!selected || typeof ResizeObserver === "undefined") return;
    ro = new ResizeObserver(function () {
      scheduleSyncHandles();
    });
    try {
      ro.observe(selected);
    } catch (e) {}
  }

  function select(el) {
    selected = el;
    clearSelectedAttr();
    if (selected) selected.setAttribute("data-edit-selected", "1");
    syncToolbarFromSelection();
    observeSelected();
    scheduleSyncHandles();
  }

  function hexFromRgb(rgb) {
    if (!rgb || rgb.indexOf("rgb") !== 0) return "#000000";
    var m = rgb.match(/\\d+/g);
    if (!m || m.length < 3) return "#000000";
    var r = (+m[0]).toString(16);
    var g = (+m[1]).toString(16);
    var b = (+m[2]).toString(16);
    return (
      "#" +
      (r.length === 1 ? "0" : "") +
      r +
      (g.length === 1 ? "0" : "") +
      g +
      (b.length === 1 ? "0" : "") +
      b
    );
  }

  function syncToolbarFromSelection() {
    if (!toolbar) return;
    var hint = toolbar.querySelector(".slide-visual-edit-hint");
    var row = toolbar.querySelector(".slide-visual-edit-tools");
    var imgBtn = toolbar.querySelector(".slide-visual-edit-img-btn");
    if (!selected) {
      if (hint) hint.style.display = "block";
      if (row) row.style.display = "none";
      if (imgBtn) imgBtn.style.display = "none";
      return;
    }
    if (hint) hint.style.display = "none";
    if (row) row.style.display = "flex";
    var fg = toolbar.querySelector('input[data-ve="fg"]');
    var bg = toolbar.querySelector('input[data-ve="bg"]');
    var font = toolbar.querySelector('select[data-ve="font"]');
    var cs = window.getComputedStyle(selected);
    if (fg) {
      fg.value = hexFromRgb(cs.color);
    }
    if (bg) {
      var b = cs.backgroundColor;
      bg.value = b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent" ? hexFromRgb(b) : "#ffffff";
    }
    if (font) {
      font.value = "";
      var ff = cs.fontFamily || "";
      if (font.options && font.options.length) {
        for (var i = 0; i < font.options.length; i++) {
          if (font.options[i].value && ff.indexOf(font.options[i].value.split(",")[0].replace(/['"]/g, "")) >= 0) {
            font.value = font.options[i].value;
            break;
          }
        }
      }
    }
    if (imgBtn) {
      imgBtn.style.display = selected.tagName === "IMG" ? "inline-block" : "none";
    }
  }

  function buildToolbar() {
    toolbar = document.createElement("div");
    toolbar.className = "slide-visual-edit-toolbar";
    toolbar.innerHTML =
      '<p class="slide-visual-edit-hint">Chọn phần tử — góc tròn xanh: kéo to/nhỏ; giữa trái/phải: kéo rộng/hẹp (hover xanh lá).</p>' +
      '<div class="slide-visual-edit-tools" style="display:none;flex-wrap:wrap;align-items:flex-end;gap:10px 14px;width:100%;">' +
      '<label>Màu chữ<input type="color" data-ve="fg" /></label>' +
      '<label>Màu nền<input type="color" data-ve="bg" /></label>' +
      '<label>Font<select data-ve="font">' +
      '<option value="">Mặc định</option>' +
      '<option value="system-ui,-apple-system,Segoe UI,Roboto,sans-serif">System UI</option>' +
      '<option value="Georgia,serif">Georgia</option>' +
      '<option value="Times New Roman,Times,serif">Times</option>' +
      '<option value="Comic Neue,Comic Sans MS,cursive">Comic</option>' +
      '<option value="Merriweather,Georgia,serif">Merriweather</option>' +
      '<option value="Inter,system-ui,sans-serif">Inter</option>' +
      '</select></label>' +
      '<button type="button" class="slide-visual-edit-img-btn" style="display:none;">Chọn ảnh từ máy</button>' +
      "</div>";
    document.body.appendChild(toolbar);

    var fg = toolbar.querySelector('input[data-ve="fg"]');
    var bg = toolbar.querySelector('input[data-ve="bg"]');
    var font = toolbar.querySelector('select[data-ve="font"]');
    var imgBtn = toolbar.querySelector(".slide-visual-edit-img-btn");

    function applyStyles() {
      if (!selected) return;
      if (fg && fg.value) selected.style.setProperty("color", fg.value, "important");
      if (bg && bg.value) selected.style.setProperty("background-color", bg.value, "important");
      if (font && font.value) selected.style.setProperty("font-family", font.value, "important");
      scheduleSyncHandles();
    }

    if (fg) fg.addEventListener("input", applyStyles);
    if (bg) bg.addEventListener("input", applyStyles);
    if (font) font.addEventListener("change", applyStyles);

    if (imgBtn) {
      imgBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!selected || selected.tagName !== "IMG") return;
        try {
          window.parent.postMessage({ type: "a20-slide-edit", action: "open-image-picker" }, "*");
        } catch (err) {}
      });
    }

    toolbar.addEventListener("mousedown", function (e) {
      e.stopPropagation();
    });
    toolbar.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
    });
  }

  function onPointerDown(e) {
    if (!enabled) return;
    if (toolbar && toolbar.contains(e.target)) return;
    if (handleLayer && handleLayer.contains(e.target) && e.target.getAttribute("data-ve-handle")) {
      return;
    }
    var slide = activeSlide();
    if (!slide || !slide.contains(e.target)) return;
    var hit = resolveHit(slide, e.target);
    if (!hit) {
      select(null);
      return;
    }
    e.preventDefault();
    select(hit);
    drag = {
      el: hit,
      startX: e.clientX,
      startY: e.clientY,
      baseX: parseFloat(hit.getAttribute("data-edit-x")) || 0,
      baseY: parseFloat(hit.getAttribute("data-edit-y")) || 0,
      prepared: false,
      moved: false,
    };
  }

  function onPointerMove(e) {
    if (!enabled) return;
    if (resizeState) {
      applyResize(e);
      scheduleSyncHandles();
      return;
    }
    if (!drag) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;
    if (!drag.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
      drag.moved = true;
    }
    if (!drag.moved) return;
    if (!drag.prepared) {
      ensureEditable(drag.el);
      drag.baseX = parseFloat(drag.el.getAttribute("data-edit-x")) || 0;
      drag.baseY = parseFloat(drag.el.getAttribute("data-edit-y")) || 0;
      drag.prepared = true;
    }
    e.preventDefault();
    var nx = drag.baseX + dx;
    var ny = drag.baseY + dy;
    drag.el.setAttribute("data-edit-x", String(nx));
    drag.el.setAttribute("data-edit-y", String(ny));
    drag.el.style.left = nx + "px";
    drag.el.style.top = ny + "px";
    scheduleSyncHandles();
  }

  function onPointerUp(e) {
    try {
      var cap = resizeState && resizeState.captureEl;
      if (cap && e.pointerId != null && cap.releasePointerCapture) {
        cap.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    resizeState = null;
    drag = null;
    scheduleSyncHandles();
  }

  function onMessage(ev) {
    var d = ev.data;
    if (!d || d.type !== "a20-slide-edit" || d.action !== "set-image-url" || !d.url) return;
    if (selected && selected.tagName === "IMG") {
      selected.setAttribute("src", d.url);
      scheduleSyncHandles();
    }
  }

  function bindGlobalHandlers() {
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("message", onMessage);
    window.addEventListener("scroll", scheduleSyncHandles, true);
    window.addEventListener("resize", scheduleSyncHandles);
  }

  bindGlobalHandlers();

  window.__setSlideVisualEditEnabled = function (v) {
    enabled = !!v;
    /* Pause panel-fit (ResizeObserver) trước khi bật class — tránh scale chung cả khối khi chỉnh chữ */
    if (enabled) {
      try {
        if (typeof window.__slideShellPanelFitSetEditMode === "function") {
          window.__slideShellPanelFitSetEditMode(true);
        }
      } catch (err) {}
    }
    document.body.classList.toggle("slide-visual-edit-on", enabled);
    /* Tắt Sửa: gỡ class trước rồi mới chạy lại fit (setEditMode(false) gọi run()) */
    if (!enabled) {
      try {
        if (typeof window.__slideShellPanelFitSetEditMode === "function") {
          window.__slideShellPanelFitSetEditMode(false);
        }
      } catch (err) {}
    }
    if (!toolbar) buildToolbar();
    buildHandleLayer();
    if (toolbar) {
      toolbar.classList.toggle("is-visible", enabled);
      if (!enabled) {
        select(null);
        if (handleLayer) {
          handleLayer.style.display = "none";
          handleLayer.classList.remove("is-visible");
        }
      } else {
        syncToolbarFromSelection();
        scheduleSyncHandles();
      }
    }
  };

  window.__slideVisualEditorRefresh = function () {
    select(null);
  };
})();`;

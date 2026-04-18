import { getApiOrigin } from "../config.js";

function getBuiltinShellHtml() {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Slide Shell</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: #0f172a; font-family: Inter, Arial, sans-serif; }
    #slides-master-container { display: grid; gap: 24px; }
    .slide-container {
      width: min(1280px, 100%);
      min-height: 720px;
      margin: 0 auto;
      border-radius: 14px;
      padding: 52px 60px;
      background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      color: #0f172a;
    }
    .slide-title {
      margin: 0 0 26px;
      font-size: clamp(34px, 4vw, 56px);
      line-height: 1.15;
      font-weight: 800;
      color: #1d4ed8;
    }
    ul[data-shell="bullets"] {
      margin: 0;
      padding-left: 30px;
      font-size: clamp(22px, 2.1vw, 34px);
      line-height: 1.55;
    }
    ul[data-shell="bullets"] li { margin-bottom: 12px; }
  </style>
</head>
<body>
  <template id="layout-content">
    <div class="slide-container">
      <h2 class="slide-title" data-shell="title"></h2>
      <ul data-shell="bullets"></ul>
    </div>
  </template>
  <div id="slides-master-container" data-nav-mode="scroll"></div>
</body>
</html>`;
}

/**
 * @param {string} filename e.g. "8.comic.html"
 * @param {Document} [doc]
 * @returns {Promise<string>}
 */
export async function fetchSlideShellHtml(filename, doc = document) {
  const base = getApiOrigin(doc).replace(/\/$/, "");
  const f = encodeURIComponent(filename);
  const candidates = [
    `${base}/slide_html_template/${f}`,
    new URL(`slide_html_template/${f}`, window.location.href).toString(),
    new URL(`../slide_html_template/${f}`, window.location.href).toString(),
  ];
  let lastStatus = "no_response";
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
      lastStatus = String(res.status);
    } catch {
      lastStatus = "network_error";
    }
  }
  console.warn(`[slide-shell] cannot fetch ${filename}, use builtin shell (${lastStatus})`);
  return getBuiltinShellHtml();
}

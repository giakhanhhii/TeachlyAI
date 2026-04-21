/**
 * @param {Document} doc
 */
export function getApiOrigin(doc = document) {
  const raw = doc.querySelector('meta[name="teachly-api-base"]')?.getAttribute("content")?.trim();
  const fallback = window.location.origin;
  if (!raw) return fallback.replace(/\/$/, "");
  try {
    const url = new URL(raw, fallback);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      console.warn("[config] Invalid teachly-api-base meta content, falling back to current origin.");
      return fallback.replace(/\/$/, "");
    }
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.origin}${path}`.replace(/\/$/, "");
  } catch {
    console.warn("[config] Invalid teachly-api-base meta content, falling back to current origin.");
    return fallback.replace(/\/$/, "");
  }
}

/**
 * @param {Document} doc
 */
export function getChatApiUrl(doc = document) {
  return `${getApiOrigin(doc)}/api/chat`;
}

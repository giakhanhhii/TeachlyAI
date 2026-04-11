/**
 * @param {Document} doc
 */
export function getChatApiUrl(doc = document) {
  const raw = doc.querySelector('meta[name="teachly-api-base"]')?.getAttribute("content")?.trim();
  const base = raw || window.location.origin;
  return `${base.replace(/\/$/, "")}/api/chat`;
}

import { getApiOrigin } from "../config.js";

/**
 * @param {{ title: string, srcdoc: string }} payload
 * @returns {Promise<{ blob: Blob, fileName: string }>}
 */
export async function exportSlideDeckToPdf(payload) {
  const url = `${getApiOrigin()}/api/slides/export-pdf`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: String(payload.title || "").trim(),
      srcdoc: String(payload.srcdoc || ""),
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = typeof data?.detail === "string" ? data.detail : "";
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("Content-Disposition") || "";
  const fileNameMatch = /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(contentDisposition);
  const rawFileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || "teachly-slides.pdf");
  return { blob, fileName: rawFileName };
}

/**
 * @param {Blob} blob
 * @param {string} fileName
 */
export function triggerPdfDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "teachly-slides.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

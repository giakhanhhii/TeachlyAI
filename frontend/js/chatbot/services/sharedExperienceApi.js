import { getApiOrigin } from "../config.js";

function buildShareUrl(shareId) {
  const url = new URL("chatbot_ui.html", window.location.href);
  url.searchParams.set("share", String(shareId || "").trim());
  return url.toString();
}

export async function createSharedExperienceLink(payload) {
  const res = await fetch(`${getApiOrigin()}/api/shared-experiences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: String(payload?.title || "").trim(),
      experienceState: payload?.experienceState || {},
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
    throw new Error(detail || `Share create failed (${res.status})`);
  }
  const data = await res.json();
  const shareId = String(data?.share_id || "").trim();
  if (!shareId) throw new Error("Không tạo được mã chia sẻ.");
  return {
    shareId,
    url: buildShareUrl(shareId),
  };
}

export async function fetchSharedExperience(shareId) {
  const safeId = String(shareId || "").trim();
  const res = await fetch(`${getApiOrigin()}/api/shared-experiences/${encodeURIComponent(safeId)}`);
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = typeof data?.detail === "string" ? data.detail : "";
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `Share load failed (${res.status})`);
  }
  return res.json();
}

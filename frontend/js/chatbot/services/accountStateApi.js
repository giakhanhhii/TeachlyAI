import { getApiOrigin } from "../config.js";
import { getAuthHeaders, handleUnauthorizedResponse } from "./authStore.js";

async function parseJson(res) {
  return res.json().catch(() => ({}));
}

export async function loadAccountState() {
  const res = await fetch(`${getApiOrigin()}/api/auth/state`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJson(res);
  if (res.status === 401) handleUnauthorizedResponse();
  if (!res.ok) throw new Error(data.detail || "Không thể tải lịch sử tài khoản.");
  return data;
}

export async function saveAccountState(snapshot) {
  const res = await fetch(`${getApiOrigin()}/api/auth/state`, {
    method: "PUT",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      sessions: Array.isArray(snapshot?.sessions) ? snapshot.sessions : [],
      activeSessionIndex: Number.isFinite(Number(snapshot?.activeSession))
        ? Math.max(0, Math.floor(Number(snapshot.activeSession)))
        : 0,
    }),
  });
  const data = await parseJson(res);
  if (res.status === 401) handleUnauthorizedResponse();
  if (!res.ok) throw new Error(data.detail || "Không thể lưu lịch sử tài khoản.");
  return data;
}

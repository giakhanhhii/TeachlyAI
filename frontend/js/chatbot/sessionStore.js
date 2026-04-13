import { LS_ACTIVE_SESSION, LS_SESSIONS } from "./constants.js";

function safeReadSessions() {
  try {
    const raw = localStorage.getItem(LS_SESSIONS);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let sessions = safeReadSessions();
let activeSession = Number(localStorage.getItem(LS_ACTIVE_SESSION) || "0");

export function ensureSessions() {
  if (!sessions.length) {
    sessions = [
      { title: "Đoạn chat 1", thread_id: "", messages: [] },
      { title: "Đoạn chat 2", thread_id: "", messages: [] },
      { title: "Đoạn chat 3", thread_id: "", messages: [] },
    ];
  }
  if (!Number.isFinite(activeSession) || activeSession < 0 || activeSession >= sessions.length) {
    activeSession = 0;
  }
}

export function saveSessions() {
  localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
  localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
}

export function getCurrentSession() {
  return sessions[activeSession] || sessions[0];
}

export function getActiveSessionIndex() {
  return activeSession;
}

export function setActiveSessionIndex(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) {
    activeSession = 0;
    return;
  }
  activeSession = n;
}

export function getSessionsSnapshot() {
  return sessions;
}

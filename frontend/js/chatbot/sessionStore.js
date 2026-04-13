import { LS_ACTIVE_SESSION, LS_SESSIONS } from "./constants.js";

function safeReadSessions() {
  try {
    const raw = localStorage.getItem(LS_SESSIONS);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeSession).filter(Boolean) : [];
  } catch {
    return [];
  }
}

let sessions = safeReadSessions();
let activeSession = Number(localStorage.getItem(LS_ACTIVE_SESSION) || "0");

function makeDefaultSession(index) {
  return { title: `Đoạn chat ${index + 1}`, thread_id: "", messages: [], pinned: false };
}

function normalizeSession(session, index = 0) {
  if (!session || typeof session !== "object") return null;
  const safeTitle = typeof session.title === "string" && session.title.trim()
    ? session.title.trim()
    : `Đoạn chat ${index + 1}`;
  const safeThread = typeof session.thread_id === "string" ? session.thread_id : "";
  const safeMessages = Array.isArray(session.messages) ? session.messages : [];
  return {
    title: safeTitle,
    thread_id: safeThread,
    messages: safeMessages,
    pinned: Boolean(session.pinned),
  };
}

export function ensureSessions() {
  if (!sessions.length) {
    sessions = [makeDefaultSession(0)];
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

export function createSession() {
  const nextIndex = sessions.length;
  const next = makeDefaultSession(nextIndex);
  sessions.push(next);
  activeSession = nextIndex;
  return nextIndex;
}

export function renameSession(idx, nextTitle) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  if (typeof nextTitle !== "string" || !nextTitle.trim()) return false;
  sessions[n].title = nextTitle.trim();
  return true;
}

export function togglePinSession(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  sessions[n].pinned = !sessions[n].pinned;
  return true;
}

export function deleteSession(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return false;
  sessions.splice(n, 1);
  if (!sessions.length) {
    sessions = [makeDefaultSession(0)];
    activeSession = 0;
    return true;
  }
  if (activeSession === n) activeSession = Math.min(n, sessions.length - 1);
  else if (activeSession > n) activeSession -= 1;
  return true;
}

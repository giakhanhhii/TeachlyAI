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
  return {
    title: `Đoạn chat ${index + 1}`,
    thread_id: "",
    messages: [],
    pinned: false,
    experienceState: null,
  };
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
    experienceState:
      session.experienceState && typeof session.experienceState === "object"
        ? session.experienceState
        : null,
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

/**
 * @param {{ title?: string, experienceState?: any }} [opts]
 */
export function createSession(opts = {}) {
  const nextIndex = sessions.length;
  const next = makeDefaultSession(nextIndex);
  if (typeof opts.title === "string" && opts.title.trim()) {
    next.title = opts.title.trim();
  }
  if (opts.experienceState && typeof opts.experienceState === "object") {
    next.experienceState = opts.experienceState;
  }
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

export function getCurrentExperienceState() {
  const s = getCurrentSession();
  if (!s || typeof s !== "object") return null;
  return s.experienceState && typeof s.experienceState === "object" ? s.experienceState : null;
}

/**
 * @param {any} next
 */
export function setCurrentExperienceState(next) {
  const s = getCurrentSession();
  if (!s || typeof s !== "object") return;
  if (!next || typeof next !== "object") {
    s.experienceState = null;
    return;
  }
  s.experienceState = next;
}

/**
 * @param {number} idx
 */
export function getSessionByIndex(idx) {
  const n = Number(idx);
  if (!Number.isFinite(n) || n < 0 || n >= sessions.length) return null;
  return sessions[n];
}

/**
 * @param {string} kind
 * @param {{ excludeIndex?: number }} [opts]
 */
export function findSessionIndexByExperienceKind(kind, opts = {}) {
  const target = String(kind || "").trim().toLowerCase();
  if (!target) return -1;
  const excludeIndex = Number.isFinite(Number(opts.excludeIndex)) ? Math.floor(Number(opts.excludeIndex)) : -1;
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    if (i === excludeIndex) continue;
    const st = sessions[i]?.experienceState;
    const stKind = String(st?.kind || "").trim().toLowerCase();
    const completed = Boolean(st?.completed);
    if (stKind === target && !completed) return i;
  }
  return -1;
}

import { LS_ACTIVE_SESSION, LS_SESSIONS } from "./constants.js";

let sessions = JSON.parse(localStorage.getItem(LS_SESSIONS) || "[]");
let activeSession = Number(localStorage.getItem(LS_ACTIVE_SESSION) || "0");

export function ensureSessions() {
  if (!sessions.length) {
    sessions = [
      { title: "Đoạn chat 1", thread_id: "", messages: [] },
      { title: "Đoạn chat 2", thread_id: "", messages: [] },
      { title: "Đoạn chat 3", thread_id: "", messages: [] },
    ];
  }
  if (activeSession > 2) activeSession = 0;
}

export function saveSessions() {
  localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
  localStorage.setItem(LS_ACTIVE_SESSION, String(activeSession));
}

export function getCurrentSession() {
  return sessions[activeSession];
}

export function getActiveSessionIndex() {
  return activeSession;
}

export function setActiveSessionIndex(idx) {
  activeSession = idx;
}

export function getSessionsSnapshot() {
  return sessions;
}

const BASE_KEY = "teachly_dwell";
const MAX_LOG = 20;
const RECOMMEND_EVERY = 5;

let _sessionId = null;
let _activeStart = null;
let _activeTopic = null;
let _activeKind = null;

function storageKey() {
  return _sessionId ? `${BASE_KEY}_${_sessionId}` : `${BASE_KEY}_default`;
}

/** Call whenever the active session changes so dwell records are scoped per-session. */
export function setSessionId(id) {
  _sessionId = id ? String(id) : null;
}

/** Call when a new experience loads (not a restore). */
export function beginDwell(topic, kind) {
  endDwell();
  _activeStart = Date.now();
  _activeTopic = String(topic || "").trim() || null;
  _activeKind = kind || null;
}

/** Call on session switch, new experience start, or page unload. Returns new log length. */
export function endDwell() {
  if (!_activeStart || !_activeTopic) { _activeStart = null; return 0; }
  const dwellSeconds = Math.round((Date.now() - _activeStart) / 1000);
  _activeStart = null;
  if (dwellSeconds < 3) { _activeTopic = null; _activeKind = null; return 0; }
  const log = getLog();
  log.push({ topic: _activeTopic, kind: _activeKind, dwellSeconds, ts: new Date().toISOString() });
  if (log.length > MAX_LOG) log.splice(0, log.length - MAX_LOG);
  localStorage.setItem(storageKey(), JSON.stringify(log));
  _activeTopic = null; _activeKind = null;
  return log.length;
}

export function getLog() {
  try { return JSON.parse(localStorage.getItem(storageKey()) || "[]"); } catch { return []; }
}

/** True when log length just reached a multiple of RECOMMEND_EVERY. */
export function shouldRecommend() {
  const n = getLog().length;
  return n > 0 && n % RECOMMEND_EVERY === 0;
}

export function getLastN(n = 5) {
  return getLog().slice(-n);
}

export function clearLog() {
  localStorage.removeItem(storageKey());
}

/** Returns the active experience's elapsed seconds (from 1), or null if none. */
export function getActiveDwell() {
  if (!_activeStart || !_activeTopic) return null;
  return {
    topic: _activeTopic,
    kind: _activeKind,
    seconds: Math.max(1, Math.round((Date.now() - _activeStart) / 1000)),
  };
}

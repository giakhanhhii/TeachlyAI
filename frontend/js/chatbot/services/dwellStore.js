const BASE_KEY = "teachly_dwell";
const MAX_LOG = 20;
const RECOMMEND_EVERY = 5;

let _activeStart = null;
let _activeTopic = null;
let _activeKind = null;
let _currentSessionId = null;

export function setSession(id) {
  _currentSessionId = String(id || "").trim() || null;
}

function storageKey() {
  return `${BASE_KEY}_${_currentSessionId || "default"}`;
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
  const kind = _activeKind;
  _activeStart = null;
  if (dwellSeconds < 1) { _activeTopic = null; _activeKind = null; return 0; }
  const all = getLog();
  all.push({ topic: _activeTopic, kind, dwellSeconds, ts: new Date().toISOString() });
  if (all.length > MAX_LOG) all.splice(0, all.length - MAX_LOG);
  localStorage.setItem(storageKey(), JSON.stringify(all));
  _activeTopic = null; _activeKind = null;
  return all.filter(e => e.kind === kind).length;
}

/** Returns the kind of the currently active experience (or null). */
export function getActiveKind() { return _activeKind; }

/** @param {string} [kind] — if provided, filters entries to that kind */
export function getLog(kind) {
  try {
    const all = JSON.parse(localStorage.getItem(storageKey()) || "[]");
    return kind ? all.filter(e => e.kind === kind) : all;
  } catch { return []; }
}

/** True when the kind's log length just reached a multiple of RECOMMEND_EVERY. */
export function shouldRecommend(kind) {
  const n = getLog(kind).length;
  return n > 0 && n % RECOMMEND_EVERY === 0;
}

/** @param {number} n @param {string} [kind] */
export function getLastN(n = 5, kind) {
  return getLog(kind).slice(-n);
}

/** @param {string} [kind] — omit to clear entire session log, or provide kind to remove only that kind's entries */
export function clearLog(kind) {
  if (!kind) { localStorage.removeItem(storageKey()); return; }
  const remaining = getLog().filter(e => e.kind !== kind);
  if (remaining.length) localStorage.setItem(storageKey(), JSON.stringify(remaining));
  else localStorage.removeItem(storageKey());
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

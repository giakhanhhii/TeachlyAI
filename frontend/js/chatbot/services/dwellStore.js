const STORAGE_KEY = "teachly_dwell_log";
const MAX_LOG = 20;
const RECOMMEND_EVERY = 5;

let _activeStart = null;
let _activeTopic = null;
let _activeKind = null;

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  _activeTopic = null; _activeKind = null;
  return log.length;
}

export function getLog() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
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
  localStorage.removeItem(STORAGE_KEY);
}

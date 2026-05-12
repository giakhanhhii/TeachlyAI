import * as backgroundFetchStore from "./backgroundFetchStore.js";
import * as autoModeStore from "./autoModeStore.js";
import { fetchAiContent, fetchAiFullsetContent } from "./aiContentApi.js";

const MOCK_WARMUP = 7;
const PREFETCH_AT = 5;
// Pattern after warmup: rank1 related, 2 unrelated, rank2 related, rank1, 2 unrelated, repeat
const PATTERN = ["rank1", "unrelated", "unrelated", "rank2", "rank1", "unrelated", "unrelated"];
export const PREFETCH_KEY = "rec_queue_prefetch_rank1";

let _autoExpCount = 0;  // completed auto-mode experiences this page session
let _phase = "warmup";  // "warmup" | "queued"
let _recs = [];         // [{kind, topic, reason}] from /api/recommend-topics
let _patternPos = 0;    // index into PATTERN for post-warmup slots

export function reset() {
  _autoExpCount = 0;
  _phase = "warmup";
  _recs = [];
  _patternPos = 0;
}

/** Called each time an auto-mode experience finishes. Returns new count. */
export function onExpCompleted() { return ++_autoExpCount; }

export function getAutoExpCount() { return _autoExpCount; }

/** Store recommendation results from /api/recommend-topics. */
export function setRecommendations(recs) { _recs = Array.isArray(recs) ? recs : []; }

/** Start background AI content generation for the first rank-1 recommendation. */
export function startPrefetch(expKind, counts) {
  if (!_recs.length) return;
  const rec = _recs[0];
  const kind = rec.kind || expKind;
  const topic = rec.topic;
  const promise = kind === "fullset"
    ? fetchAiFullsetContent(topic)
    : fetchAiContent(kind === "flash" ? "flashcard" : kind, topic);
  backgroundFetchStore.startFetch(PREFETCH_KEY, promise);
}

export function isPrefetchReady() {
  return backgroundFetchStore.getFetch(PREFETCH_KEY)?.status === "done";
}

/** True once MOCK_WARMUP (7) auto experiences have completed — triggers auto-advance. */
export function shouldAutoAdvance() { return _autoExpCount >= MOCK_WARMUP; }

/**
 * Returns the next content spec for launchAutoMode.
 * Warmup: random topic (mock happens naturally since each topic is new).
 * Post-warmup: follows PATTERN using stored recommendations.
 * @returns {{ topic: string, kind: string, prefetchKey: string|null, isAi: boolean }}
 */
export function getNextSpec(expKind, counts) {
  if (_autoExpCount < MOCK_WARMUP) {
    return { topic: autoModeStore.pickNextTopic(), kind: expKind, prefetchKey: null, isAi: false };
  }

  if (_phase === "warmup") _phase = "queued";

  const slot = PATTERN[_patternPos % PATTERN.length];
  const isFirstPostWarmup = _patternPos === 0;
  _patternPos++;

  if (slot === "rank1") {
    const rec = _recs[0] || null;
    return {
      topic: rec?.topic || autoModeStore.pickNextTopic(),
      kind: rec?.kind || expKind,
      prefetchKey: isFirstPostWarmup ? PREFETCH_KEY : null,
      isAi: true,
    };
  }
  if (slot === "rank2") {
    const rec = _recs[1] || _recs[0] || null;
    return {
      topic: rec?.topic || autoModeStore.pickNextTopic(),
      kind: rec?.kind || expKind,
      prefetchKey: null,
      isAi: true,
    };
  }
  // "unrelated" — random topic; mock threshold naturally serves mock for new topics
  return { topic: autoModeStore.pickNextTopic(), kind: expKind, prefetchKey: null, isAi: false };
}

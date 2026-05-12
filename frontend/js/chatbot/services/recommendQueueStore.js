import * as backgroundFetchStore from "./backgroundFetchStore.js";
import * as autoModeStore from "./autoModeStore.js";
import { fetchAiContent, fetchAiFullsetContent } from "./aiContentApi.js";

const MOCK_WARMUP = 7;
const PREFETCH_AT = 5;
// Pattern after warmup: rank1 related, 2 unrelated, rank2 related, rank1, 2 unrelated, repeat
const PATTERN = ["rank1", "unrelated", "unrelated", "rank2", "rank1", "unrelated", "unrelated"];
export const PREFETCH_KEY = "rec_queue_prefetch_rank1";

// Per-kind state — each content type has its own counters, recs, and pattern position.
const _kindState = {};

function _s(kind) {
  const k = kind || "default";
  if (!_kindState[k]) _kindState[k] = { autoExpCount: 0, phase: "warmup", recs: [], patternPos: 0 };
  return _kindState[k];
}

export function reset(kind) {
  if (kind) { delete _kindState[kind || "default"]; }
  else { Object.keys(_kindState).forEach(k => delete _kindState[k]); }
}

/** Called each time an auto-mode experience of the given kind finishes. Returns new count. */
export function onExpCompleted(kind) { return ++_s(kind).autoExpCount; }

export function getAutoExpCount(kind) { return _s(kind).autoExpCount; }

/** Store recommendation results from /api/recommend-topics for a specific kind. */
export function setRecommendations(recs, kind) { _s(kind).recs = Array.isArray(recs) ? recs : []; }

/** Start background AI content generation for the first rank-1 recommendation of this kind. */
export function startPrefetch(expKind, counts) {
  const recs = _s(expKind).recs;
  if (!recs.length) return;
  const rec = recs[0];
  const topic = rec.topic;
  const promise = expKind === "fullset"
    ? fetchAiFullsetContent(topic)
    : fetchAiContent(expKind === "flash" ? "flashcard" : expKind, topic);
  backgroundFetchStore.startFetch(PREFETCH_KEY, promise);
}

export function isPrefetchReady() {
  return backgroundFetchStore.getFetch(PREFETCH_KEY)?.status === "done";
}

/** True once this kind has accumulated MOCK_WARMUP (7) completions — triggers auto-advance. */
export function shouldAutoAdvance(kind) { return _s(kind).autoExpCount >= MOCK_WARMUP; }

/**
 * Returns the next content spec for launchAutoMode.
 * Always returns the same kind as expKind — never cross-pollinates kinds.
 * @returns {{ topic: string, kind: string, prefetchKey: string|null, isAi: boolean, slot: string }}
 */
export function getNextSpec(expKind, counts) {
  const state = _s(expKind);

  if (state.autoExpCount < MOCK_WARMUP) {
    const n = state.autoExpCount + 1;
    return { topic: autoModeStore.pickNextTopic(), kind: expKind, prefetchKey: null, isAi: false, slot: `warmup #${n}` };
  }

  if (state.phase === "warmup") state.phase = "queued";

  const slot = PATTERN[state.patternPos % PATTERN.length];
  const isFirstPostWarmup = state.patternPos === 0;
  state.patternPos++;

  if (slot === "rank1") {
    const rec = state.recs[0] || null;
    return {
      topic: rec?.topic || autoModeStore.pickNextTopic(),
      kind: expKind,
      prefetchKey: isFirstPostWarmup ? PREFETCH_KEY : null,
      isAi: true,
      slot: "rank1",
    };
  }
  if (slot === "rank2") {
    const rec = state.recs[1] || state.recs[0] || null;
    return {
      topic: rec?.topic || autoModeStore.pickNextTopic(),
      kind: expKind,
      prefetchKey: null,
      isAi: true,
      slot: "rank2",
    };
  }
  // "unrelated" — random topic, same kind
  return { topic: autoModeStore.pickNextTopic(), kind: expKind, prefetchKey: null, isAi: false, slot: "unrelated" };
}

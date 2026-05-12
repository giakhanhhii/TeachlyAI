/**
 * Stores in-flight and completed AI content fetch Promises keyed by experienceId.
 * Allows background generation to continue while the user navigates between sessions.
 * The Map lives for the page lifetime — no serialization, survives session switches but not page refresh.
 *
 * @typedef {{ status: "pending"|"done"|"error", raw: any, error: any, promise: Promise<any> }} FetchEntry
 */

/** @type {Map<string, FetchEntry>} */
const store = new Map();

/**
 * Register a fetch Promise under a given experienceId.
 * @param {string} id
 * @param {Promise<any>} promise
 * @returns {FetchEntry}
 */
export function startFetch(id, promise) {
  /** @type {FetchEntry} */
  const entry = { status: "pending", raw: null, error: null, promise: /** @type {any} */ (null) };
  entry.promise = promise.then((raw) => {
    entry.status = "done";
    entry.raw = raw;
    return raw;
  }).catch((err) => {
    entry.status = "error";
    entry.error = err;
    throw err;
  });
  store.set(id, entry);
  return entry;
}

/**
 * Look up a registered fetch entry without consuming it.
 * @param {string} id
 * @returns {FetchEntry | null}
 */
export function getFetch(id) {
  return store.get(id) ?? null;
}

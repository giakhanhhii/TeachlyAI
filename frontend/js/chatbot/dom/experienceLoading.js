/**
 * Appends an animated countdown to a loading overlay element and starts ticking.
 * Uses wall-clock time when `startedAt` is set (e.g. from `backgroundFetchStore`) so the
 * label stays correct if the overlay is torn down and remounted while the same fetch runs.
 * Returns a stop function — call it when the loading is done (success or error).
 *
 * @param {HTMLElement} overlayEl
 * @param {number} estimatedSeconds
 * @param {{ startedAt?: number }} [opts]
 * @returns {() => void}
 */
export function startAiCountdown(overlayEl, estimatedSeconds, opts = {}) {
  const countEl = document.createElement("span");
  countEl.className = "ai-loading-countdown";
  overlayEl.appendChild(countEl);

  const total = Math.max(1, Math.round(estimatedSeconds));
  const anchor =
    typeof opts.startedAt === "number" && Number.isFinite(opts.startedAt) ? opts.startedAt : Date.now();

  function update() {
    const elapsed = Math.floor((Date.now() - anchor) / 1000);
    const remaining = total - elapsed;
    if (remaining > 0) {
      countEl.textContent = `Ước tính còn ~${remaining}s`;
    } else {
      countEl.textContent = "Sắp xong…";
    }
  }

  update();
  const timer = setInterval(update, 1000);

  return () => clearInterval(timer);
}

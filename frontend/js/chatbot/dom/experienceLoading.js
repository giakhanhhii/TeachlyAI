/**
 * Appends an animated countdown to a loading overlay element and starts ticking.
 * Returns a stop function — call it when the loading is done (success or error).
 *
 * @param {HTMLElement} overlayEl
 * @param {number} estimatedSeconds
 * @returns {() => void}
 */
export function startAiCountdown(overlayEl, estimatedSeconds) {
  const countEl = document.createElement("span");
  countEl.className = "ai-loading-countdown";
  overlayEl.appendChild(countEl);

  let remaining = Math.max(1, Math.round(estimatedSeconds));

  function update() {
    if (remaining > 0) {
      countEl.textContent = `Ước tính còn ~${remaining}s`;
    } else {
      countEl.textContent = "Sắp xong…";
    }
  }

  update();
  const timer = setInterval(() => {
    remaining -= 1;
    update();
  }, 1000);

  return () => clearInterval(timer);
}

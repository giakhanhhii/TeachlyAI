/**
 * @param {unknown} err
 * @param {string} fallbackMessage
 * @returns {string}
 */
export function resolveExperienceAiErrorMessage(err, fallbackMessage) {
  const message = String(err && typeof err === "object" ? err.message || "" : "").trim();
  return message || fallbackMessage;
}

/**
 * @param {HTMLElement} host
 * @param {unknown} err
 * @param {string} fallbackMessage
 */
export function renderExperienceAiError(host, err, fallbackMessage) {
  host.innerHTML = "";
  const box = document.createElement("div");
  box.className = "exp-upload-error";
  const msg = document.createElement("p");
  msg.className = "exp-upload-error-msg";
  msg.textContent = resolveExperienceAiErrorMessage(err, fallbackMessage);
  box.appendChild(msg);
  host.appendChild(box);
}

/**
 * @param {unknown} err
 * @param {string} fallbackMessage
 * @returns {string}
 */
export function resolveExperienceAiErrorMessage(err, fallbackMessage) {
  const message = String(err && typeof err === "object" ? err.message || "" : "").trim();
  return message || fallbackMessage;
}

function normalizeErrorText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isUploadLimitError(err) {
  const normalized = normalizeErrorText(resolveExperienceAiErrorMessage(err, ""));
  if (!normalized) return false;
  return (
    normalized.includes("tai lieu qua dai") ||
    normalized.includes("vuot qua gioi han 20 trang") ||
    normalized.includes("gioi han 40000 ky tu") ||
    normalized.includes("anh qua lon")
  );
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

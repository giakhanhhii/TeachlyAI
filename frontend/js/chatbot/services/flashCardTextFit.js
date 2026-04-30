function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const MAX_FIT_ITERATIONS = 8;

function getBoundsSize(boundsElement) {
  if (!boundsElement) return null;
  const width = boundsElement.clientWidth;
  const height = boundsElement.clientHeight;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function hasVisibleOverflow(element, boundsSize) {
  if (!element || !boundsSize) return false;
  return element.scrollWidth > boundsSize.width + 1 || element.scrollHeight > boundsSize.height + 1;
}

function estimateFontSizeToFit(textEl, boundsSize, baseSize, minSize) {
  if (!textEl || !boundsSize) return minSize;
  const widthRatio = boundsSize.width / Math.max(textEl.scrollWidth, 1);
  const heightRatio = boundsSize.height / Math.max(textEl.scrollHeight, 1);
  const estimatedRatio = Math.min(widthRatio, heightRatio);
  if (!Number.isFinite(estimatedRatio) || estimatedRatio <= 0) return minSize;
  return clamp(baseSize * estimatedRatio, minSize, baseSize);
}

function fitTextToBounds(textEl, boundsEl, opts = {}) {
  if (!textEl || !boundsEl) return;
  const text = String(textEl.textContent || "").trim();
  const baseSize =
    Number.parseFloat(textEl.dataset.baseFontSize || "") || Number.parseFloat(window.getComputedStyle(textEl).fontSize) || 16;
  const minSize = clamp(opts.minFontSize || Math.round(baseSize * 0.58), 12, baseSize);
  const isSingleToken = text.length > 0 && !/\s/.test(text);
  const boundsSize = getBoundsSize(boundsEl);

  if (!boundsSize) return;

  textEl.dataset.baseFontSize = String(baseSize);
  textEl.classList.toggle("flash-fit-wrap", !isSingleToken);
  textEl.classList.toggle("flash-fit-nowrap", isSingleToken);
  textEl.style.fontSize = `${baseSize}px`;

  if (!hasVisibleOverflow(textEl, boundsSize)) return;

  let low = minSize;
  let high = baseSize;
  let best = estimateFontSizeToFit(textEl, boundsSize, baseSize, minSize);

  textEl.style.fontSize = `${best}px`;
  if (hasVisibleOverflow(textEl, boundsSize)) {
    high = best;
  } else {
    low = best;
  }

  for (let i = 0; i < MAX_FIT_ITERATIONS; i += 1) {
    const mid = (low + high) / 2;
    textEl.style.fontSize = `${mid}px`;
    if (hasVisibleOverflow(textEl, boundsSize)) {
      high = mid;
    } else {
      best = mid;
      low = mid;
    }
  }

  textEl.style.fontSize = `${Math.max(minSize, best)}px`;
}

/**
 * Giữ size mặc định nếu chữ không tràn; ưu tiên wrap theo từ/cụm từ.
 * Chỉ co chữ khi sau khi wrap vẫn còn tràn hoặc là một token quá dài.
 * @param {HTMLElement | null} cardRoot
 */
export function fitFlashCardText(cardRoot) {
  if (!cardRoot) return;
  const frontFace = cardRoot.querySelector(".flash-front");
  const frontStack = cardRoot.querySelector(".flash-front-stack");
  const frontTerm = cardRoot.querySelector(".flash-front-term");
  const backFace = cardRoot.querySelector(".flash-back");
  const backText = cardRoot.querySelector(".flash-back-text");

  if (frontFace && frontStack && frontTerm) {
    fitTextToBounds(frontTerm, frontStack, { minFontSize: 14 });
    if (frontStack.scrollHeight > frontFace.clientHeight + 1) {
      fitTextToBounds(frontTerm, frontFace, { minFontSize: 13 });
    }
  }

  if (backFace && backText) {
    fitTextToBounds(backText, backFace, { minFontSize: 14 });
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hasVisibleOverflow(element, boundsElement) {
  if (!element || !boundsElement) return false;
  return element.scrollWidth > boundsElement.clientWidth + 1 || element.scrollHeight > boundsElement.clientHeight + 1;
}

function fitTextToBounds(textEl, boundsEl, opts = {}) {
  if (!textEl || !boundsEl) return;
  const text = String(textEl.textContent || "").trim();
  const baseSize =
    Number.parseFloat(textEl.dataset.baseFontSize || "") || Number.parseFloat(window.getComputedStyle(textEl).fontSize) || 16;
  const minSize = clamp(opts.minFontSize || Math.round(baseSize * 0.58), 12, baseSize);
  const isSingleToken = text.length > 0 && !/\s/.test(text);

  textEl.dataset.baseFontSize = String(baseSize);
  textEl.classList.toggle("flash-fit-wrap", !isSingleToken);
  textEl.classList.toggle("flash-fit-nowrap", isSingleToken);
  textEl.style.fontSize = `${baseSize}px`;

  if (!hasVisibleOverflow(textEl, boundsEl)) return;

  let low = minSize;
  let high = baseSize;
  let best = minSize;

  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    textEl.style.fontSize = `${mid}px`;
    if (hasVisibleOverflow(textEl, boundsEl)) {
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

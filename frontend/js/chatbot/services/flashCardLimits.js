export const MAX_FLASH_CARD_SIDE_CHARS = 100;

function normalizeCardSide(value) {
  return String(value ?? "").trim();
}

export function getFlashCardSideLength(value) {
  return normalizeCardSide(value).length;
}

export function isFlashCardSideWithinLimit(value) {
  return getFlashCardSideLength(value) <= MAX_FLASH_CARD_SIDE_CHARS;
}

export function isFlashCardWithinCharLimit(card) {
  return isFlashCardSideWithinLimit(card?.front) && isFlashCardSideWithinLimit(card?.back);
}

export function collectFlashCardLengthViolations(cards) {
  if (!Array.isArray(cards)) return [];
  return cards
    .map((card) => {
      const front = normalizeCardSide(card?.front);
      const back = normalizeCardSide(card?.back);
      const frontLength = front.length;
      const backLength = back.length;
      const overFront = frontLength > MAX_FLASH_CARD_SIDE_CHARS;
      const overBack = backLength > MAX_FLASH_CARD_SIDE_CHARS;
      if (!overFront && !overBack) return null;
      return { card: { front, back }, frontLength, backLength, overFront, overBack };
    })
    .filter(Boolean);
}

export function filterFlashCardsWithinLimit(cards) {
  return Array.isArray(cards) ? cards.filter((card) => isFlashCardWithinCharLimit(card)) : [];
}


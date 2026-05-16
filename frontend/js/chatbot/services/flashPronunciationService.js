import { getApiOrigin } from "../config.js";

const PHONETIC_CACHE = new Map();
const PLACEHOLDER_PHONETICS = new Set(["/tɜːm/", "/term/", "/.../"]);

function normalizeFrontKey(front) {
  return String(front || "")
    .trim()
    .toLowerCase();
}

export function normalizeFlashPhonetic(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const unwrapped = raw.replace(/^[/\[\s]+|[/\]\s]+$/g, "").trim();
  return unwrapped ? `/${unwrapped}/` : "";
}

export function isMissingFlashPhonetic(value) {
  const normalized = normalizeFlashPhonetic(value).toLowerCase();
  return !normalized || PLACEHOLDER_PHONETICS.has(normalized);
}

function readCachedPhonetic(front) {
  const key = normalizeFrontKey(front);
  return key ? PHONETIC_CACHE.get(key) || "" : "";
}

function writeCachedPhonetics(pronunciations) {
  if (!pronunciations || typeof pronunciations !== "object") return;
  Object.entries(pronunciations).forEach(([front, phonetic]) => {
    const key = normalizeFrontKey(front);
    const normalized = normalizeFlashPhonetic(phonetic);
    if (key && normalized) PHONETIC_CACHE.set(key, normalized);
  });
}

async function fetchFlashPronunciations(terms) {
  const res = await fetch(`${getApiOrigin()}/api/flash/pronunciations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terms }),
  });
  if (!res.ok) return {};
  const data = await res.json();
  return data?.pronunciations && typeof data.pronunciations === "object" ? data.pronunciations : {};
}

/**
 * Best-effort hydration: keep existing cards if the API is unavailable.
 * @param {Array<{ front?: string, phonetic?: string }>} cards
 * @returns {Promise<Array<{ front?: string, phonetic?: string }>>}
 */
export async function hydrateFlashCardPronunciations(cards) {
  const safeCards = Array.isArray(cards) ? cards.filter((card) => card && typeof card === "object") : [];
  if (!safeCards.length) return safeCards;

  const missingTerms = [];
  safeCards.forEach((card) => {
    const cached = readCachedPhonetic(card.front);
    if (cached) {
      card.phonetic = cached;
      return;
    }
    if (!card.front || !isMissingFlashPhonetic(card.phonetic)) {
      const normalizedExisting = normalizeFlashPhonetic(card.phonetic);
      if (normalizedExisting) card.phonetic = normalizedExisting;
      return;
    }
    missingTerms.push(String(card.front).trim());
  });

  const uniqueTerms = [...new Set(missingTerms.filter(Boolean))];
  if (!uniqueTerms.length) return safeCards;

  try {
    const pronunciations = await fetchFlashPronunciations(uniqueTerms);
    writeCachedPhonetics(pronunciations);
    safeCards.forEach((card) => {
      const cached = readCachedPhonetic(card.front);
      if (cached) card.phonetic = cached;
    });
  } catch {
    // Best effort only: render the card anyway if pronunciation lookup fails.
  }

  return safeCards;
}

import { describe, expect, it } from "vitest";

import { MAX_FLASH_CARD_SIDE_CHARS } from "../../frontend/js/chatbot/services/flashCardLimits.js";
import { prepareFlashSessionData } from "../../frontend/js/chatbot/services/sessionContentPrep.js";

describe("prepareFlashSessionData", () => {
  it("filters out direct flashcards whose front or back exceeds the limit", () => {
    const data = { title: "Flashcard", cards: [] };
    const meta = {
      __directCardsJson: JSON.stringify([
        { front: "valid", back: "nghia" },
        { front: "also valid", back: "x".repeat(MAX_FLASH_CARD_SIDE_CHARS + 1) },
      ]),
    };

    const result = prepareFlashSessionData(data, meta);

    expect(result.cards).toEqual([{ front: "valid", back: "nghia" }]);
  });

  it("filters over-limit cards from the fallback pool too", () => {
    const data = {
      title: "Flashcard",
      cards: [
        { front: "valid", back: "ok" },
        { front: "x".repeat(MAX_FLASH_CARD_SIDE_CHARS + 1), back: "too long" },
      ],
    };

    const result = prepareFlashSessionData(data, { count: "5" });

    expect(result.cards).toEqual([{ front: "valid", back: "ok" }]);
  });
});

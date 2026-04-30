import { describe, expect, it } from "vitest";

import { MAX_FLASH_CARD_SIDE_CHARS } from "../../frontend/js/chatbot/services/flashCardLimits.js";
import { classifyFlashVocabLine, parseDirectFlashVocabLines } from "../../frontend/js/chatbot/guidedFlow/flashVocabParse.js";

describe("flashVocabParse", () => {
  it("marks lines longer than the flashcard limit as too long", () => {
    const line = `${"a".repeat(MAX_FLASH_CARD_SIDE_CHARS + 1)}: nghĩa ngắn`;

    expect(classifyFlashVocabLine(line)).toBe("too_long");
  });

  it("returns over-limit direct vocab lines separately from invalid lines", () => {
    const raw = `short: ok\n${"b".repeat(MAX_FLASH_CARD_SIDE_CHARS + 1)}: hợp lệ nhưng quá dài`;

    const parsed = parseDirectFlashVocabLines(raw);

    expect(parsed.cards).toEqual([{ front: "short", back: "ok" }]);
    expect(parsed.overLimitLines).toHaveLength(1);
    expect(parsed.invalidLines).toEqual([]);
  });

  it("treats auto-translated backs longer than the limit as over-limit lines", () => {
    const raw = "obstacle";
    const parsed = parseDirectFlashVocabLines(raw, {
      obstacle: "x".repeat(MAX_FLASH_CARD_SIDE_CHARS + 1),
    });

    expect(parsed.cards).toEqual([]);
    expect(parsed.overLimitLines).toEqual(["obstacle"]);
  });
});

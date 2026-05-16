import { describe, expect, it } from "vitest";

import { MAX_FLASH_CARD_SIDE_CHARS } from "../../frontend/js/chatbot/services/flashCardLimits.js";
import {
  prepareFlashSessionData,
  prepareQuizSessionData,
  prepareSlideSessionData,
} from "../../frontend/js/chatbot/services/sessionContentPrep.js";

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

  it("pads fallback flashcards to the exact requested count", () => {
    const data = {
      title: "Flashcard",
      cards: [{ id: "c1", front: "valid", back: "ok" }],
    };

    const result = prepareFlashSessionData(data, { count: "4" });

    expect(result.cards).toHaveLength(4);
    expect(result.cards.every((card) => card.front === "valid")).toBe(true);
  });
});

describe("prepareQuizSessionData", () => {
  it("pads fallback quiz questions to the exact requested count", () => {
    const data = {
      title: "Quiz",
      questions: [
        { id: "q1", text: "Question 1", options: ["A", "B", "C", "D"], correctIndex: 0, hint: "hint" },
      ],
    };

    const result = prepareQuizSessionData(data, { count: "3" });

    expect(result.questions).toHaveLength(3);
    expect(result.questions.every((question) => question.text === "Question 1")).toBe(true);
  });
});

describe("prepareSlideSessionData", () => {
  it("pads fallback slides to the exact requested count", () => {
    const data = {
      title: "Slides",
      slides: [
        { id: "s1", title: "Intro", bullets: ["One", "Two"] },
      ],
    };

    const result = prepareSlideSessionData(data, { count: "3" });

    expect(result.slides).toHaveLength(3);
    expect(result.slides.every((slide) => slide.title === "Intro")).toBe(true);
  });
});

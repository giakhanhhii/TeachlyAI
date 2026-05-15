import { describe, expect, it, vi } from "vitest";

import { renderFullSetMixedReviewView } from "../../frontend/js/chatbot/dom/fullSetMixedReviewView.js";

describe("renderFullSetMixedReviewView", () => {
  it("filters the result list down to bookmarked quiz questions", () => {
    const stage = document.createElement("div");

    renderFullSetMixedReviewView({
      stage,
      steps: [
        { kind: "slide_deck", data: { slides: [] } },
        {
          kind: "quiz",
          data: { text: "Question one", options: ["A1", "B1", "C1", "D1"], correctIndex: 1 },
        },
        {
          kind: "quiz",
          data: { text: "Question two", options: ["A2", "B2", "C2", "D2"], correctIndex: 2 },
        },
      ],
      quizStepIndexes: [1, 2],
      quizOrderByStep: { 1: 1, 2: 2 },
      quizSelectedByStep: [null, 0, 2],
      quizCountedByStep: [false, true, true],
      quizCorrectByStep: [false, false, true],
      bookmarkedStepKeys: ["quiz:question two#1"],
      stepKeys: ["slide:0:#1", "quiz:question one#1", "quiz:question two#1"],
      bookmarkFilter: true,
      reviewFilter: "all",
      correct: 1,
      wrong: 1,
      onBackToStep: vi.fn(),
      onCreateOther: vi.fn(),
      onContinueCreate: vi.fn(),
      onFilterChange: vi.fn(),
    });

    const cards = stage.querySelectorAll(".quiz-review-card");
    expect(cards).toHaveLength(1);
    expect(stage.textContent).toContain("Question two");
    expect(stage.textContent).not.toContain("Question one");
  });
});

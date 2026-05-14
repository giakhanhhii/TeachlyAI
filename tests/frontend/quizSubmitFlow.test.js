import { describe, expect, it } from "vitest";

import { finalizePendingQuizAnswer, findNextStepIndexByKind } from "../../frontend/js/chatbot/services/quizSubmitFlow.js";

describe("quizSubmitFlow", () => {
  it("finalizes the currently selected answer when it has not been graded yet", () => {
    expect(finalizePendingQuizAnswer(2, 2, false)).toEqual({
      picked: 2,
      isCorrect: true,
    });
  });

  it("ignores unanswered or already graded quiz steps", () => {
    expect(finalizePendingQuizAnswer(null, 1, false)).toBeNull();
    expect(finalizePendingQuizAnswer(1, 1, true)).toBeNull();
  });

  it("finds the next flash step after the current quiz step", () => {
    const steps = [
      { kind: "slide_deck" },
      { kind: "quiz" },
      { kind: "quiz" },
      { kind: "flash" },
      { kind: "flash" },
    ];

    expect(findNextStepIndexByKind(steps, 1, "flash")).toBe(3);
    expect(findNextStepIndexByKind(steps, 3, "flash")).toBe(4);
    expect(findNextStepIndexByKind(steps, 4, "flash")).toBe(-1);
  });
});

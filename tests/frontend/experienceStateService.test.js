import { describe, expect, it } from "vitest";

import { retargetFullsetInitialState } from "../../frontend/js/chatbot/services/experienceStateService.js";

describe("retargetFullsetInitialState", () => {
  const initialState = {
    index: 4,
    slideDeckIndex: 3,
    reviewMode: true,
    reviewFilter: "wrong",
    bookmarkFilter: true,
    stepsSnapshot: [
      { kind: "slide_deck", data: { slides: [{ title: "Slide 1" }, { title: "Slide 2" }] } },
      { kind: "quiz", data: { text: "Q1" } },
      { kind: "quiz", data: { text: "Q2" } },
      { kind: "flash", data: { front: "F1", back: "B1" } },
      { kind: "flash", data: { front: "F2", back: "B2" } },
    ],
  };

  it("jumps to the first slide of the slide section", () => {
    const result = retargetFullsetInitialState(initialState, "slide");

    expect(result).toMatchObject({
      index: 0,
      slideDeckIndex: 0,
      reviewMode: false,
      reviewFilter: "all",
      bookmarkFilter: false,
    });
  });

  it("jumps to the first quiz question", () => {
    const result = retargetFullsetInitialState(initialState, "quiz");

    expect(result).toMatchObject({
      index: 1,
      slideDeckIndex: 3,
      reviewMode: false,
      reviewFilter: "all",
      bookmarkFilter: false,
    });
  });

  it("jumps to the first flashcard", () => {
    const result = retargetFullsetInitialState(initialState, "flash");

    expect(result).toMatchObject({
      index: 3,
      reviewMode: false,
      reviewFilter: "all",
      bookmarkFilter: false,
    });
  });
});

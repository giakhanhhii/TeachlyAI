import { describe, expect, it } from "vitest";

import { resolveMixedSlideDeckArrowAction } from "../../frontend/js/chatbot/services/fullSetMixedService.js";

describe("fullSetMixedService", () => {
  it("moves within the deck when the current slide is not at an edge", () => {
    expect(resolveMixedSlideDeckArrowAction("ArrowLeft", 2, 5)).toBe("deck-prev");
    expect(resolveMixedSlideDeckArrowAction("ArrowRight", 2, 5)).toBe("deck-next");
  });

  it("moves to the previous step when ArrowLeft is pressed on the first slide", () => {
    expect(resolveMixedSlideDeckArrowAction("ArrowLeft", 0, 5)).toBe("step-prev");
  });

  it("moves to the next step when ArrowRight is pressed on the last slide", () => {
    expect(resolveMixedSlideDeckArrowAction("ArrowRight", 4, 5)).toBe("step-next");
  });
});

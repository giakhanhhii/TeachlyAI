import { describe, expect, it } from "vitest";

import { createAutofillIntentTracker } from "../../frontend/js/chatbot/dom/cards/autofillIntent.js";

describe("autofillIntent", () => {
  it("keeps autofill submissions on mock when the user leaves values unchanged", () => {
    const tracker = createAutofillIntentTracker();
    tracker.remember({ topic: "Passive voice", count: "10" });

    expect(
      tracker.applyToPayload(
        { topic: "Passive voice", count: "10", presetId: "preset-1" },
        { topic: "Passive voice", count: "10" },
      ),
    ).toEqual({
      topic: "Passive voice",
      count: "10",
      presetId: "preset-1",
      __forceMock: "1",
    });
  });

  it("switches to AI when the user changes any autofilled field", () => {
    const tracker = createAutofillIntentTracker();
    tracker.remember({ topic: "Passive voice", count: "10" });

    expect(
      tracker.applyToPayload(
        { topic: "Passive voice", count: "12", presetId: "preset-1" },
        { topic: "Passive voice", count: "12" },
      ),
    ).toEqual({
      topic: "Passive voice",
      count: "12",
      presetId: "",
      __forceAi: "1",
    });
  });

  it("does nothing when the form was never autofilled", () => {
    const tracker = createAutofillIntentTracker();
    const payload = { topic: "Manual topic", count: "8" };

    expect(tracker.applyToPayload(payload, payload)).toBe(payload);
  });
});

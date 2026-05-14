import { describe, expect, it } from "vitest";

import {
  buildAutoModeFullsetSpec,
  resolveFullsetContentSource,
} from "../../frontend/js/chatbot/services/fullsetAutoMode.js";

describe("fullsetAutoMode", () => {
  it("forces mock during auto-mode warmup", () => {
    expect(
      buildAutoModeFullsetSpec("Education", { slides: 10, quiz: 15, flash: 10 }, "forest", {
        isWarmup: true,
      }),
    ).toEqual({
      topic: "Education",
      slides: "10",
      quiz: "15",
      flash: "10",
      slideTemplate: "forest",
      __autoMode: "1",
      __forceMock: "1",
    });
  });

  it("marks recommendation-backed auto fullset as ai when requested", () => {
    expect(
      buildAutoModeFullsetSpec("Education", { slides: 10, quiz: 15, flash: 10 }, "forest", {
        isAi: true,
        prefetchKey: "rec_queue_prefetch_rank1",
      }),
    ).toEqual({
      topic: "Education",
      slides: "10",
      quiz: "15",
      flash: "10",
      slideTemplate: "forest",
      __autoMode: "1",
      __prefetchId: "rec_queue_prefetch_rank1",
      __forceAi: "1",
    });
  });

  it("keeps auto-mode fullset on mock until explicitly promoted to ai", () => {
    expect(
      resolveFullsetContentSource({
        autoMode: true,
        aiModeActive: true,
        topic: "Education",
      }),
    ).toBe("mock");
  });

  it("still allows manual fullset topics to go straight to ai", () => {
    expect(
      resolveFullsetContentSource({
        autoMode: false,
        aiModeActive: false,
        topic: "Education",
      }),
    ).toBe("ai");
  });
});

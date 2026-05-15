import { afterEach, describe, expect, it, vi } from "vitest";

describe("autoModeStore theme rotation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    localStorage.clear();
  });

  it("uses all 7 slide themes once before repeating", async () => {
    const autoModeStore = await import("../../frontend/js/chatbot/services/autoModeStore.js");

    const picks = Array.from({ length: 7 }, () => autoModeStore.pickRandomTheme());

    expect(new Set(picks).size).toBe(7);
  });

  it("avoids repeating the same theme across the shuffle-bag boundary", async () => {
    const autoModeStore = await import("../../frontend/js/chatbot/services/autoModeStore.js");

    const picks = Array.from({ length: 8 }, () => autoModeStore.pickRandomTheme());

    expect(new Set(picks.slice(0, 7)).size).toBe(7);
    expect(picks[7]).not.toBe(picks[6]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const PREF_KEY = "teachly_recommend_panel_visible";

async function importRecommendPanelPrefs() {
  vi.resetModules();
  return import("../../frontend/js/chatbot/services/recommendPanelPrefs.js");
}

describe("recommendPanelPrefs.js", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("defaults to hidden when there is no saved preference", async () => {
    const prefs = await importRecommendPanelPrefs();

    expect(prefs.isRecommendPanelVisible()).toBe(false);
  });

  it("persists visibility changes and notifies subscribers", async () => {
    const prefs = await importRecommendPanelPrefs();
    const listener = vi.fn();
    const unsubscribe = prefs.subscribeRecommendPanelVisibility(listener);

    const result = prefs.setRecommendPanelVisible(true);

    expect(result).toBe(true);
    expect(localStorage.getItem(PREF_KEY)).toBe("1");
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    prefs.setRecommendPanelVisible(false);
    expect(localStorage.getItem(PREF_KEY)).toBe("0");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startAiCountdown } from "../../frontend/js/chatbot/dom/experienceLoading.js";

describe("experienceLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows elapsed wait time instead of counting down from the estimate", () => {
    const overlay = document.createElement("div");

    const stop = startAiCountdown(overlay, 30);
    const label = overlay.querySelector(".ai-loading-countdown");

    expect(label?.textContent).toBe("Đã chờ ~0s");

    vi.advanceTimersByTime(13_000);

    expect(label?.textContent).toBe("Đã chờ ~13s");
    stop();
  });

  it("reuses the fetch start time when startedAt is provided", () => {
    const overlay = document.createElement("div");
    const startedAt = Date.now() - 8_000;

    const stop = startAiCountdown(overlay, 5, { startedAt });
    const label = overlay.querySelector(".ai-loading-countdown");

    expect(label?.textContent).toBe("Đã chờ ~8s • sắp xong…");
    stop();
  });
});

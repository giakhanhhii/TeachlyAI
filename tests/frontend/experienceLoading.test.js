import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildAiLoadingTips,
  createAiLoadingOverlay,
} from "../../frontend/js/chatbot/dom/experienceLoading.js";

describe("experienceLoading", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("keeps the contextual tip first and appends helpful product suggestions", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const tips = buildAiLoadingTips("Đang tạo quiz theo tài liệu của bạn.");

    expect(tips[0]).toBe("Đang tạo quiz theo tài liệu của bạn.");
    expect(tips).toContain(
      "Bạn có thể làm bài Full 40 câu THPTQG bằng cách chọn tạo quiz ở chế độ custom rồi bấm option \"Làm full đề THPTQG\".",
    );
  });

  it("renders a loading overlay and rotates to another tip over time", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const host = document.createElement("div");
    document.body.appendChild(host);

    const overlayState = createAiLoadingOverlay(host, {
      label: "AI đang tạo full set…",
      tip: "Đang tạo slide, câu hỏi và flashcard.",
      estimatedSeconds: 12,
      rotateEveryMs: 2000,
    });

    const label = host.querySelector(".ai-loading-label");
    const tip = host.querySelector(".ai-loading-tip");

    expect(label?.textContent).toBe("AI đang tạo full set…");
    expect(tip?.textContent).toBe("Đang tạo slide, câu hỏi và flashcard.");

    vi.advanceTimersByTime(2100);
    expect(tip?.textContent).toBe(
      "Bạn có thể làm bài Full 40 câu THPTQG bằng cách chọn tạo quiz ở chế độ custom rồi bấm option \"Làm full đề THPTQG\".",
    );

    overlayState.remove();
    expect(host.querySelector(".ai-loading-overlay")).toBeNull();
  });
});

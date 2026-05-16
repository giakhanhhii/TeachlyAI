import { describe, expect, it, vi } from "vitest";

import { createExperienceTopBar } from "../../frontend/js/chatbot/dom/experienceChrome.js";

describe("experienceChrome share button", () => {
  it("keeps the share button clickable when an onShare handler exists", () => {
    const { shareButton } = createExperienceTopBar({
      title: "Quiz",
      onShare: vi.fn(),
    });

    expect(shareButton.disabled).toBe(false);
    expect(shareButton.classList.contains("is-loading")).toBe(false);
  });

  it("shows a loading icon while share is in progress and restores after completion", async () => {
    let resolveShare;
    const onShare = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveShare = resolve;
        }),
    );
    const { shareButton } = createExperienceTopBar({
      title: "Slide",
      onShare,
    });

    shareButton.click();

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(shareButton.classList.contains("is-loading")).toBe(true);
    expect(shareButton.disabled).toBe(true);
    expect(shareButton.getAttribute("aria-busy")).toBe("true");
    expect(shareButton.querySelector(".exp-icon-svg-spinner")).not.toBeNull();

    resolveShare();
    await Promise.resolve();
    await Promise.resolve();

    expect(shareButton.classList.contains("is-loading")).toBe(false);
    expect(shareButton.disabled).toBe(false);
    expect(shareButton.getAttribute("aria-busy")).toBeNull();
    expect(shareButton.querySelector(".exp-icon-svg-spinner")).toBeNull();
  });
});

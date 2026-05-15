import { describe, expect, it, vi } from "vitest";

import { createExperienceTopBar } from "../../frontend/js/chatbot/dom/experienceChrome.js";

describe("experienceChrome.js", () => {
  it("fills missing actionButton fields from the AI defaults", () => {
    const onAiEdit = vi.fn();

    const { actionButton } = createExperienceTopBar({
      title: "Bo slide",
      onAiEdit,
      actionButton: {
        label: "Tuy chinh",
      },
    });

    expect(actionButton).not.toBeNull();
    expect(actionButton.className).toContain("exp-ai-btn");
    expect(actionButton.title).toBe("Nhờ AI chỉnh sửa nội dung");
    expect(actionButton.getAttribute("aria-label")).toBe("Nhờ AI chỉnh sửa nội dung");

    actionButton.click();
    expect(onAiEdit).toHaveBeenCalledTimes(1);
  });

  it("enables the share button when a share handler is provided", async () => {
    const onShare = vi.fn().mockResolvedValue(undefined);

    const { shareButton } = createExperienceTopBar({
      title: "Bo slide",
      onShare,
    });

    expect(shareButton.disabled).toBe(false);

    shareButton.click();
    await Promise.resolve();

    expect(onShare).toHaveBeenCalledTimes(1);
  });
});

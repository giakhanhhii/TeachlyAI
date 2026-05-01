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
});

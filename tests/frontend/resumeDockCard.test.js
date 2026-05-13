import { describe, expect, it, vi } from "vitest";

import { createResumeDockCard } from "../../frontend/js/chatbot/dom/resumeDockCard.js";

describe("createResumeDockCard", () => {
  it("routes fullset mixed item clicks back into the same fullset section", () => {
    const onOpen = vi.fn();
    const onOpenFullSetMixed = vi.fn();
    const dock = {
      title: "Full Set - Moi truong",
      fullsetMixed: {
        topic: "Moi truong",
        slides: "10",
        quiz: "20",
        flash: "10",
        __experienceId: "fullset-1",
      },
      items: [
        { kind: "slide", title: "Slide - Moi truong", meta: {} },
        { kind: "quiz", title: "Trac nghiem - Moi truong", meta: {} },
        { kind: "flash", title: "Flashcard - Moi truong", meta: {} },
      ],
    };

    const root = createResumeDockCard(dock, onOpen, undefined, onOpenFullSetMixed);
    const buttons = [...root.querySelectorAll(".resume-dock-open-btn")];

    buttons[1].click();

    expect(onOpen).not.toHaveBeenCalled();
    expect(onOpenFullSetMixed).toHaveBeenCalledWith(dock.fullsetMixed, dock.title, "quiz");
  });
});

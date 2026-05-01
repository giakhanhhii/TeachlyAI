import { describe, expect, it } from "vitest";

import { insertInlineMcLineBreaks, renderQuizStemRichText } from "../../frontend/js/chatbot/services/quizService.js";

describe("quizService rich text formatting", () => {
  it("splits inline lowercase arrangement labels onto separate lines", () => {
    const raw = "a. First idea b. Second idea c. Third idea";

    expect(insertInlineMcLineBreaks(raw)).toBe("a. First idea\nb. Second idea\nc. Third idea");
  });

  it("renders markdown headings without showing raw hashes", () => {
    const target = document.createElement("div");

    renderQuizStemRichText(target, "# Main note\nBody line");

    const heading = target.querySelector(".quiz-rich-heading");
    expect(heading?.textContent).toBe("Main note");
    expect(target.textContent).toBe("Main noteBody line");
    expect(target.innerHTML).not.toContain("# Main note");
  });
});

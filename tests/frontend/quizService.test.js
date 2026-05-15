import { describe, expect, it } from "vitest";

import { emphasizePromptReferences } from "../../frontend/js/chatbot/dom/thptqgFullTestExperienceView.js";
import {
  insertInlineMcLineBreaks,
  removeStandaloneDashLines,
  renderQuizStemRichText,
} from "../../frontend/js/chatbot/services/quizService.js";

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

  it("removes lines that only contain a standalone dash", () => {
    expect(removeStandaloneDashLines("Line one\n-\nLine two")).toBe("Line one\nLine two");
    expect(insertInlineMcLineBreaks("a. First line\n-\nb. Second line")).toBe("a. First line\nb. Second line");
  });

  it("does not treat contractions as quoted prompt focus", () => {
    const prompt =
      "Question 13. a. Binh: I'm pretty much ready, just waiting for the family to arrive. I'm really looking forward to Christmas movies!";

    expect(emphasizePromptReferences(prompt)).toBe(prompt);
  });

  it("still emphasizes real quoted prompt terms", () => {
    const prompt = 'Question 23. The word "they" in paragraph 1 refers to _.';

    expect(emphasizePromptReferences(prompt)).toContain('word "**they**"');
    expect(emphasizePromptReferences(prompt)).toContain("**paragraph 1**");
  });
});

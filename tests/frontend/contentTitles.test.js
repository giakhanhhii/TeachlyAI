import { describe, expect, it } from "vitest";

import { buildExperienceTitle, buildFormTitle, resolveTopicLabel } from "../../frontend/js/chatbot/services/contentTitles.js";

describe("contentTitles", () => {
  it("prefers the first valid topic-like label", () => {
    expect(resolveTopicLabel("  ", "(Teachly tự động)", "Gerunds and infinitives")).toBe("Gerunds and infinitives");
  });

  it("formats experience titles with the real topic", () => {
    expect(buildExperienceTitle("fullset", "Gerunds and infinitives")).toBe("Fullset - chủ đề Gerunds and infinitives");
    expect(buildExperienceTitle("quiz", "Conjunctions")).toBe("Quiz - chủ đề Conjunctions");
    expect(buildExperienceTitle("flash", "Technology vocabulary")).toBe("Flashcard - chủ đề Technology vocabulary");
    expect(buildExperienceTitle("slide", "")).toBe("Slide");
  });

  it("formats form titles with the real topic when available", () => {
    expect(buildFormTitle("slide", "Passive voice")).toBe("Form Slide - chủ đề Passive voice");
    expect(buildFormTitle("quiz")).toBe("Form Quiz");
  });
});

import { describe, expect, it } from "vitest";

import { pickMockImagesForSlide } from "../../frontend/js/chatbot/data/slideMockImageLibrary.js";

describe("slideMockImageLibrary", () => {
  it("prioritizes ocean visuals for Sea Life theme even on generic slide text", () => {
    const [pick] = pickMockImagesForSlide(
      {
        title: "Core knowledge",
        bullets: ["Main idea, examples, and review tasks."],
      },
      {
        themeLabel: "Sea Life",
      },
    );

    expect(["ocean-diver", "ocean-whale", "ocean-school"]).toContain(pick?.id);
  });

  it("prioritizes space visuals for Space themes", () => {
    const [pick] = pickMockImagesForSlide(
      {
        title: "Core knowledge",
        bullets: ["Main idea, examples, and review tasks."],
      },
      {
        themeLabel: "Space Dark",
      },
    );

    expect(["space-galaxy", "space-earth", "space-ring"]).toContain(pick?.id);
  });

  it("keeps a slide's existing imageUrl as the first image choice", () => {
    const [pick] = pickMockImagesForSlide(
      {
        title: "Reading practice",
        imageUrl: "https://example.com/custom-image.jpg",
        imageAlt: "Custom slide image",
      },
      {
        themeLabel: "Friendly (Warm)",
      },
    );

    expect(pick?.url).toBe("https://example.com/custom-image.jpg");
    expect(pick?.alt).toBe("Custom slide image");
  });
});

import { describe, expect, it } from "vitest";

import {
  enrichSlidesWithMockImages,
  pickMockImagesForSlide,
} from "../../frontend/js/chatbot/data/slideMockImageLibrary.js";

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

  it("uses the wider library before repeating images within the same slide session", () => {
    const slides = Array.from({ length: 12 }, (_, index) => ({
      title: `Core knowledge ${index + 1}`,
      bullets: ["Main idea, examples, and review tasks."],
    }));

    const enriched = enrichSlidesWithMockImages(slides, {
      themeLabel: "Sea Life",
      topic: "Reading strategies",
    });
    const urls = enriched.map((slide) => slide.imageUrl);

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls[0]).toContain("images.unsplash.com/");
    expect(urls.some((url) => String(url).includes("photo-1551244072-5d12893278ab"))).toBe(true);
  });

  it("replaces a duplicate preassigned image inside the same session", () => {
    const sharedUrl = "https://example.com/shared-ocean.jpg";
    const enriched = enrichSlidesWithMockImages(
      [
        {
          title: "Slide 1",
          imageUrl: sharedUrl,
          imageAlt: "Shared ocean image",
        },
        {
          title: "Slide 2",
          bullets: ["Ocean signals and practice tasks."],
          imageUrl: sharedUrl,
          imageAlt: "Shared ocean image",
        },
      ],
      {
        themeLabel: "Sea Life",
      },
    );

    expect(enriched[0]?.imageUrl).toBe(sharedUrl);
    expect(enriched[1]?.imageUrl).not.toBe(sharedUrl);
    expect(enriched[1]?.imageUrl).toContain("images.unsplash.com/");
  });
});

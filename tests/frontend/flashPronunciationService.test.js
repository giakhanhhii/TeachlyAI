import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hydrateFlashCardPronunciations,
  isMissingFlashPhonetic,
  normalizeFlashPhonetic,
} from "../../frontend/js/chatbot/services/flashPronunciationService.js";

describe("flashPronunciationService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.innerHTML = "";
  });

  it("normalizes slash-wrapped IPA and recognizes placeholders", () => {
    expect(normalizeFlashPhonetic(" əˈproʊtʃ ")).toBe("/əˈproʊtʃ/");
    expect(isMissingFlashPhonetic("/tɜːm/")).toBe(true);
    expect(isMissingFlashPhonetic("/əˈproʊtʃ/")).toBe(false);
  });

  it("hydrates only cards missing pronunciation and preserves existing IPA", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        pronunciations: {
          "come across": "/kʌm əˈkrɔːs/",
          allocate: "/ˈæləkeɪt/",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const cards = [
      { front: "come across", phonetic: "", hint: "Example: I came across a useful article." },
      { front: "allocate", phonetic: "/ˈæləkeɪt/", hint: "Example: Schools allocate funds carefully." },
      { front: "take notes", phonetic: "/tɜːm/", hint: "Example: Students take notes in class." },
    ];

    const result = await hydrateFlashCardPronunciations(cards);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({ terms: ["come across", "take notes"] });
    expect(result[0].phonetic).toBe("/kʌm əˈkrɔːs/");
    expect(result[1].phonetic).toBe("/ˈæləkeɪt/");
    expect(result[2].phonetic).toBe("/tɜːm/");
  });
});

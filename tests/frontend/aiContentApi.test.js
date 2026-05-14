import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAiContent, fetchAiFullsetContent } from "../../frontend/js/chatbot/services/aiContentApi.js";

describe("aiContentApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.innerHTML = "";
  });

  it("sends extra form fields for single-content AI generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slides: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAiContent("slide", "Passive voice", {
      topic: "Passive voice",
      structure: "Overview -> Practice",
      __forceAi: "1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({
      type: "slide",
      topic: "Passive voice",
      form: {
        topic: "Passive voice",
        structure: "Overview -> Practice",
        __forceAi: "1",
      },
    });
  });

  it("sends extra form fields for fullset AI generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ slide: {}, quiz: {}, flashcard: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchAiFullsetContent("Environment", {
      topic: "Environment",
      slides: "12",
      quiz: "18",
      flash: "10",
      extra: "Focus on common exam traps",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({
      type: "fullset",
      topic: "Environment",
      form: {
        topic: "Environment",
        slides: "12",
        quiz: "18",
        flash: "10",
        extra: "Focus on common exam traps",
      },
    });
  });
});

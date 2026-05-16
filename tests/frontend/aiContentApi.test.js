import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchAiContent,
  fetchAiFullsetContent,
  shouldFallbackToMockAiError,
  withMockFallbackOnAiError,
} from "../../frontend/js/chatbot/services/aiContentApi.js";

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

  it("surfaces moderation blocks as 403 errors without mock fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ detail: "Yêu cầu bị từ chối vì chứa nội dung bạo lực nguy hiểm." }),
    }));

    const err = await fetchAiContent("quiz", "how to kill people").catch((error) => error);

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain("Yêu cầu bị từ chối");
    expect(err.status).toBe(403);
    expect(shouldFallbackToMockAiError(err)).toBe(false);
    await expect(
      withMockFallbackOnAiError(Promise.reject(err), async () => ({ questions: [{ id: "mock" }] })),
    ).rejects.toBe(err);
  });

  it("still allows mock fallback for temporary AI failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: "OpenAI rate limit. Vui lòng thử lại sau." }),
    }));

    const result = await withMockFallbackOnAiError(
      fetchAiContent("slide", "Passive voice"),
      async () => ({ slides: [{ id: "mock-slide" }] }),
    );

    expect(result).toEqual({ slides: [{ id: "mock-slide" }] });
  });
});

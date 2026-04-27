import { afterEach, describe, expect, it, vi } from "vitest";

import { getSessionMessages, postChat } from "../../frontend/js/chatbot/chatApi.js";

describe("chatApi.js", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.innerHTML = "";
  });

  it("posts chat payload with message and thread id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ thread_id: "thread-1", reply: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await postChat("http://localhost:8000/api/chat", "hello", "thread-1");

    expect(result).toEqual({ thread_id: "thread-1", reply: "ok" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello", thread_id: "thread-1" }),
    });
  });

  it("throws API detail for failed chat requests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "Backend exploded" }),
    }));

    await expect(postChat("http://localhost:8000/api/chat", "hello")).rejects.toThrow("Backend exploded");
  });

  it("returns local fallback for empty thread ids without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getSessionMessages("", { limit: 5, offset: 2 });

    expect(result).toEqual({
      thread_id: "",
      limit: 5,
      offset: 2,
      total: 0,
      has_more: false,
      messages: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns backward-compatible fallback on 404 session message fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ detail: "not found" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getSessionMessages("thread-404", { limit: 20, offset: 0 });

    expect(result).toEqual({
      thread_id: "thread-404",
      limit: 20,
      offset: 0,
      total: 0,
      has_more: false,
      messages: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

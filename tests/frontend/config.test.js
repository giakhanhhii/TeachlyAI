import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiOrigin, getChatApiUrl } from "../../frontend/js/chatbot/config.js";

describe("config.js", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("falls back to the current origin when no meta tag is present", () => {
    expect(getApiOrigin()).toBe("http://localhost:4173");
    expect(getChatApiUrl()).toBe("http://localhost:4173/api/chat");
  });

  it("uses the configured teachly-api-base when valid", () => {
    document.head.innerHTML = '<meta name="teachly-api-base" content="https://api.example.com/base/">';

    expect(getApiOrigin()).toBe("https://api.example.com/base");
  });

  it("falls back when teachly-api-base is invalid", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.head.innerHTML = '<meta name="teachly-api-base" content="javascript:alert(1)">';

    expect(getApiOrigin()).toBe("http://localhost:4173");
    expect(warnSpy).toHaveBeenCalled();
  });
});

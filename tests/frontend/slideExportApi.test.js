import { afterEach, describe, expect, it, vi } from "vitest";

import { triggerPdfDownload } from "../../frontend/js/chatbot/services/slideExportApi.js";

describe("slideExportApi.js", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("revokes the object URL after the download click", () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const revokeSpy = vi.fn();
    const rafSpy = vi.fn((cb) => {
      cb();
      return 1;
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    vi.stubGlobal("requestAnimationFrame", rafSpy);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: revokeSpy,
    });

    triggerPdfDownload(blob, "slides.pdf");

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:test");
    expect(document.querySelector('a[download="slides.pdf"]')).toBeNull();
  });
});

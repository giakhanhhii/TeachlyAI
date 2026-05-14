import { afterEach, describe, expect, it, vi } from "vitest";

import * as autoModeStore from "../../frontend/js/chatbot/services/autoModeStore.js";
import { createStartupHubElement } from "../../frontend/js/chatbot/dom/startupHubCards.js";

describe("startupHub custom hint", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("shows the custom hint only the first time users switch from auto to custom", () => {
    vi.useFakeTimers();
    autoModeStore.enable();

    const first = createStartupHubElement(() => {});
    document.body.appendChild(first);
    const firstToggle = /** @type {HTMLButtonElement} */ (first.querySelector(".auto-mode-toggle"));
    firstToggle.click();

    const firstHint = first.querySelector(".auto-mode-custom-hint");
    expect(firstToggle.getAttribute("aria-pressed")).toBe("false");
    expect(firstHint?.textContent).toContain("Custom mode giúp bạn kiểm soát kỹ hơn");

    first.remove();
    autoModeStore.enable();

    const second = createStartupHubElement(() => {});
    document.body.appendChild(second);
    const secondToggle = /** @type {HTMLButtonElement} */ (second.querySelector(".auto-mode-toggle"));
    secondToggle.click();

    expect(secondToggle.getAttribute("aria-pressed")).toBe("false");
    expect(second.querySelector(".auto-mode-custom-hint")).toBeNull();
  });
});

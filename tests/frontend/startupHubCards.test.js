import { afterEach, describe, expect, it, vi } from "vitest";

import * as autoModeStore from "../../frontend/js/chatbot/services/autoModeStore.js";
import { createStartupHubElement } from "../../frontend/js/chatbot/dom/startupHubCards.js";

describe("startupHub auto mode onboarding", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("defaults to custom without showing the chooser before a card click", () => {
    const hub = createStartupHubElement(() => {});
    document.body.appendChild(hub);

    const toggle = /** @type {HTMLButtonElement} */ (hub.querySelector(".auto-mode-toggle"));
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector(".auto-mode-overlay")).toBeNull();
    expect(autoModeStore.getNeverAskChoice()).toBeNull();
  });

  it("shows the custom hint only the first time users switch from auto to custom", () => {
    vi.useFakeTimers();
    autoModeStore.setNeverAskChoice("auto");
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

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

  it("defaults to auto and shows the first-time mode chooser once", () => {
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      cb(0);
      return 1;
    });

    const first = createStartupHubElement(() => {});
    document.body.appendChild(first);

    const firstToggle = /** @type {HTMLButtonElement} */ (first.querySelector(".auto-mode-toggle"));
    expect(firstToggle.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector(".auto-mode-overlay")).not.toBeNull();

    const customBtn = /** @type {HTMLButtonElement} */ (document.querySelector(".auto-mode-btn-custom"));
    customBtn.click();

    expect(autoModeStore.isEnabled()).toBe(false);
    expect(autoModeStore.getNeverAskChoice()).toBe("custom");
    expect(document.querySelector(".auto-mode-overlay")).toBeNull();
    expect(firstToggle.getAttribute("aria-pressed")).toBe("false");

    document.body.innerHTML = "";
    const second = createStartupHubElement(() => {});
    document.body.appendChild(second);

    expect(document.querySelector(".auto-mode-overlay")).toBeNull();
    const secondToggle = /** @type {HTMLButtonElement} */ (second.querySelector(".auto-mode-toggle"));
    expect(secondToggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("persists the auto choice from the first-time mode chooser", () => {
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      cb(0);
      return 1;
    });

    const first = createStartupHubElement(() => {});
    document.body.appendChild(first);

    const autoBtn = /** @type {HTMLButtonElement} */ (document.querySelector(".auto-mode-btn-auto"));
    autoBtn.click();

    expect(autoModeStore.isEnabled()).toBe(true);
    expect(autoModeStore.getNeverAskChoice()).toBe("auto");
    expect(document.querySelector(".auto-mode-overlay")).toBeNull();
  });

  it("shows the custom hint only the first time users switch from auto to custom", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      cb(0);
      return 1;
    });
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

import { afterEach, describe, expect, it, vi } from "vitest";

import { bindProtectedHubCards } from "../../frontend/js/chatbot/mainHub.js";
import { loginLocalAccount, logoutCurrentUser, registerLocalAccount } from "../../frontend/js/chatbot/services/authStore.js";

describe("mainHub auth gate", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.unstubAllGlobals();
    return logoutCurrentUser();
  });

  it("opens the auth gate before navigating to a protected lesson card", async () => {
    document.body.innerHTML = `<a class="card" href="chatbot_ui.html?flow=slide">Slide</a>`;
    const ensureUser = vi.fn(async () => ({ username: "teacher01" }));
    const navigate = vi.fn();

    bindProtectedHubCards({ root: document, ensureUser, navigate });
    /** @type {HTMLAnchorElement} */ (document.querySelector(".card")).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await Promise.resolve();

    expect(ensureUser).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not interrupt navigation when the user is already logged in", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            username: "teacher01",
            displayName: "teacher01",
            profileLabel: "Pro",
            avatarText: "T",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          token: "token-1",
          user: {
            username: "teacher01",
            displayName: "teacher01",
            profileLabel: "Pro",
            avatarText: "T",
          },
        }),
      }));
    await registerLocalAccount({
      username: "teacher01",
      password: "secret",
      confirmPassword: "secret",
    });
    await loginLocalAccount({
      username: "teacher01",
      password: "secret",
    });
    document.body.innerHTML = `<a class="card" href="#quiz">Quiz</a>`;
    const ensureUser = vi.fn();
    const navigate = vi.fn();

    bindProtectedHubCards({ root: document, ensureUser, navigate });
    /** @type {HTMLAnchorElement} */ (document.querySelector(".card")).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    await Promise.resolve();

    expect(ensureUser).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows the create-mode choice on the hub before navigating a flow card", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            username: "teacher01",
            displayName: "teacher01",
            profileLabel: "Pro",
            avatarText: "T",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          token: "token-1",
          user: {
            username: "teacher01",
            displayName: "teacher01",
            profileLabel: "Pro",
            avatarText: "T",
          },
        }),
      }));
    await registerLocalAccount({
      username: "teacher01",
      password: "secret",
      confirmPassword: "secret",
    });
    await loginLocalAccount({
      username: "teacher01",
      password: "secret",
    });
    document.body.innerHTML = `
      <button id="autoModeToggle"><span class="toggle-label">Tạo Custom</span></button>
      <a class="card" href="chatbot_ui.html?flow=fullset">Full set</a>
    `;
    const navigate = vi.fn();

    bindProtectedHubCards({ root: document, ensureUser: vi.fn(), navigate });
    /** @type {HTMLAnchorElement} */ (document.querySelector(".card")).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );

    expect(navigate).not.toHaveBeenCalled();
    expect(document.querySelector(".auto-mode-overlay")).not.toBeNull();

    /** @type {HTMLButtonElement} */ (document.querySelector(".auto-mode-btn-custom")).click();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toContain("chatbot_ui.html?flow=fullset");
    expect(navigate.mock.calls[0][0]).not.toContain("mode=auto");
  });
});

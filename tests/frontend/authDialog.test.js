import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentAuthUser, logoutCurrentUser } from "../../frontend/js/chatbot/services/authStore.js";
import { showAuthDialog } from "../../frontend/js/chatbot/dom/authDialog.js";

function submit(form) {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("authDialog", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.unstubAllGlobals();
    return logoutCurrentUser();
  });

  it("shows a validation error when the confirmed password does not match", async () => {
    const pending = showAuthDialog({ initialMode: "register" });

    /** @type {HTMLButtonElement} */
    (document.querySelectorAll(".auth-tab")[1]).click();
    /** @type {HTMLInputElement} */
    (document.querySelector('input[name="register-username"]')).value = "teacher01";
    /** @type {HTMLInputElement} */
    (document.querySelector('input[name="register-password"]')).value = "secret";
    /** @type {HTMLInputElement} */
    (document.querySelector('input[name="register-confirm-password"]')).value = "wrong";

    submit(/** @type {HTMLFormElement} */ (document.querySelectorAll(".auth-form")[1]));
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const feedback = /** @type {HTMLElement} */ (document.querySelector(".auth-feedback"));
    expect(feedback.hidden).toBe(false);
    expect(feedback.textContent).toContain("giống nhau");

    /** @type {HTMLButtonElement} */ (document.querySelector(".auth-close-btn")).click();
    const result = await pending;
    expect(result.authenticated).toBe(false);
  });

  it("lets a newly registered account log in from the same dialog", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            username: "teacher02",
            displayName: "teacher02",
            profileLabel: "Pro",
            avatarText: "T",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          token: "token-2",
          user: {
            username: "teacher02",
            displayName: "teacher02",
            profileLabel: "Pro",
            avatarText: "T",
          },
        }),
      }));

    const pending = showAuthDialog({ initialMode: "register" });

    /** @type {HTMLButtonElement} */
    (document.querySelectorAll(".auth-tab")[1]).click();
    /** @type {HTMLInputElement} */
    (document.querySelector('input[name="register-username"]')).value = "teacher02";
    /** @type {HTMLInputElement} */
    (document.querySelector('input[name="register-password"]')).value = "secret";
    /** @type {HTMLInputElement} */
    (document.querySelector('input[name="register-confirm-password"]')).value = "secret";

    submit(/** @type {HTMLFormElement} */ (document.querySelectorAll(".auth-form")[1]));
    await Promise.resolve();

    /** @type {HTMLInputElement} */ (document.querySelector('input[name="login-username"]')).value = "teacher02";
    /** @type {HTMLInputElement} */ (document.querySelector('input[name="login-password"]')).value = "secret";

    submit(/** @type {HTMLFormElement} */ (document.querySelectorAll(".auth-form")[0]));
    await Promise.resolve();

    const result = await pending;
    expect(result.authenticated).toBe(true);
    expect(result.user.displayName).toBe("teacher02");
    expect(getCurrentAuthUser()?.username).toBe("teacher02");
  });

  it("renders only the local login/register flow", async () => {
    const pending = showAuthDialog();

    expect(document.querySelector(".auth-google-btn")).toBeNull();
    expect(document.querySelector(".auth-divider")).toBeNull();

    /** @type {HTMLButtonElement} */ (document.querySelector(".auth-close-btn")).click();
    const result = await pending;
    expect(result.authenticated).toBe(false);
  });
});

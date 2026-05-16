import { afterEach, describe, expect, it, vi } from "vitest";

import { bindChatAuthChrome } from "../../frontend/js/chatbot/dom/authChrome.js";
import { loginLocalAccount, logoutCurrentUser, registerLocalAccount } from "../../frontend/js/chatbot/services/authStore.js";

describe("authChrome", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.unstubAllGlobals();
    return logoutCurrentUser();
  });

  it("shows login/register buttons while logged out and updates the sidebar after login", async () => {
    document.body.innerHTML = `
      <div id="topAuthControls"></div>
      <div id="sidebarUserAvatar"></div>
      <div id="sidebarUserName"></div>
      <div id="sidebarUserSubtitle"></div>
      <button id="sidebarLogoutBtn" hidden></button>
    `;

    bindChatAuthChrome({
      topAuthContainer: document.getElementById("topAuthControls"),
      sidebarAvatarEl: document.getElementById("sidebarUserAvatar"),
      sidebarNameEl: document.getElementById("sidebarUserName"),
      sidebarSubtitleEl: document.getElementById("sidebarUserSubtitle"),
      sidebarLogoutBtn: /** @type {HTMLButtonElement} */ (document.getElementById("sidebarLogoutBtn")),
    });

    expect(document.querySelectorAll(".auth-inline-btn")).toHaveLength(2);
    expect(document.getElementById("sidebarUserName")?.textContent).toBe("Khách");

    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            username: "teacher01",
            displayName: "teacher01",
            profileLabel: "Hồ sơ Teachly",
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
            profileLabel: "Hồ sơ Teachly",
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

    expect(document.getElementById("topAuthControls")?.hidden).toBe(true);
    expect(document.getElementById("sidebarUserAvatar")?.textContent).toBe("T");
    expect(document.getElementById("sidebarUserName")?.textContent).toBe("teacher01");
    expect(document.getElementById("sidebarUserSubtitle")?.textContent).toBe("Hồ sơ Teachly");
    expect(document.getElementById("sidebarLogoutBtn")?.hidden).toBe(false);
  });
});

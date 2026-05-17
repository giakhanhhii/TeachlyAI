import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCurrentAuthUser,
  loginLocalAccount,
  logoutCurrentUser,
  registerLocalAccount,
} from "../../frontend/js/chatbot/services/authStore.js";

describe("authStore", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    return logoutCurrentUser();
  });

  it("requires matching passwords before registering a local account", async () => {
    const result = await registerLocalAccount({
      username: "teacher01",
      password: "secret",
      confirmPassword: "different",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("giống nhau");
  });

  it("allows a registered local account to log in later", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
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

    const registered = await registerLocalAccount({
      username: "teacher01",
      password: "secret",
      confirmPassword: "secret",
    });
    expect(registered.ok).toBe(true);

    const loggedIn = await loginLocalAccount({
      username: "teacher01",
      password: "secret",
    });

    expect(loggedIn.ok).toBe(true);
    expect(getCurrentAuthUser()).toMatchObject({
      username: "teacher01",
      displayName: "teacher01",
      profileLabel: "Pro",
      avatarText: "T",
    });
  });

  it("clears invalid non-local identity snapshots from storage", () => {
    localStorage.setItem("teachly_auth_user_cache_v1", JSON.stringify({ username: "" }));

    expect(getCurrentAuthUser()).toBeNull();
  });

  it("lazily reads a cached identity written after module initialization", () => {
    localStorage.setItem("teachly_auth_token_v1", "cached-token");
    localStorage.setItem("teachly_auth_user_cache_v1", JSON.stringify({
      username: "cached_teacher",
      displayName: "Cached Teacher",
      profileLabel: "Pro",
      avatarText: "C",
    }));

    expect(getCurrentAuthUser()).toMatchObject({
      username: "cached_teacher",
      displayName: "Cached Teacher",
    });
  });
});

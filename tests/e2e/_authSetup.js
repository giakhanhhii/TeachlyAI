// Helper dùng chung cho e2e: seed auth localStorage + mock các endpoint auth/session
// để test không bị chặn ở popup đăng nhập. Gọi `installAuthBypass(page)` ngay trước
// `page.goto(...)` trong mỗi test cần truy cập trang đã đăng nhập.

export const E2E_AUTH_TOKEN = "e2e-test-token";
export const E2E_AUTH_USER = {
  username: "e2e_tester",
  displayName: "E2E Tester",
  profileLabel: "Pro",
  avatarText: "E",
};

export async function installAuthBypass(page, { user = E2E_AUTH_USER, token = E2E_AUTH_TOKEN } = {}) {
  await page.addInitScript(
    ({ user, token }) => {
      try {
        window.localStorage.setItem("teachly_auth_token_v1", token);
        window.localStorage.setItem("teachly_auth_user_cache_v1", JSON.stringify(user));
      } catch {
        // ignore
      }
    },
    { user, token },
  );

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user }),
    }),
  );
  await page.route("**/api/auth/state", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: [], activeSession: 0, updatedAt: null }),
    }),
  );
}

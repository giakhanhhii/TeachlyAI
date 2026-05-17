import { expect, test } from "@playwright/test";
import { E2E_AUTH_TOKEN, E2E_AUTH_USER } from "./_authSetup.js";

const FLOWS = ["fullset", "slide", "quiz", "flashcard"];
const FAST_FLOW_TIMEOUT_MS = 3000;

for (const flow of FLOWS) {
  test(`main hub ${flow} card renders the chat flow without waiting for account state`, async ({ page }) => {
    await page.addInitScript(
      ({ user, token }) => {
        window.localStorage.setItem("teachly_auth_token_v1", token);
        window.localStorage.setItem("teachly_auth_user_cache_v1", JSON.stringify(user));
        window.localStorage.setItem("teachly_auto_mode_v1", JSON.stringify({
          enabled: false,
          neverAskChoice: "custom",
        }));
      },
      { user: E2E_AUTH_USER, token: E2E_AUTH_TOKEN },
    );

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: E2E_AUTH_USER }),
      }),
    );

    await page.route("**/api/auth/state", async (route) => {
      if (route.request().method() === "GET") {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [], activeSessionIndex: 0, updatedAt: null }),
      });
    });

    await page.goto("/main_hub.html");
    await expect(page.locator(`a[href="chatbot_ui.html?flow=${flow}"]`)).toBeVisible();

    await page.locator(`a[href="chatbot_ui.html?flow=${flow}"]`).click();

    await expect(page).toHaveURL(new RegExp(`chatbot_ui\\.html\\?flow=${flow}$`));
    await expect(
      page.getByText("Chào bạn! Bạn đã có tài liệu sẵn chưa hay muốn tôi tự biên soạn theo chủ đề?"),
    ).toBeVisible({ timeout: FAST_FLOW_TIMEOUT_MS });
  });
}

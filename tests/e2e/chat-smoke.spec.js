import { expect, test } from "@playwright/test";

test("main hub navigates into chatbot ui", async ({ page }) => {
  await page.goto("/main_hub.html");

  await expect(page.locator('a[href="chatbot_ui.html?flow=slide"]')).toBeVisible();
  await page.locator('a[href="chatbot_ui.html?flow=slide"]').click();

  await expect(page).toHaveURL(/chatbot_ui\.html\?flow=slide$/);
});

test("chat ui submits a mocked prompt and renders the response", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        thread_id: "thread-playwright",
        reply: "Phan hoi tu Playwright mock",
      }),
    });
  });

  await page.route("**/api/sessions/*/messages*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        thread_id: "thread-playwright",
        limit: 20,
        offset: 0,
        total: 0,
        has_more: false,
        messages: [],
      }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("teachly_active_session", "0");
    window.localStorage.setItem("teachly_sessions", JSON.stringify([
      {
        sessionId: "session-playwright",
        title: "Đoạn chat smoke",
        thread_id: "",
        messages: [
          {
            role: "bot",
            text: "San sang nhan prompt",
          },
        ],
        messagesLoaded: true,
        hasMoreRemote: false,
        remoteOffset: 1,
        pinned: false,
        experienceState: null,
      },
    ]));
  });

  await page.goto("/chatbot_ui.html");
  await expect(page.locator("#input")).toBeVisible();
  await page.fill("#input", "Xin chao tu Playwright");
  await page.click("#send");

  await expect(page.getByText("Xin chao tu Playwright")).toBeVisible();
  await expect(page.getByText("Phan hoi tu Playwright mock")).toBeVisible();
});

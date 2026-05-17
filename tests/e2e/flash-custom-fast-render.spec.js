import { expect, test } from "@playwright/test";
import { installAuthBypass } from "./_authSetup.js";

const FLASH_MOCK_NO_PHONETIC = {
  title: "Fast flash mock",
  cards: [
    { id: "c1", front: "preserve", back: "bảo tồn, giữ gìn" },
    { id: "c2", front: "maintain", back: "duy trì" },
    { id: "c3", front: "impact", back: "tác động" },
  ],
};

test.beforeEach(async ({ page }) => {
  await installAuthBypass(page);
  await page.route("**/api/ai-generate", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ detail: "force mock fallback" }),
    }),
  );
  await page.route("**/api/mock/flashcard", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(FLASH_MOCK_NO_PHONETIC),
    }),
  );
  await page.route("**/api/flash/pronunciations", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pronunciations: { preserve: "/prɪˈzɜːv/" } }),
    });
  });
});

test("flash topic form renders mock cards before pronunciation lookup finishes", async ({ page }) => {
  await page.goto("/chatbot_ui.html?flow=flashcard&mode=custom");
  await page.getByRole("button", { name: "Nhập chủ đề trực tiếp" }).click();
  await page.locator(".flow-card textarea").first().fill("Environment vocabulary");
  await page.getByRole("button", { name: "Gửi thông tin" }).click();

  await expect(page.locator(".flash-card")).toBeVisible({ timeout: 1200 });
});

test("flash direct-vocab form renders cards before pronunciation lookup finishes", async ({ page }) => {
  await page.goto("/chatbot_ui.html?flow=flashcard&mode=custom");
  await page.getByRole("button", { name: "Nhập từ vựng trực tiếp" }).click();
  await page.locator(".flow-vocab-syntax-ta").fill("preserve: bảo tồn, giữ gìn\nmaintain: duy trì");
  await page.getByRole("button", { name: "Tạo flashcard" }).click();

  await expect(page.locator(".flash-card")).toBeVisible({ timeout: 1200 });
  await expect(page.locator(".flash-card .flash-front-term").first()).toContainText("Preserve");
});

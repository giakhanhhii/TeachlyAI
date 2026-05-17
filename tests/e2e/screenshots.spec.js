import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SHOT_DIR = path.join(process.cwd(), "tests", "e2e", "screenshots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

const shot = (page, name) => page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true });

function mockAuthState(page, user = null) {
  page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: user ? 200 : 401, contentType: "application/json", body: JSON.stringify({ user }) }),
  );
  page.route("**/api/auth/state", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: [], activeSession: 0, updatedAt: null }),
    }),
  );
  page.route("**/api/sessions*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ sessions: [] }) }),
  );
  page.route("**/api/sessions/*/messages*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ thread_id: "thread-shot", limit: 20, offset: 0, total: 0, has_more: false, messages: [] }),
    }),
  );
}

test.describe("screenshots", () => {
  test("01 main hub (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/main_hub.html");
    await page.waitForLoadState("networkidle");
    await shot(page, "01-main-hub-desktop");
  });

  test("02 main hub (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/main_hub.html");
    await page.waitForLoadState("networkidle");
    await shot(page, "02-main-hub-mobile");
  });

  test("03 chatbot landing (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    mockAuthState(page, null);
    await page.goto("/chatbot_ui.html");
    await page.waitForLoadState("networkidle");
    await shot(page, "03-chatbot-landing-desktop");
  });

  test("04 chatbot with sample conversation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    mockAuthState(page, null);
    await page.addInitScript(() => {
      window.localStorage.setItem("teachly_active_session", "0");
      window.localStorage.setItem(
        "teachly_sessions",
        JSON.stringify([
          {
            sessionId: "shot-1",
            title: "Demo screenshot",
            thread_id: "",
            messages: [
              { role: "bot", text: "Chào bạn! Bạn muốn học gì hôm nay?" },
              { role: "user", text: "Tôi muốn ôn ngữ pháp thì hiện tại hoàn thành." },
              { role: "bot", text: "Tuyệt! Hãy chọn một định dạng học bên dưới nhé." },
            ],
            messagesLoaded: true,
            hasMoreRemote: false,
            remoteOffset: 3,
            pinned: false,
            experienceState: null,
          },
        ]),
      );
    });
    await page.goto("/chatbot_ui.html");
    await page.waitForLoadState("networkidle");
    await shot(page, "04-chatbot-conversation");
  });

  test("05 flow form slide (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    mockAuthState(page, null);
    await page.goto("/chatbot_ui.html?flow=slide");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, "05-flow-slide-form-mobile");
  });

  test("06 flow form quiz (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    mockAuthState(page, null);
    await page.goto("/chatbot_ui.html?flow=quiz");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, "06-flow-quiz-form-mobile");
  });

  test("07 chatbot UI mobile (sidebar collapsed)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    mockAuthState(page, null);
    await page.goto("/chatbot_ui.html");
    await page.waitForLoadState("networkidle");
    await shot(page, "07-chatbot-mobile");
  });
});

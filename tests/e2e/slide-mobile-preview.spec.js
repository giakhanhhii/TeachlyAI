import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 393, height: 852 },
];

async function openSlideExperience(page) {
  await page.route("**/api/sessions/*/messages*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        thread_id: "",
        limit: 20,
        offset: 0,
        total: 0,
        has_more: false,
        messages: [],
      }),
    });
  });

  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto("/chatbot_ui.html?flow=slide");
  await page.getByRole("button", { name: "Nhập chủ đề trực tiếp", exact: true }).click();
  await page.getByRole("button", { name: "Tự động điền dữ liệu mẫu (AI)" }).click();
  await page.getByRole("button", { name: "Gửi thông tin", exact: true }).click();

  const experienceLayer = page.locator("#experienceLayer");
  await expect(experienceLayer).toHaveClass(/visible/);
  await expect(experienceLayer.locator(".exp-slide-shell-frame").first()).toBeVisible();
  await expect(experienceLayer.locator('iframe[title="Slide deck"]').first()).toBeVisible();
}

async function expectSlideLayoutVisible(page, viewport) {
  const experienceLayer = page.locator("#experienceLayer");
  const frame = experienceLayer.locator(".exp-slide-shell-frame").first();
  const iframe = experienceLayer.locator('iframe[title="Slide deck"]').first();
  const footer = experienceLayer.locator(".exp-footer-bar").first();

  await expect
    .poll(async () =>
      iframe.evaluate((node) => {
        const style = window.getComputedStyle(node);
        return {
          width: style.width,
          position: style.position,
          transform: style.transform,
        };
      }),
    )
    .toMatchObject({
      width: "1600px",
      position: "absolute",
    });

  const shellMetrics = await iframe.evaluate((node) => ({
    viewportWidth: node.contentWindow?.innerWidth || 0,
    documentWidth: node.contentDocument?.documentElement?.clientWidth || 0,
    bodyWidth: Math.round(node.contentDocument?.body?.getBoundingClientRect().width || 0),
    masterWidth: Math.round(node.contentDocument?.querySelector("#slides-master-container")?.getBoundingClientRect().width || 0),
  }));
  expect(shellMetrics.viewportWidth).toBe(1600);
  expect(shellMetrics.documentWidth).toBe(1600);
  expect(shellMetrics.bodyWidth).toBeGreaterThanOrEqual(1598);
  expect(shellMetrics.masterWidth).toBeGreaterThanOrEqual(1598);

  const slideWidth = await page
    .locator("#experienceLayer")
    .frameLocator('iframe[title="Slide deck"]')
    .locator(".shell-slide-instance.active")
    .first()
    .evaluate((node) => Math.round(node.getBoundingClientRect().width));
  expect(slideWidth).toBeGreaterThanOrEqual(1250);
  expect(slideWidth).toBeLessThanOrEqual(1280);

  await expect
    .poll(async () => {
      const frameBox = await frame.boundingBox();
      const footerBox = await footer.boundingBox();
      if (!frameBox || !footerBox) return false;
      return frameBox.height > 20 && frameBox.y + frameBox.height <= footerBox.y + 1 && footerBox.y + footerBox.height <= viewport.height + 1;
    })
    .toBe(true);

  const frameBox = await frame.boundingBox();
  const footerBox = await footer.boundingBox();
  expect(frameBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(frameBox.height).toBeGreaterThan(20);
  expect(frameBox.y + frameBox.height).toBeLessThanOrEqual(footerBox.y + 1);
  expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(viewport.height + 1);
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`mobile slide preview ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("fits the active slide by height and keeps navigation visible", async ({ page }) => {
      await openSlideExperience(page);
      await expectSlideLayoutVisible(page, viewport);

      await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
      await expectSlideLayoutVisible(page, viewport);
    });
  });
}

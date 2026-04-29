import { expect, test } from "@playwright/test";

async function stubSessionMessageFetch(page) {
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
}

async function resetChatStorage(page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
}

async function openTopicForm(page, flowKind) {
  await stubSessionMessageFetch(page);
  await resetChatStorage(page);
  await page.goto(`/chatbot_ui.html?flow=${flowKind}`);
  await page.getByRole("button", { name: "Nhập chủ đề trực tiếp", exact: true }).click();
  await expect(page.locator(".flow-card")).toBeVisible();
}

async function readTemplateOptions(page) {
  return page.locator(".flow-select--template option").evaluateAll((options) =>
    options
      .filter((option) => option.value)
      .map((option) => ({
        value: option.value,
        label: option.textContent?.trim() || "",
      })),
  );
}

async function expectDropdownMenuInsideCard(page, selectWrapLocator) {
  const cardBox = await page.locator(".flow-card").first().boundingBox();
  const trigger = selectWrapLocator.locator(".flow-mobile-select-btn");
  await trigger.click();
  const menuBox = await selectWrapLocator.locator(".flow-mobile-select-menu").boundingBox();
  expect(cardBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(menuBox.x).toBeGreaterThanOrEqual(cardBox.x - 1);
  expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
  await trigger.click();
}

test("desktop slide form keeps full template labels", async ({ page }) => {
  await openTopicForm(page, "slide");

  const options = await readTemplateOptions(page);
  expect(options).toContainEqual({
    value: "Chuyên nghiệp (đa sắc)",
    label: "Chuyên nghiệp (đa sắc)",
  });
  expect(options).toContainEqual({
    value: "Vũ trụ tối (Huyền bí)",
    label: "Vũ trụ tối (Huyền bí)",
  });
});

test.describe("mobile template selects", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("slide form uses compact labels and keeps the select inside the card", async ({ page }) => {
    await openTopicForm(page, "slide");

    const options = await readTemplateOptions(page);
    expect(options).toContainEqual({
      value: "Chuyên nghiệp (đa sắc)",
      label: "Chuyên nghiệp",
    });
    expect(options).toContainEqual({
      value: "Vũ trụ tối (Huyền bí)",
      label: "Vũ trụ tối",
    });

    await expect(page.locator(".msg-flow-card-shell-wide")).toHaveCount(1);
    const templateWrap = page.locator(".flow-mobile-select").filter({ has: page.locator(".flow-select--template") });
    await expectDropdownMenuInsideCard(page, templateWrap);
  });

  test("full set form gets the same wide mobile template-select treatment", async ({ page }) => {
    await openTopicForm(page, "fullset");

    const options = await readTemplateOptions(page);
    expect(options).toContainEqual({
      value: "Tối giản (Học thuật)",
      label: "Tối giản",
    });
    expect(options).toContainEqual({
      value: "Vui tươi (Thân thiện)",
      label: "Vui tươi",
    });

    await expect(page.locator(".msg-flow-card-shell-wide")).toHaveCount(1);
    const mobileSelects = page.locator(".flow-mobile-select");
    await expect(mobileSelects).toHaveCount(2);
    await expectDropdownMenuInsideCard(page, mobileSelects.nth(0));

    const templateWrap = mobileSelects.filter({ has: page.locator(".flow-select--template") });
    await expectDropdownMenuInsideCard(page, templateWrap);
  });

  test("quiz form level dropdown also stays inside the mobile form card", async ({ page }) => {
    await openTopicForm(page, "quiz");

    const levelWrap = page.locator(".flow-mobile-select").first();
    await expectDropdownMenuInsideCard(page, levelWrap);
  });
});

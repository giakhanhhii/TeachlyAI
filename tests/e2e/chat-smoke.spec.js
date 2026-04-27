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

test("restored THPTQG result can return to chat without browser history", async ({ page }) => {
  const resumeState = {
    kind: "thptqg_fulltest",
    view: "result",
    testId: "thptqg-simulation-test-1",
    answersByQuestion: { q1: 0, q2: 1 },
    flaggedQuestions: [],
    currentPartId: "part-1",
    currentQuestion: "q1",
    startedAt: "2026-04-27T10:00:00.000Z",
    elapsedSeconds: 120,
    submittedAt: "2026-04-27T10:02:00.000Z",
    reviewMode: true,
    activeResultPartId: "overview",
    detailQuestionId: "",
  };
  const resume = {
    kind: "thptqg_fulltest",
    meta: {
      catalogTitle: "THPTQG simulation tests",
      testId: "thptqg-simulation-test-1",
      testTitle: "THPTQG simulation test 1",
      source: "mockdata_40.md",
      __experienceId: "exp-thptqg-result",
    },
    experienceId: "exp-thptqg-result",
    title: "Full đề THPTQG — THPTQG simulation test 1",
    openedAt: "2026-04-27T10:02:00.000Z",
    resumeState,
  };

  await page.addInitScript(({ resume, resumeState }) => {
    window.localStorage.setItem("teachly_active_session", "0");
    window.localStorage.setItem("teachly_sessions", JSON.stringify([
      {
        sessionId: "session-thptqg-result",
        title: "Full đề THPTQG",
        thread_id: "",
        messages: [],
        messagesLoaded: true,
        hasMoreRemote: false,
        remoteOffset: 0,
        pinned: false,
        experienceState: {
          kind: "thptqg_fulltest",
          meta: resume.meta,
          progress: resumeState,
          completed: true,
          activeExperienceId: resume.experienceId,
          historyById: {
            [resume.experienceId]: {
              experienceId: resume.experienceId,
              kind: "thptqg_fulltest",
              meta: resume.meta,
              progress: resumeState,
              completed: true,
              updatedAt: "2026-04-27T10:02:00.000Z",
            },
          },
          resume,
        },
      },
    ]));
  }, { resume, resumeState });

  await page.goto("/chatbot_ui.html");

  await expect(page.getByText("Trạng thái: Đã nộp bài")).toBeVisible();
  await expect(page.locator("#experienceLayer")).toHaveClass(/visible/);

  await page.getByRole("button", { name: "Quay lại chat" }).click();

  await expect(page.locator("#experienceLayer")).not.toHaveClass(/visible/);
  await expect(page.getByRole("button", { name: "Tạo quiz" })).toBeVisible();
});

test("selecting a chat with saved THPTQG result stays in chat phase", async ({ page }) => {
  const resumeState = {
    kind: "thptqg_fulltest",
    view: "result",
    testId: "thptqg-simulation-test-1",
    answersByQuestion: { q1: 0, q2: 1 },
    flaggedQuestions: [],
    currentPartId: "part-1",
    currentQuestion: "q1",
    startedAt: "2026-04-27T10:00:00.000Z",
    elapsedSeconds: 120,
    submittedAt: "2026-04-27T10:02:00.000Z",
    reviewMode: true,
    activeResultPartId: "overview",
    detailQuestionId: "",
  };
  const resume = {
    kind: "thptqg_fulltest",
    meta: {
      catalogTitle: "THPTQG simulation tests",
      testId: "thptqg-simulation-test-1",
      testTitle: "THPTQG simulation test 1",
      source: "mockdata_40.md",
      __experienceId: "exp-thptqg-sidebar",
    },
    experienceId: "exp-thptqg-sidebar",
    title: "Full đề THPTQG — THPTQG simulation test 1",
    openedAt: "2026-04-27T10:02:00.000Z",
    resumeState,
  };

  await page.addInitScript(({ resume, resumeState }) => {
    window.localStorage.setItem("teachly_active_session", "0");
    window.localStorage.setItem("teachly_sessions", JSON.stringify([
      {
        sessionId: "session-chat",
        title: "Đoạn chat thường",
        thread_id: "",
        messages: [{ role: "bot", text: "Chat đang mở" }],
        messagesLoaded: true,
        hasMoreRemote: false,
        remoteOffset: 1,
        pinned: false,
        experienceState: null,
      },
      {
        sessionId: "session-thptqg-sidebar",
        title: "Quiz đã nộp",
        thread_id: "",
        messages: [],
        messagesLoaded: true,
        hasMoreRemote: false,
        remoteOffset: 0,
        pinned: false,
        experienceState: {
          kind: "thptqg_fulltest",
          meta: resume.meta,
          progress: resumeState,
          completed: true,
          activeExperienceId: resume.experienceId,
          historyById: {
            [resume.experienceId]: {
              experienceId: resume.experienceId,
              kind: "thptqg_fulltest",
              meta: resume.meta,
              progress: resumeState,
              completed: true,
              updatedAt: "2026-04-27T10:02:00.000Z",
            },
          },
          resume,
        },
      },
    ]));
  }, { resume, resumeState });

  await page.goto("/chatbot_ui.html");
  await expect(page.getByText("Chat đang mở")).toBeVisible();

  await page.getByRole("button", { name: "Quiz đã nộp", exact: true }).click();

  await expect(page.locator("#experienceLayer")).not.toHaveClass(/visible/);
  await expect(page.getByText("Trạng thái: Đã nộp bài")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Mở" })).toBeVisible();
});

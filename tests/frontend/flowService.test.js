import { describe, expect, it, vi } from "vitest";

import { createFlowService } from "../../frontend/js/chatbot/services/flowService.js";

describe("createFlowService", () => {
  it("handles main-hub URL flow without waiting for old session messages", async () => {
    const calls = [];
    const sessions = [
      {
        title: "Đoạn chat 1",
        thread_id: "thread-old",
        messages: [{ role: "bot", text: "old" }],
        experienceState: { kind: "quiz" },
      },
    ];
    let activeIndex = 0;

    const service = createFlowService({
      getSessionsSnapshot: () => sessions,
      persistActiveExperience: vi.fn(() => calls.push("persist")),
      getCurrentSession: () => sessions[activeIndex],
      setCurrentExperienceState: (next) => {
        sessions[activeIndex].experienceState = next;
      },
      createSession: vi.fn(() => {
        sessions.push({ title: "Đoạn chat 2", messages: [] });
        activeIndex = sessions.length - 1;
        calls.push("create");
        return activeIndex;
      }),
      setActiveSessionIndex: (idx) => {
        activeIndex = idx;
      },
      saveSessions: vi.fn(() => calls.push("save")),
      renderChatListUI: vi.fn(() => calls.push("render-list")),
      renderMessages: vi.fn(() => calls.push("render-messages")),
      restoreCurrentSessionExperience: vi.fn(),
      computeStartFlow: vi.fn((flowKind) => ({
        guided: { kind: flowKind, step: "await_source" },
        effects: [{ type: "pushBot", text: "start" }],
      })),
      applyEffects: vi.fn(async () => {
        calls.push("effects");
      }),
      setStartupUiState: vi.fn(() => calls.push("startup-off")),
      clearMessages: vi.fn(() => calls.push("clear")),
      renderLoadMoreControl: vi.fn(() => calls.push("load-more")),
      updateThreadLabel: vi.fn(() => calls.push("title")),
      setGuided: vi.fn(() => calls.push("guided")),
      resetResumeState: vi.fn(() => calls.push("reset")),
      hideLayer: vi.fn(() => calls.push("hide")),
      commitNavigationSnapshot: vi.fn(() => calls.push("history")),
      ensureSessionMessagesLoaded: vi.fn(async () => {
        calls.push("load-old-messages");
      }),
    });

    await service.handleFlowEntry("quiz");

    expect(calls).not.toContain("load-old-messages");
    expect(calls.indexOf("effects")).toBeGreaterThan(-1);
    expect(sessions[activeIndex].title).toBe("Quiz 1");
  });
});

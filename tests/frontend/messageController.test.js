import { describe, expect, it, vi } from "vitest";

import { createMessageController } from "../../frontend/js/chatbot/controllers/messageController.js";

function buildController(sessionOverrides = {}) {
  const session = {
    messages: [],
    remoteOffset: 0,
    thread_id: "",
    ...sessionOverrides,
  };
  const addMessage = vi.fn();
  const rerenderMessages = vi.fn();
  const saveSessions = vi.fn();
  const onConversationMutation = vi.fn();
  const controller = createMessageController({
    getCurrentSession: () => session,
    saveSessions,
    getMessageView: () => ({
      addMessage,
      addThinkingBubble: vi.fn(() => ({ row: { remove: vi.fn() } })),
      streamBotReply: vi.fn(),
    }),
    postChat: vi.fn(),
    apiUrl: "http://example.test",
    sendBtn: /** @type {any} */ ({ disabled: false, textContent: "Send", dataset: {} }),
    inputEl: /** @type {any} */ ({ disabled: false, value: "" }),
    onConversationMutation,
    rerenderMessages,
  });
  return { controller, session, addMessage, rerenderMessages, saveSessions, onConversationMutation };
}

describe("messageController", () => {
  it("rerenders instead of appending when the first bot resume card returns to an empty chat", () => {
    const { controller, session, addMessage, rerenderMessages } = buildController();

    controller.pushBot("Ban muon tiep tuc theo cach nao?", {
      resumeDock: {
        title: "Full Set",
        fullsetMixed: { topic: "Environment", slides: "5", quiz: "10", flash: "5" },
        items: [],
      },
    });

    expect(session.messages).toHaveLength(1);
    expect(rerenderMessages).toHaveBeenCalledTimes(1);
    expect(addMessage).not.toHaveBeenCalled();
  });

  it("appends directly when the conversation already has messages", () => {
    const { controller, addMessage, rerenderMessages } = buildController({
      messages: [{ role: "user", text: "hello" }],
    });

    controller.pushBot("reply");

    expect(rerenderMessages).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith("bot", "reply", {
      actions: [],
      cardType: undefined,
      resumeDock: undefined,
      cardProps: undefined,
    });
  });

  it("removes upload-attempt messages for a rejected experience id", () => {
    const { controller, session, rerenderMessages } = buildController({
      messages: [{ role: "user", text: "hello" }],
    });

    controller.pushUser("Đã chọn tệp PDF: very-long.pdf", { experienceId: "exp-too-long" });
    controller.pushBot("Bạn muốn tiếp tục theo cách nào?", {
      experienceId: "exp-too-long",
      resumeDock: {
        kind: "slide",
        experienceId: "exp-too-long",
        title: "Slide bài giảng",
        meta: { topic: "very-long.pdf", __experienceId: "exp-too-long" },
      },
    });
    controller.pushBot("reply khác");

    const removed = controller.removeMessagesByExperienceId("exp-too-long");

    expect(removed).toBe(true);
    expect(session.messages).toEqual([
      { role: "user", text: "hello" },
      { role: "bot", text: "reply khác" },
    ]);
    expect(rerenderMessages).toHaveBeenCalled();
  });
});

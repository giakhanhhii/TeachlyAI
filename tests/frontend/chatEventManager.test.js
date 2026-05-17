import { afterEach, describe, expect, it, vi } from "vitest";

import { setupChatEventManager } from "../../frontend/js/chatbot/dom/chatEventManager.js";

function setupDom() {
  document.body.innerHTML = `
    <form id="form"><input id="input" /><button id="send">Send</button></form>
    <button id="newChatBtn"></button>
    <div id="messages"><div id="messagesInner"></div></div>
    <div id="threadLabel"></div>
    <div id="chatList"></div>
    <div id="chatPhase"></div>
    <div id="experienceLayer"></div>
    <div id="experienceBody"></div>
  `;
}

function buildDeps(overrides = {}) {
  return {
    form: /** @type {HTMLFormElement} */ (document.getElementById("form")),
    input: /** @type {HTMLInputElement} */ (document.getElementById("input")),
    newChatBtn: /** @type {HTMLButtonElement} */ (document.getElementById("newChatBtn")),
    getIsSending: () => false,
    setSendingState: vi.fn(),
    getGuided: () => null,
    onGuidedPrompt: vi.fn(),
    onSendPrompt: vi.fn(),
    onCreateNewChat: vi.fn(),
    hasLastOpenedExperience: () => false,
    hideLayer: vi.fn(),
    persistActiveExperience: vi.fn(),
    pushResumeDockFromLastOpened: vi.fn(),
    scrollToResumeDock: vi.fn(),
    ensureSessions: vi.fn(),
    ensureHistoryBaseState: vi.fn(),
    renderChatListUI: vi.fn(),
    ensureSessionMessagesLoaded: vi.fn(async () => {}),
    renderMessages: vi.fn(),
    handleFlowEntry: vi.fn(async () => {}),
    restoreCurrentSessionExperience: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("setupChatEventManager", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  it("starts URL flow before loading old session messages", async () => {
    setupDom();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    history.replaceState(null, "", "/chatbot_ui.html?flow=fullset&mode=auto");
    const calls = [];
    const deps = buildDeps({
      ensureSessionMessagesLoaded: vi.fn(async () => {
        calls.push("load");
      }),
      renderMessages: vi.fn(() => {
        calls.push("render");
      }),
      handleFlowEntry: vi.fn(async (flowKind, opts) => {
        calls.push("flow");
        expect(flowKind).toBe("fullset");
        expect(opts).toEqual({ mode: "auto" });
      }),
    });

    setupChatEventManager(deps);
    await Promise.resolve();
    await Promise.resolve();

    expect(calls).toEqual(["flow"]);
    expect(deps.ensureSessionMessagesLoaded).not.toHaveBeenCalled();
    expect(deps.renderMessages).not.toHaveBeenCalled();
  });
});

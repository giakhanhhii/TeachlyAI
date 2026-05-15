import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SESSIONS_KEY = "teachly_sessions";
const ACTIVE_SESSION_KEY = "teachly_active_session";

async function importSessionStore() {
  vi.resetModules();
  return import("../../frontend/js/chatbot/sessionStore.js");
}

describe("sessionStore.js", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.stubGlobal("requestIdleCallback", (callback) => callback());
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("creates a default session when storage is empty", async () => {
    const store = await importSessionStore();

    store.ensureSessions();
    const current = store.getCurrentSession();

    expect(current.title).toBe("Đoạn chat 1");
    expect(current.thread_id).toBe("");
    expect(Array.isArray(current.messages)).toBe(true);
    expect(typeof current.sessionId).toBe("string");
    expect(current.sessionId.length).toBeGreaterThan(0);
  });

  it("restores sessions from localStorage on import", async () => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([
      {
        sessionId: "session-a",
        title: "Saved session",
        thread_id: "thread-a",
        messages: [{ role: "user", text: "hello" }],
        messagesLoaded: true,
        hasMoreRemote: false,
        remoteOffset: 1,
        pinned: true,
        experienceState: null,
      },
    ]));
    localStorage.setItem(ACTIVE_SESSION_KEY, "0");

    const store = await importSessionStore();
    const current = store.getCurrentSession();

    expect(current.sessionId).toBe("session-a");
    expect(current.title).toBe("Saved session");
    expect(current.thread_id).toBe("thread-a");
    expect(current.pinned).toBe(true);
  });

  it("persists sessions and active index back to localStorage", async () => {
    const store = await importSessionStore();

    store.ensureSessions();
    store.createSession({ title: "New Session" });
    store.saveSessions();

    const savedSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    const savedActiveIndex = localStorage.getItem(ACTIVE_SESSION_KEY);

    expect(savedSessions).toHaveLength(2);
    expect(savedSessions[1].title).toBe("New Session");
    expect(savedActiveIndex).toBe("1");
  });

  it("deletes only unpinned sessions and keeps the pinned active session", async () => {
    const store = await importSessionStore();

    store.ensureSessions();
    const firstSessionId = store.getCurrentSession().sessionId;
    store.createSession({ title: "Pinned session" });
    const pinnedIndex = store.getActiveSessionIndex();
    store.togglePinSession(pinnedIndex);
    store.createSession({ title: "Draft session" });
    store.setActiveSessionIndex(pinnedIndex);

    const result = store.deleteUnpinnedSessions();
    const sessions = store.getSessionsSnapshot();

    expect(result).toEqual({
      deletedCount: 2,
      activeSessionRemoved: false,
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe("Pinned session");
    expect(sessions[0].pinned).toBe(true);
    expect(store.getCurrentSession().sessionId).not.toBe(firstSessionId);
    expect(store.getCurrentSession().title).toBe("Pinned session");
  });

  it("creates a fresh default session when all sessions are unpinned", async () => {
    const store = await importSessionStore();

    store.ensureSessions();
    store.createSession({ title: "Another draft" });

    const result = store.deleteUnpinnedSessions();
    const sessions = store.getSessionsSnapshot();

    expect(result).toEqual({
      deletedCount: 2,
      activeSessionRemoved: true,
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe("Đoạn chat 1");
    expect(sessions[0].pinned).toBe(false);
  });
});

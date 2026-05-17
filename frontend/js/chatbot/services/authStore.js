import { getApiOrigin } from "../config.js";
import { LS_AUTH_TOKEN, LS_AUTH_USER_CACHE } from "../constants.js";

const listeners = new Set();
let currentUser = safeReadJson(LS_AUTH_USER_CACHE, null);
let authToken = safeReadToken();
let hydrationPromise = null;
let beforeLogoutHandler = null;

function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeReadToken() {
  try {
    return String(localStorage.getItem(LS_AUTH_TOKEN) || "").trim();
  } catch {
    return "";
  }
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") return null;
  const username = String(user.username || "").trim();
  const displayName = String(user.displayName || username).trim();
  const profileLabel = String(user.profileLabel || "Pro").trim();
  if (!username) return null;
  return {
    username,
    displayName: displayName || username,
    profileLabel: profileLabel || "Pro",
    avatarText: String(user.avatarText || displayName || username).trim().slice(0, 1).toUpperCase() || "U",
  };
}

function persistAuthState() {
  try {
    if (authToken) localStorage.setItem(LS_AUTH_TOKEN, authToken);
    else localStorage.removeItem(LS_AUTH_TOKEN);
    if (currentUser) localStorage.setItem(LS_AUTH_USER_CACHE, JSON.stringify(currentUser));
    else localStorage.removeItem(LS_AUTH_USER_CACHE);
  } catch {
    // Ignore storage write failures and keep memory state alive.
  }
}

function emitAuthChange() {
  listeners.forEach((listener) => {
    try {
      listener(currentUser);
    } catch {
      // Ignore subscriber failures.
    }
  });
}

function setAuthState({ token = "", user = null } = {}) {
  authToken = String(token || "").trim();
  currentUser = normalizeUser(user);
  persistAuthState();
  emitAuthChange();
  return currentUser;
}

export function getCurrentAuthUser() {
  if (!currentUser) {
    const cachedToken = safeReadToken();
    const cachedUser = normalizeUser(safeReadJson(LS_AUTH_USER_CACHE, null));
    if (cachedToken && cachedUser) {
      authToken = cachedToken;
      currentUser = cachedUser;
    }
  }
  return currentUser;
}

export function getAuthToken() {
  if (!authToken) authToken = safeReadToken();
  return authToken;
}

export function isAuthenticated() {
  return Boolean(currentUser && authToken);
}

export function subscribeAuth(listener) {
  if (typeof listener !== "function") return () => {};
  listeners.add(listener);
  listener(currentUser);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return headers;
}

export function clearAuthState() {
  setAuthState({ token: "", user: null });
}

export function setBeforeLogoutHandler(handler) {
  beforeLogoutHandler = typeof handler === "function" ? handler : null;
}

export function handleUnauthorizedResponse() {
  clearAuthState();
}

async function parseJsonResponse(res) {
  return res.json().catch(() => ({}));
}

async function authFetch(path, init = {}) {
  const res = await fetch(`${getApiOrigin()}${path}`, init);
  const data = await parseJsonResponse(res);
  if (res.status === 401) {
    handleUnauthorizedResponse();
  }
  if (!res.ok) {
    const err = new Error(data.detail || "Lỗi xác thực");
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function hydrateAuthState(force = false) {
  if (!force && hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    if (!authToken) {
      clearAuthState();
      return null;
    }
    try {
      const data = await authFetch("/api/auth/me", {
        headers: getAuthHeaders(),
      });
      return setAuthState({ token: authToken, user: data.user });
    } catch (err) {
      // 401 đã được handleUnauthorizedResponse() trong authFetch xử lý (clear cache).
      // Các failure khác (network blip, 5xx, timeout) — giữ nguyên cached user
      // để không "đá" user về lại màn login chỉ vì sự cố tạm thời.
      return currentUser;
    } finally {
      hydrationPromise = null;
    }
  })();
  return hydrationPromise;
}

export async function registerLocalAccount({ username, password, confirmPassword }) {
  const safeUsername = String(username || "").trim();
  const safePassword = String(password || "");
  const safeConfirmPassword = String(confirmPassword || "");
  if (!safeUsername) return { ok: false, error: "Vui lòng nhập tên đăng nhập." };
  if (!safePassword) return { ok: false, error: "Vui lòng nhập mật khẩu." };
  if (safePassword !== safeConfirmPassword) return { ok: false, error: "Hai mật khẩu phải giống nhau." };
  try {
    const data = await authFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: safeUsername, password: safePassword }),
    });
    return { ok: true, user: normalizeUser(data.user) };
  } catch (err) {
    return { ok: false, error: err.message || "Không thể đăng ký." };
  }
}

export async function loginLocalAccount({ username, password }) {
  const safeUsername = String(username || "").trim();
  const safePassword = String(password || "");
  if (!safeUsername || !safePassword) {
    return { ok: false, error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." };
  }
  try {
    const data = await authFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: safeUsername, password: safePassword }),
    });
    return { ok: true, user: setAuthState({ token: data.token, user: data.user }) };
  } catch (err) {
    return { ok: false, error: err.message || "Không thể đăng nhập." };
  }
}

export async function logoutCurrentUser() {
  const tokenBeforeLogout = authToken;
  if (typeof beforeLogoutHandler === "function") {
    try {
      await Promise.resolve(beforeLogoutHandler());
    } catch {
      // Continue logout even if the pre-logout sync fails.
    }
  }
  clearAuthState();
  if (!tokenBeforeLogout) return;
  try {
    await fetch(`${getApiOrigin()}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenBeforeLogout}`,
      },
    });
  } catch {
    // Logout should still complete locally if backend is unavailable.
  }
}

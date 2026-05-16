import { logoutCurrentUser, subscribeAuth } from "../services/authStore.js";
import { showAuthDialog } from "./authDialog.js";

function createActionButton(label, tone, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `auth-inline-btn${tone ? ` auth-inline-btn--${tone}` : ""}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderTopAuthState(container, user, authenticatedView = "empty") {
  if (!(container instanceof HTMLElement)) return;
  container.innerHTML = "";
  if (user) {
    if (authenticatedView === "chip") {
      const chip = document.createElement("div");
      chip.className = "auth-user-chip";
      chip.innerHTML = `
        <span class="auth-user-chip-avatar" aria-hidden="true">${user.avatarText}</span>
        <span class="auth-user-chip-copy">
          <strong>${user.displayName}</strong>
          <span>${user.profileLabel}</span>
        </span>
      `;
      container.appendChild(chip);
    }
    container.hidden = authenticatedView === "empty";
    return;
  }
  container.hidden = false;
  container.append(
    createActionButton("Đăng nhập", "ghost", () => {
      void showAuthDialog({
        initialMode: "login",
        title: "Đăng nhập để tiếp tục",
        subtitle: "Đăng nhập trước khi mở bài giảng hoặc quản lý hồ sơ học tập.",
      });
    }),
    createActionButton("Đăng ký", "primary", () => {
      void showAuthDialog({
        initialMode: "register",
        title: "Tạo tài khoản Teachly",
        subtitle: "Đăng ký nhanh với tên đăng nhập và mật khẩu để dùng lại cho lần sau.",
      });
    }),
  );
}

function renderSidebarUserState(deps, user) {
  const { avatarEl, nameEl, subtitleEl, logoutBtn } = deps;
  if (avatarEl instanceof HTMLElement) {
    avatarEl.textContent = user?.avatarText || "K";
  }
  if (nameEl instanceof HTMLElement) {
    nameEl.textContent = user?.displayName || "Khách";
  }
  if (subtitleEl instanceof HTMLElement) {
    subtitleEl.textContent = user?.profileLabel || "Đăng nhập để mở bài giảng";
  }
  if (logoutBtn instanceof HTMLButtonElement) {
    logoutBtn.hidden = !user;
  }
}

/**
 * @param {{
 *   topAuthContainer?: HTMLElement | null,
 *   sidebarAvatarEl?: HTMLElement | null,
 *   sidebarNameEl?: HTMLElement | null,
 *   sidebarSubtitleEl?: HTMLElement | null,
 *   sidebarLogoutBtn?: HTMLButtonElement | null,
 * }} deps
 */
export function bindChatAuthChrome(deps) {
  const {
    topAuthContainer,
    sidebarAvatarEl,
    sidebarNameEl,
    sidebarSubtitleEl,
    sidebarLogoutBtn,
  } = deps;

  if (sidebarLogoutBtn instanceof HTMLButtonElement && !sidebarLogoutBtn.dataset.authBound) {
    sidebarLogoutBtn.dataset.authBound = "1";
    sidebarLogoutBtn.addEventListener("click", () => {
      void logoutCurrentUser();
    });
  }

  return subscribeAuth((user) => {
    renderTopAuthState(topAuthContainer, user, "empty");
    renderSidebarUserState(
      {
        avatarEl: sidebarAvatarEl,
        nameEl: sidebarNameEl,
        subtitleEl: sidebarSubtitleEl,
        logoutBtn: sidebarLogoutBtn,
      },
      user,
    );
  });
}

/**
 * @param {{ topAuthContainer?: HTMLElement | null }} deps
 */
export function bindMainHubAuthChrome(deps) {
  return subscribeAuth((user) => {
    renderTopAuthState(deps.topAuthContainer, user, "chip");
  });
}

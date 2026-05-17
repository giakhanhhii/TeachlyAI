import { bindMainHubAuthChrome } from "./dom/authChrome.js";
import { ensureAuthenticated } from "./dom/authDialog.js";
import { getCurrentAuthUser, hydrateAuthState } from "./services/authStore.js";

function isModifiedClick(event) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

/**
 * @param {{
 *   root?: ParentNode,
 *   ensureUser?: (opts?: { initialMode?: "login"|"register", title?: string, subtitle?: string }) => Promise<any>,
 * }} [deps]
 */
export function bindProtectedHubCards(deps = {}) {
  const root = deps.root || document;
  const ensureUser = typeof deps.ensureUser === "function" ? deps.ensureUser : ensureAuthenticated;

  root.querySelectorAll(".card[href]").forEach((node) => {
    if (!(node instanceof HTMLAnchorElement) || node.dataset.authBound === "1") return;
    node.dataset.authBound = "1";
    node.addEventListener("click", async (event) => {
      if (isModifiedClick(event)) return;
      if (getCurrentAuthUser()) return;
      // Chưa đăng nhập: mở dialog auth nhưng KHÔNG nhớ intent của lần click này.
      // Sau khi login xong, user phải tự click lại thẻ để vào — tránh việc
      // ?flow=... bị mang theo vào chatbot_ui và đè lên session gần nhất.
      event.preventDefault();
      await ensureUser({
        initialMode: "login",
        title: "Đăng nhập hoặc đăng ký để mở bài giảng",
        subtitle: "Sau khi đăng nhập, bạn có thể vào bài giảng và thông tin hồ sơ sẽ hiện ở thanh bên.",
      });
    });
  });
}

export function initMainHubPage() {
  void hydrateAuthState();
  bindMainHubAuthChrome({
    topAuthContainer: document.getElementById("mainHubAuthControls"),
  });
  bindProtectedHubCards();
}

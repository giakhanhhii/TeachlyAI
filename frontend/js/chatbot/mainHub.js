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
 *   navigate?: (href: string) => void,
 * }} [deps]
 */
export function bindProtectedHubCards(deps = {}) {
  const root = deps.root || document;
  const ensureUser = typeof deps.ensureUser === "function" ? deps.ensureUser : ensureAuthenticated;
  const navigate = typeof deps.navigate === "function" ? deps.navigate : (href) => {
    location.href = href;
  };

  root.querySelectorAll(".card[href]").forEach((node) => {
    if (!(node instanceof HTMLAnchorElement) || node.dataset.authBound === "1") return;
    node.dataset.authBound = "1";
    node.addEventListener("click", async (event) => {
      if (isModifiedClick(event)) return;
      if (getCurrentAuthUser()) return;
      event.preventDefault();
      const href = node.getAttribute("href");
      if (!href) return;
      const user = await ensureUser({
        initialMode: "login",
        title: "Đăng nhập hoặc đăng ký để mở bài giảng",
        subtitle: "Sau khi đăng nhập, bạn có thể vào bài giảng và thông tin hồ sơ sẽ hiện ở thanh bên.",
      });
      if (user) navigate(href);
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

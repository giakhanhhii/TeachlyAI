import { bindMainHubAuthChrome } from "./dom/authChrome.js";
import { ensureAuthenticated } from "./dom/authDialog.js";
import { showAutoModeChoicePopup, showCountSelectorPanel } from "./dom/autoModePanel.js";
import * as autoModeStore from "./services/autoModeStore.js";
import { getCurrentAuthUser, hydrateAuthState } from "./services/authStore.js";

function isModifiedClick(event) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function normalizeHubFlow(raw) {
  const value = String(raw || "").trim();
  if (value === "fullset" || value === "slide" || value === "quiz" || value === "flashcard") return value;
  return "";
}

function toExpKind(flow) {
  return flow === "flashcard" ? "flash" : flow;
}

function buildChatUrl(flow, mode = "custom") {
  const url = new URL("chatbot_ui.html", window.location.href);
  url.searchParams.set("flow", flow);
  if (mode === "auto") url.searchParams.set("mode", "auto");
  return url.toString();
}

function syncAutoModeToggle(enabled) {
  const toggle = document.getElementById("autoModeToggle");
  if (!(toggle instanceof HTMLButtonElement)) return;
  toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
  const label = toggle.querySelector(".toggle-label");
  if (label) label.textContent = enabled ? "Tạo Auto" : "Tạo Custom";
}

function openHubAutoCountSelector(flow, navigate) {
  if (autoModeStore.getNeverAskCount()) {
    navigate(buildChatUrl(flow, "auto"));
    return;
  }
  showCountSelectorPanel(toExpKind(flow), autoModeStore.getCounts(), {
    onConfirm: (counts, neverAsk) => {
      autoModeStore.saveCounts(counts);
      if (neverAsk) autoModeStore.setNeverAskCount(true);
      navigate(buildChatUrl(flow, "auto"));
    },
    onCancel: () => {},
  });
}

function openHubAutoModeChoice(flow, navigate) {
  const expKind = toExpKind(flow);
  showAutoModeChoicePopup(expKind, {
    onCustom: () => {
      autoModeStore.disable();
      autoModeStore.setNeverAskChoice("custom");
      syncAutoModeToggle(false);
      navigate(buildChatUrl(flow, "custom"));
    },
    onAuto: () => {
      autoModeStore.enable();
      autoModeStore.setNeverAskChoice("auto");
      syncAutoModeToggle(true);
      openHubAutoCountSelector(flow, navigate);
    },
  });
}

function handleHubFlowCard(flow, navigate) {
  const savedChoice = autoModeStore.getNeverAskChoice();
  if (savedChoice === "custom") {
    autoModeStore.disable();
    syncAutoModeToggle(false);
    navigate(buildChatUrl(flow, "custom"));
    return;
  }
  if (savedChoice === "auto" || autoModeStore.isEnabled()) {
    autoModeStore.enable();
    syncAutoModeToggle(true);
    openHubAutoCountSelector(flow, navigate);
    return;
  }
  openHubAutoModeChoice(flow, navigate);
}

/**
 * @param {{
 *   root?: ParentNode,
 *   ensureUser?: (opts?: { initialMode?: "login"|"register", title?: string, subtitle?: string }) => Promise<any>,
 *   navigate?: (url: string) => void,
 * }} [deps]
 */
export function bindProtectedHubCards(deps = {}) {
  const root = deps.root || document;
  const ensureUser = typeof deps.ensureUser === "function" ? deps.ensureUser : ensureAuthenticated;
  const navigate = typeof deps.navigate === "function"
    ? deps.navigate
    : (url) => {
        window.location.href = url;
      };

  root.querySelectorAll(".card[href]").forEach((node) => {
    if (!(node instanceof HTMLAnchorElement) || node.dataset.authBound === "1") return;
    node.dataset.authBound = "1";
    node.addEventListener("click", async (event) => {
      if (isModifiedClick(event)) return;
      const url = new URL(node.href, window.location.href);
      const flow = normalizeHubFlow(url.searchParams.get("flow"));
      if (getCurrentAuthUser()) {
        if (!flow) return;
        event.preventDefault();
        handleHubFlowCard(flow, navigate);
        return;
      }
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

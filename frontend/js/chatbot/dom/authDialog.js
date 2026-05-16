import {
  getCurrentAuthUser,
  hydrateAuthState,
  loginLocalAccount,
  registerLocalAccount,
} from "../services/authStore.js";

function createField({ label, type, name, autoComplete }) {
  const field = document.createElement("label");
  field.className = "auth-field";

  const labelEl = document.createElement("span");
  labelEl.className = "auth-field-label";
  labelEl.textContent = label;

  const input = document.createElement("input");
  input.className = "auth-input";
  input.type = type;
  input.name = name;
  input.autocomplete = autoComplete;

  field.append(labelEl, input);
  return { field, input };
}

/**
 * @param {{
 *   initialMode?: "login"|"register",
 *   title?: string,
 *   subtitle?: string,
 * }} [opts]
 */
export function showAuthDialog(opts = {}) {
  const existingUser = getCurrentAuthUser();
  if (existingUser) {
    return Promise.resolve({ authenticated: true, user: existingUser });
  }

  const initialMode = opts.initialMode === "register" ? "register" : "login";
  const titleText = opts.title || "Đăng nhập để tiếp tục";
  const subtitleText = opts.subtitle || "Bạn cần đăng nhập hoặc đăng ký trước khi mở bài giảng.";

  return new Promise((resolve) => {
    let currentMode = initialMode;
    let resolved = false;

    const overlay = document.createElement("div");
    overlay.className = "auth-overlay";

    const dialog = document.createElement("div");
    dialog.className = "auth-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "auth-close-btn";
    closeBtn.setAttribute("aria-label", "Đóng");
    closeBtn.textContent = "×";

    const title = document.createElement("h2");
    title.className = "auth-title";
    title.textContent = titleText;

    const subtitle = document.createElement("p");
    subtitle.className = "auth-subtitle";
    subtitle.textContent = subtitleText;

    const tabs = document.createElement("div");
    tabs.className = "auth-tabs";

    const loginTab = document.createElement("button");
    loginTab.type = "button";
    loginTab.className = "auth-tab";
    loginTab.textContent = "Đăng nhập";

    const registerTab = document.createElement("button");
    registerTab.type = "button";
    registerTab.className = "auth-tab";
    registerTab.textContent = "Đăng ký";

    tabs.append(loginTab, registerTab);

    const feedback = document.createElement("p");
    feedback.className = "auth-feedback";
    feedback.hidden = true;

    const loginForm = document.createElement("form");
    loginForm.className = "auth-form";
    const loginUsernameField = createField({
      label: "Tên đăng nhập",
      type: "text",
      name: "login-username",
      autoComplete: "username",
    });
    const loginPasswordField = createField({
      label: "Mật khẩu",
      type: "password",
      name: "login-password",
      autoComplete: "current-password",
    });
    const loginSubmit = document.createElement("button");
    loginSubmit.type = "submit";
    loginSubmit.className = "auth-submit-btn";
    loginSubmit.textContent = "Đăng nhập";
    loginForm.append(loginUsernameField.field, loginPasswordField.field, loginSubmit);

    const registerForm = document.createElement("form");
    registerForm.className = "auth-form";
    const registerUsernameField = createField({
      label: "Tên đăng nhập",
      type: "text",
      name: "register-username",
      autoComplete: "username",
    });
    const registerPasswordField = createField({
      label: "Mật khẩu",
      type: "password",
      name: "register-password",
      autoComplete: "new-password",
    });
    const registerConfirmField = createField({
      label: "Nhập lại mật khẩu",
      type: "password",
      name: "register-confirm-password",
      autoComplete: "new-password",
    });
    const registerSubmit = document.createElement("button");
    registerSubmit.type = "submit";
    registerSubmit.className = "auth-submit-btn";
    registerSubmit.textContent = "Tạo tài khoản";
    registerForm.append(
      registerUsernameField.field,
      registerPasswordField.field,
      registerConfirmField.field,
      registerSubmit,
    );

    function setFeedback(message, tone = "error") {
      feedback.hidden = !message;
      feedback.textContent = message || "";
      feedback.dataset.tone = tone;
    }

    function setMode(nextMode) {
      currentMode = nextMode === "register" ? "register" : "login";
      loginTab.classList.toggle("is-active", currentMode === "login");
      registerTab.classList.toggle("is-active", currentMode === "register");
      loginForm.hidden = currentMode !== "login";
      registerForm.hidden = currentMode !== "register";
      setFeedback("");
      const focusTarget = currentMode === "login" ? loginUsernameField.input : registerUsernameField.input;
      requestAnimationFrame(() => focusTarget.focus());
    }

    function cleanup() {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    }

    function close(result) {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result || { authenticated: false, user: null });
    }

    function onKeyDown(event) {
      if (event.key === "Escape") close({ authenticated: false, user: null });
    }

    loginTab.addEventListener("click", () => setMode("login"));
    registerTab.addEventListener("click", () => setMode("register"));
    closeBtn.addEventListener("click", () => close({ authenticated: false, user: null }));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close({ authenticated: false, user: null });
    });

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginSubmit.disabled = true;
      const result = await loginLocalAccount({
        username: loginUsernameField.input.value,
        password: loginPasswordField.input.value,
      });
      loginSubmit.disabled = false;
      if (!result.ok) {
        setFeedback(result.error || "Không thể đăng nhập.");
        return;
      }
      close({ authenticated: true, user: result.user });
    });

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      registerSubmit.disabled = true;
      const result = await registerLocalAccount({
        username: registerUsernameField.input.value,
        password: registerPasswordField.input.value,
        confirmPassword: registerConfirmField.input.value,
      });
      registerSubmit.disabled = false;
      if (!result.ok) {
        setFeedback(result.error || "Không thể đăng ký.");
        return;
      }
      loginUsernameField.input.value = registerUsernameField.input.value.trim();
      loginPasswordField.input.value = registerPasswordField.input.value;
      registerPasswordField.input.value = "";
      registerConfirmField.input.value = "";
      setMode("login");
      setFeedback("Đăng ký thành công. Bạn có thể đăng nhập ngay bằng tài khoản vừa tạo.", "success");
      loginPasswordField.input.focus();
    });

    dialog.append(closeBtn, title, subtitle, tabs, feedback, loginForm, registerForm);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKeyDown);
    setMode(initialMode);
  });
}

/**
 * @param {{
 *   initialMode?: "login"|"register",
 *   title?: string,
 *   subtitle?: string,
 * }} [opts]
 */
export async function ensureAuthenticated(opts = {}) {
  const existingUser = getCurrentAuthUser();
  if (existingUser) return existingUser;
  const hydratedUser = await hydrateAuthState();
  if (hydratedUser) return hydratedUser;
  const result = await showAuthDialog(opts);
  return result?.authenticated ? result.user : null;
}

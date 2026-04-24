/**
 * Chọn ảnh từ máy người dùng (file local) khi chỉnh slide trong iframe.
 * Trả về data URL để gửi vào iframe qua postMessage.
 */

const MAX_BYTES = 12 * 1024 * 1024; /* 12 MB — tránh treo tab với ảnh quá lớn */

/**
 * @param {(url: string) => void} onPick
 * @param {ParentNode} [mountParent] — khi modal cần nằm trong khung slide (vd. `.exp-slide-viewport` khi phủ toàn màn hình);
 *   mặc định `document.body`.
 * @returns {() => void} đóng modal
 */
export function openSlideImagePicker(onPick, mountParent) {
  const mountEl =
    mountParent && mountParent.nodeType === Node.ELEMENT_NODE ? /** @type {Element} */ (mountParent) : document.body;
  const backdrop = document.createElement("div");
  backdrop.className = "exp-slide-img-picker-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Chọn ảnh từ máy");

  const panel = document.createElement("div");
  panel.className = "exp-slide-img-picker-panel";

  const head = document.createElement("div");
  head.className = "exp-slide-img-picker-head";
  const title = document.createElement("h3");
  title.className = "exp-slide-img-picker-title";
  title.textContent = "Chọn ảnh từ máy";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "exp-slide-img-picker-close";
  closeBtn.setAttribute("aria-label", "Đóng");
  closeBtn.textContent = "×";
  head.append(title, closeBtn);

  const body = document.createElement("div");
  body.className = "exp-slide-img-picker-body";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.className = "exp-slide-img-picker-input";
  input.setAttribute("aria-label", "Tệp ảnh trên máy");

  const pickBtn = document.createElement("button");
  pickBtn.type = "button";
  pickBtn.className = "exp-slide-img-picker-primary";
  pickBtn.textContent = "Duyệt tệp…";

  const hint = document.createElement("p");
  hint.className = "exp-slide-img-picker-hint";
  hint.textContent = "Định dạng: JPG, PNG, WebP, GIF… Ảnh được dùng trong phiên chỉnh slide (không tải lên máy chủ).";

  const err = document.createElement("p");
  err.className = "exp-slide-img-picker-err";
  err.hidden = true;
  err.setAttribute("role", "alert");

  function showError(msg) {
    err.textContent = msg;
    err.hidden = false;
  }

  let triedAutoOpen = false;

  function openNativePicker() {
    err.hidden = true;
    try {
      input.click();
    } catch (_) {
      /* ignore */
    }
  }

  pickBtn.addEventListener("click", () => {
    openNativePicker();
  });

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      showError("Vui lòng chọn một tệp ảnh.");
      return;
    }
    if (file.size > MAX_BYTES) {
      showError("Ảnh quá lớn (tối đa khoảng 12 MB). Hãy chọn ảnh nhỏ hơn.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const result = reader.result;
      if (typeof result === "string" && result.length > 0) {
        onPick(result);
        close();
      } else {
        showError("Không đọc được tệp. Thử ảnh khác.");
      }
    };
    reader.onerror = function () {
      showError("Không đọc được tệp. Thử lại.");
    };
    reader.readAsDataURL(file);
  });

  body.append(pickBtn, input, hint, err);

  panel.append(head, body);
  backdrop.appendChild(panel);
  mountEl.appendChild(backdrop);
  if (!triedAutoOpen) {
    triedAutoOpen = true;
    openNativePicker();
  }

  function close() {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener("keydown", onKey);

  return close;
}

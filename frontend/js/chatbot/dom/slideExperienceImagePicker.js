/**
 * Chọn ảnh từ máy người dùng (file local) khi chỉnh slide trong iframe.
 * Mở thẳng file picker native, không hiện modal trung gian.
 */

const MAX_BYTES = 12 * 1024 * 1024; /* 12 MB — tránh treo tab với ảnh quá lớn */

/**
 * @param {(url: string) => void} onPick
 * @returns {() => void} đóng/cleanup picker tạm
 */
export function openSlideImagePicker(onPick) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  input.style.top = "0";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";

  let closed = false;
  let settleTimer = 0;

  function clearSettleTimer() {
    if (!settleTimer) return;
    window.clearTimeout(settleTimer);
    settleTimer = 0;
  }

  function cleanup() {
    if (closed) return;
    closed = true;
    clearSettleTimer();
    window.removeEventListener("focus", onWindowFocus);
    input.remove();
  }

  function showError(msg) {
    window.alert(msg);
  }

  function onWindowFocus() {
    clearSettleTimer();
    settleTimer = window.setTimeout(() => {
      if (closed) return;
      const file = input.files && input.files[0];
      if (!file) cleanup();
    }, 280);
  }

  input.addEventListener("change", () => {
    clearSettleTimer();
    const file = input.files && input.files[0];
    if (!file) {
      cleanup();
      return;
    }
    if (!file.type || !file.type.startsWith("image/")) {
      showError("Vui lòng chọn một tệp ảnh.");
      cleanup();
      return;
    }
    if (file.size > MAX_BYTES) {
      showError("Ảnh quá lớn (tối đa khoảng 12 MB). Hãy chọn ảnh nhỏ hơn.");
      cleanup();
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const result = reader.result;
      if (typeof result === "string" && result.length > 0) {
        onPick(result);
      } else {
        showError("Không đọc được tệp. Thử ảnh khác.");
      }
      cleanup();
    };
    reader.onerror = function () {
      showError("Không đọc được tệp. Thử lại.");
      cleanup();
    };
    reader.readAsDataURL(file);
  });

  input.addEventListener("cancel", cleanup);

  document.body.appendChild(input);
  window.addEventListener("focus", onWindowFocus);
  try {
    input.click();
  } catch (_) {
    cleanup();
  }

  return cleanup;
}

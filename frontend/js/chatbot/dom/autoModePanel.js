const STEPS = [5, 10, 15, 20];
const MAX_TOTAL = 40;

function clampToStep(val) {
  const n = Number(val);
  let closest = STEPS[0];
  STEPS.forEach((s) => {
    if (Math.abs(s - n) < Math.abs(closest - n)) closest = s;
  });
  return closest;
}

function getKindLabel(flowKind) {
  if (flowKind === "fullset") return "Full Set";
  if (flowKind === "quiz") return "Quiz";
  if (flowKind === "slide") return "Slide";
  return "Flashcard";
}

/**
 * Shows a "Bạn muốn tạo bằng cách nào?" popup.
 * @param {"fullset"|"slide"|"quiz"|"flash"} flowKind
 * @param {{ onCustom: () => void, onAuto: () => void }} callbacks
 */
export function showAutoModeChoicePopup(flowKind, { onCustom, onAuto }) {
  const kindLabel = getKindLabel(flowKind);

  const overlay = document.createElement("div");
  overlay.className = "auto-mode-overlay";

  const dialog = document.createElement("div");
  dialog.className = "auto-mode-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Chọn cách tạo nội dung");

  const icon = document.createElement("div");
  icon.className = "auto-mode-dialog-icon";
  icon.textContent = "✨";

  const title = document.createElement("h3");
  title.className = "auto-mode-dialog-title";
  title.textContent = "Bạn muốn tạo bằng cách nào?";

  const desc = document.createElement("p");
  desc.className = "auto-mode-dialog-desc";
  desc.textContent = `Tạo thủ công hoặc để Teachly tự tạo ${kindLabel} cho bạn.`;

  const actions = document.createElement("div");
  actions.className = "auto-mode-dialog-actions";

  const customBtn = document.createElement("button");
  customBtn.type = "button";
  customBtn.className = "auto-mode-btn auto-mode-btn-custom";
  customBtn.textContent = "Tạo custom";

  const autoBtn = document.createElement("button");
  autoBtn.type = "button";
  autoBtn.className = "auto-mode-btn auto-mode-btn-auto";
  autoBtn.textContent = "✨ Để Teachly tạo";

  actions.appendChild(customBtn);
  actions.appendChild(autoBtn);
  dialog.appendChild(icon);
  dialog.appendChild(title);
  dialog.appendChild(desc);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  customBtn.addEventListener("click", () => { close(); onCustom(); });
  autoBtn.addEventListener("click", () => { close(); onAuto(); });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) { close(); onCustom(); }
  });
}

/**
 * Shows the count selector panel.
 * @param {"fullset"|"slide"|"quiz"|"flash"} flowKind
 * @param {{ slides: number, quiz: number, flash: number }} initialCounts
 * @param {{ onConfirm: (counts: { slides: number, quiz: number, flash: number }) => void, onCancel?: () => void }} callbacks
 */
export function showCountSelectorPanel(flowKind, initialCounts, { onConfirm, onCancel }) {
  const isFullset = flowKind === "fullset";
  const kindLabel = getKindLabel(flowKind);

  const overlay = document.createElement("div");
  overlay.className = "auto-mode-overlay";

  const dialog = document.createElement("div");
  dialog.className = "auto-mode-dialog auto-mode-dialog--count";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", `Chọn số lượng ${kindLabel}`);

  const title = document.createElement("h3");
  title.className = "auto-mode-dialog-title";
  title.textContent = `Chọn số lượng — ${kindLabel}`;

  const rowsEl = document.createElement("div");
  rowsEl.className = "count-selector-rows";

  const state = {
    slides: clampToStep(initialCounts?.slides ?? 15),
    quiz: clampToStep(initialCounts?.quiz ?? 15),
    flash: clampToStep(initialCounts?.flash ?? 10),
  };

  /** @type {HTMLElement | null} */
  let totalNumEl = null;
  /** @type {HTMLElement | null} */
  let warnEl = null;
  /** @type {HTMLButtonElement | null} */
  let confirmBtn = null;

  function updateValidation() {
    if (!confirmBtn) return;
    if (isFullset) {
      const total = state.slides + state.quiz + state.flash;
      if (totalNumEl) totalNumEl.textContent = String(total);
      const over = total > MAX_TOTAL;
      if (warnEl) warnEl.style.display = over ? "block" : "none";
      confirmBtn.disabled = over;
    }
  }

  function createRow(label, key) {
    const row = document.createElement("div");
    row.className = "count-row";

    const labelEl = document.createElement("span");
    labelEl.className = "count-row-label";
    labelEl.textContent = label;

    const segmented = document.createElement("div");
    segmented.className = "count-segmented";

    STEPS.forEach((step) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "count-step-btn" + (state[key] === step ? " active" : "");
      btn.textContent = String(step);
      btn.addEventListener("click", () => {
        state[key] = step;
        segmented.querySelectorAll(".count-step-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        updateValidation();
      });
      segmented.appendChild(btn);
    });

    row.appendChild(labelEl);
    row.appendChild(segmented);
    return row;
  }

  if (isFullset) {
    rowsEl.appendChild(createRow("Slide", "slides"));
    rowsEl.appendChild(createRow("Quiz", "quiz"));
    rowsEl.appendChild(createRow("Flashcard", "flash"));
  } else if (flowKind === "slide") {
    rowsEl.appendChild(createRow("Số slide", "slides"));
  } else if (flowKind === "quiz") {
    rowsEl.appendChild(createRow("Số câu quiz", "quiz"));
  } else {
    rowsEl.appendChild(createRow("Số flashcard", "flash"));
  }

  const actions = document.createElement("div");
  actions.className = "auto-mode-dialog-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "auto-mode-btn auto-mode-btn-custom";
  cancelBtn.textContent = "Hủy";

  confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "auto-mode-btn auto-mode-btn-auto count-confirm-btn";
  confirmBtn.textContent = "Tiếp tục ✨";

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);

  dialog.appendChild(title);
  dialog.appendChild(rowsEl);

  if (isFullset) {
    const totalBar = document.createElement("div");
    totalBar.className = "count-total-badge";
    totalBar.innerHTML = `Tổng: <span class="count-total-num">0</span>/40`;
    totalNumEl = totalBar.querySelector(".count-total-num");
    dialog.appendChild(totalBar);

    warnEl = document.createElement("p");
    warnEl.className = "count-selector-warn";
    warnEl.style.display = "none";
    warnEl.textContent = `Tổng vượt quá ${MAX_TOTAL}! Hãy giảm số lượng.`;
    dialog.appendChild(warnEl);
  }

  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  updateValidation();

  const close = () => overlay.remove();

  cancelBtn.addEventListener("click", () => { close(); onCancel?.(); });
  confirmBtn.addEventListener("click", () => {
    if (isFullset && state.slides + state.quiz + state.flash > MAX_TOTAL) return;
    close();
    onConfirm({ slides: state.slides, quiz: state.quiz, flash: state.flash });
  });
}

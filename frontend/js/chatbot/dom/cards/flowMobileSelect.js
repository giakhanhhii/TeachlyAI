const MOBILE_SELECT_QUERY = "(max-width: 768px)";

function closeOtherMobileSelects(ownerDocument, currentWrap) {
  ownerDocument.querySelectorAll(".flow-mobile-select.is-open").forEach((node) => {
    if (!(node instanceof HTMLElement) || node === currentWrap) return;
    node.classList.remove("is-open");
    node.querySelector(".flow-mobile-select-btn")?.setAttribute("aria-expanded", "false");
    const menu = node.querySelector(".flow-mobile-select-menu");
    if (menu instanceof HTMLElement) menu.hidden = true;
  });
}

function buildSelectLabel(selectEl) {
  const selectedOption = selectEl.selectedOptions?.[0] || selectEl.options[selectEl.selectedIndex] || null;
  return String(selectedOption?.textContent || "").trim();
}

/**
 * Replace the native mobile select popup with an in-card dropdown so the open menu
 * stays inside the chat form width on small screens. Desktop keeps the native select.
 *
 * @param {HTMLSelectElement} selectEl
 * @returns {{ control: HTMLElement, sync: () => void }}
 */
export function mountFlowMobileSelect(selectEl) {
  const ownerDocument = selectEl.ownerDocument || document;
  const hostWin = ownerDocument.defaultView;
  const useMobileProxy = Boolean(hostWin?.matchMedia?.(MOBILE_SELECT_QUERY)?.matches);

  if (!useMobileProxy) {
    return {
      control: selectEl,
      sync() {},
    };
  }

  const wrap = ownerDocument.createElement("div");
  wrap.className = "flow-mobile-select";

  const trigger = ownerDocument.createElement("button");
  trigger.type = "button";
  trigger.className = "flow-mobile-select-btn";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const menu = ownerDocument.createElement("div");
  menu.className = "flow-mobile-select-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  selectEl.classList.add("flow-select--mobile-native");
  wrap.appendChild(selectEl);
  wrap.appendChild(trigger);
  wrap.appendChild(menu);

  function closeMenu() {
    wrap.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    menu.hidden = true;
  }

  function syncMenu() {
    const currentValue = selectEl.value;
    const selectedLabel = buildSelectLabel(selectEl);

    trigger.textContent = selectedLabel;
    trigger.classList.toggle("is-placeholder", !currentValue);

    menu.replaceChildren();
    Array.from(selectEl.options).forEach((option) => {
      if (!option.value || option.hidden) return;

      const item = ownerDocument.createElement("button");
      item.type = "button";
      item.className = "flow-mobile-select-option";
      item.textContent = String(option.textContent || option.value).trim();
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", option.value === currentValue ? "true" : "false");
      if (option.value === currentValue) item.classList.add("is-selected");
      if (option.disabled) item.disabled = true;

      item.addEventListener("click", () => {
        if (option.disabled) return;
        selectEl.value = option.value;
        selectEl.dispatchEvent(new Event("input", { bubbles: true }));
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        syncMenu();
        closeMenu();
      });

      menu.appendChild(item);
    });
  }

  trigger.addEventListener("click", () => {
    const nextOpen = !wrap.classList.contains("is-open");
    closeOtherMobileSelects(ownerDocument, wrap);
    if (!nextOpen) {
      closeMenu();
      return;
    }
    wrap.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
  });

  ownerDocument.addEventListener("click", (event) => {
    if (wrap.contains(/** @type {Node} */ (event.target))) return;
    closeMenu();
  });

  ownerDocument.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  syncMenu();

  return {
    control: wrap,
    sync: syncMenu,
  };
}

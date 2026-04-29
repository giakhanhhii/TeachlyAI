import { getSlideTemplateOptionLabel, SLIDE_TEMPLATE_OPTIONS } from "../../data/slideTemplateOptions.js";
import { appendSelectPlaceholder } from "./flowCardShared.js";

const MOBILE_TEMPLATE_LABEL_QUERY = "(max-width: 640px)";

/**
 * Populate the shared slide-template select while keeping the full option value intact.
 * On narrow viewports we render shorter labels so the closed native select fits inside the card.
 *
 * @param {HTMLSelectElement} selectEl
 * @param {{ placeholder?: string }} [opts]
 */
export function populateSlideTemplateSelect(selectEl, opts = {}) {
  const ownerDocument = selectEl.ownerDocument || document;
  const hostWin = ownerDocument.defaultView;
  const compactLabels = Boolean(hostWin?.matchMedia?.(MOBILE_TEMPLATE_LABEL_QUERY)?.matches);

  selectEl.classList.add("flow-select--template");
  appendSelectPlaceholder(selectEl, opts.placeholder || "Chọn mẫu…");

  SLIDE_TEMPLATE_OPTIONS.forEach((value) => {
    const option = ownerDocument.createElement("option");
    option.value = value;
    option.textContent = getSlideTemplateOptionLabel(value, { compact: compactLabels });
    option.title = value;
    selectEl.appendChild(option);
  });
}

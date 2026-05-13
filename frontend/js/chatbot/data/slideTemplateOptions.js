/** 7 mẫu giao diện slide — dùng chung form Slide và Full Set */
export const SLIDE_TEMPLATE_OPTIONS = [
  "Professional (Multicolor)",
  "Minimal (Academic)",
  "Friendly (Warm)",
  "Space Light",
  "Space Dark",
  "Sea Life",
  "Comic",
];

export const SLIDE_TEMPLATE_DEFAULT = "Friendly (Warm)";

const SLIDE_TEMPLATE_MOBILE_LABELS = new Map([
  ["Professional (Multicolor)", "Professional"],
  ["Minimal (Academic)", "Minimal"],
  ["Friendly (Warm)", "Friendly"],
  ["Space Light", "Space Light"],
  ["Space Dark", "Space Dark"],
]);

export function getSlideTemplateOptionLabel(value, opts = {}) {
  const compact = typeof opts === "boolean" ? opts : Boolean(opts.compact);
  if (!compact) return value;
  return SLIDE_TEMPLATE_MOBILE_LABELS.get(value) || value;
}

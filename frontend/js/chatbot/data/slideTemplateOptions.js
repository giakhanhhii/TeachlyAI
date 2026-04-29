/** 7 mẫu giao diện slide — dùng chung form Slide và Full Set */
export const SLIDE_TEMPLATE_OPTIONS = [
  "Chuyên nghiệp (đa sắc)",
  "Tối giản (Học thuật)",
  "Vui tươi (Thân thiện)",
  "Vũ trụ sáng (Trẻ trung)",
  "Vũ trụ tối (Huyền bí)",
  "Biển cả",
  "Comic",
];

export const SLIDE_TEMPLATE_DEFAULT = "Vui tươi (Thân thiện)";

const SLIDE_TEMPLATE_MOBILE_LABELS = new Map([
  ["Chuyên nghiệp (đa sắc)", "Chuyên nghiệp"],
  ["Tối giản (Học thuật)", "Tối giản"],
  ["Vui tươi (Thân thiện)", "Vui tươi"],
  ["Vũ trụ sáng (Trẻ trung)", "Vũ trụ sáng"],
  ["Vũ trụ tối (Huyền bí)", "Vũ trụ tối"],
]);

export function getSlideTemplateOptionLabel(value, opts = {}) {
  const compact = typeof opts === "boolean" ? opts : Boolean(opts.compact);
  if (!compact) return value;
  return SLIDE_TEMPLATE_MOBILE_LABELS.get(value) || value;
}

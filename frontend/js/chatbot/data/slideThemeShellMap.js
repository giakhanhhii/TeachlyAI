/**
 * Maps UI label from SLIDE_TEMPLATE_OPTIONS to static shell files under /slide_html_template/.
 * Fallback: 4.space-bright.html (fix_plan).
 */
export const SLIDE_THEME_TO_SHELL_FILE = Object.freeze({
  "Professional (Multicolor)": "1.thptqg.html",
  "Minimal (Academic)": "2.on_thi_tn_thpt_2026.html",
  "Friendly (Warm)": "3.friendly.html",
  "Space Light": "4.space-bright.html",
  "Space Dark": "6.space-black.html",
  "Sea Life": "7.sealife.html",
  "Comic": "8.comic.html",
});

export const SLIDE_SHELL_FALLBACK_FILE = "4.space-bright.html";

/**
 * @param {string | undefined} themeLabel
 * @returns {string}
 */
export function resolveSlideShellFilename(themeLabel) {
  const t = String(themeLabel || "").trim();
  return SLIDE_THEME_TO_SHELL_FILE[t] || SLIDE_SHELL_FALLBACK_FILE;
}

export const FLASH_SOUND_SVG = `<svg class="flash-sound-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a8 8 0 010 12.72" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

let flashSpeechVoicesHooked = false;
let flashSpeakGeneration = 0;

function hookFlashSpeechVoicesOnce() {
  if (typeof window === "undefined" || !window.speechSynthesis || flashSpeechVoicesHooked) return;
  flashSpeechVoicesHooked = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

/**
 * @param {string} targetLang 
 * @returns {SpeechSynthesisVoice | null}
 */
function pickBestSpeechVoice(targetLang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const tl = String(targetLang || "en-US").toLowerCase().replace("_", "-");
  const primary = tl.split("-")[0] || "en";

  const candidates = voices.filter((v) => {
    const l = String(v.lang || "").toLowerCase().replace("_", "-");
    return l === tl || l.startsWith(`${primary}-`) || l === primary;
  });

  if (!candidates.length) return null;

  const scoreVoice = (v) => {
    const n = String(v.name || "").toLowerCase();
    let s = 0;
    if (n.includes("natural") || n.includes("neural")) s += 120;
    if (n.includes("microsoft")) s += 55;
    if (n.includes("google")) s += 42;
    if (primary === "en") {
      if (/\bjenny\b/.test(n)) s += 45;
      else if (/\baria\b/.test(n)) s += 42;
    }
    return s;
  };

  let best = candidates[0];
  let bestScore = scoreVoice(best);
  for (let i = 1; i < candidates.length; i++) {
    const v = candidates[i];
    const sc = scoreVoice(v);
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * @param {string} text 
 * @param {string} lang 
 */
export function speakText(text, lang) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  hookFlashSpeechVoicesOnce();
  const syn = window.speechSynthesis;
  syn.cancel();
  const gen = ++flashSpeakGeneration;

  const start = () => {
    if (gen !== flashSpeakGeneration) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = pickBestSpeechVoice(lang);
    if (voice) u.voice = voice;
    syn.speak(u);
  };

  const voices = syn.getVoices();
  if (voices.length > 0) {
    start();
  } else {
    const onVoices = () => {
      if (gen !== flashSpeakGeneration) return;
      if (syn.getVoices().length > 0) {
        syn.removeEventListener("voiceschanged", onVoices);
        start();
      }
    };
    syn.addEventListener("voiceschanged", onVoices);
    setTimeout(() => {
      syn.removeEventListener("voiceschanged", onVoices);
      if (gen === flashSpeakGeneration) start();
    }, 900);
  }
}

/**
 * @param {{ front: string, back: string }} card 
 */
export function speakFlashcard(card) {
  const front = String(card.front || "").trim();
  const back = String(card.back || "").trim();
  const text = front || back;
  if (!text) return;
  const useEn = /^[a-zA-Z0-9\s\-'.,]+$/.test(front);
  speakText(text, useEn ? "en-US" : "vi-VN");
}

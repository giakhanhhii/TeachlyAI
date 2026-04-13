import { fetchMockResource } from "../services/mockContentApi.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Viết hoa chữ cái đầu mặt trước / mặt sau thẻ. */
function capitalizeFirst(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toLocaleUpperCase("vi") + t.slice(1);
}

const FLASH_SOUND_SVG = `<svg class="flash-sound-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M15.54 8.46a5 5 0 010 7.07M18.36 5.64a8 8 0 010 12.72" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

let flashSpeechVoicesHooked = false;

function hookFlashSpeechVoicesOnce() {
  if (typeof window === "undefined" || !window.speechSynthesis || flashSpeechVoicesHooked) return;
  flashSpeechVoicesHooked = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

/**
 * Chọn giọng neural/natural phù hợp (Edge: Microsoft Natural; Chrome: Google nếu có).
 * @param {string} targetLang Ví dụ "en-US", "vi-VN"
 * @returns {SpeechSynthesisVoice | null}
 */
function pickBestSpeechVoice(targetLang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const tl = String(targetLang || "en-US").toLowerCase().replace("_", "-");
  const primary = tl.split("-")[0] || "en";

  /** @param {SpeechSynthesisVoice} v */
  function langMatches(v) {
    const l = String(v.lang || "")
      .toLowerCase()
      .replace("_", "-");
    if (l === tl) return true;
    if (l.startsWith(`${primary}-`)) return true;
    if (l === primary) return true;
    return false;
  }

  const candidates = voices.filter(langMatches);
  if (!candidates.length) return null;

  /** @param {SpeechSynthesisVoice} v */
  function scoreVoice(v) {
    const n = String(v.name || "").toLowerCase();
    let s = 0;
    if (n.includes("natural") || n.includes("neural")) s += 120;
    if (n.includes("microsoft")) s += 55;
    if (n.includes("google")) s += 42;

    if (primary === "en") {
      if (/\bjenny\b/.test(n) && (n.includes("natural") || n.includes("neural"))) s += 45;
      else if (/\baria\b/.test(n) && (n.includes("natural") || n.includes("neural"))) s += 42;
      else if (/\bguy\b/.test(n) && (n.includes("natural") || n.includes("neural"))) s += 38;
      if (n.includes("premium")) s += 12;
    }
    if (primary === "vi") {
      if (n.includes("hoai") && (n.includes("natural") || n.includes("neural"))) s += 55;
    }
    return s;
  }

  let best = candidates[0];
  let bestScore = scoreVoice(best);
  for (let i = 1; i < candidates.length; i += 1) {
    const v = candidates[i];
    const sc = scoreVoice(v);
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  }
  // Không ép một giọng “bình thường” chỉ vì nó đứng đầu danh sách — để trình duyệt dùng mặc định.
  if (bestScore <= 0) return null;
  return best;
}

/** Tăng mỗi lần gọi speak mới để hủy chờ voiceschanged / timeout của lần trước. */
let flashSpeakGeneration = 0;

/**
 * Chạy fn sau khi getVoices() có phần tử hoặc hết thời gian chờ (một số trình duyệt không bắn sự kiện).
 * @param {SpeechSynthesis} syn
 * @param {number} gen
 * @param {() => void} fn
 */
function whenSpeechVoicesReady(syn, gen, fn) {
  syn.getVoices();
  if (gen !== flashSpeakGeneration) return;
  if (syn.getVoices().length > 0) {
    fn();
    return;
  }
  const run = () => {
    if (gen !== flashSpeakGeneration) return;
    fn();
  };
  const onVoices = () => {
    if (gen !== flashSpeakGeneration) return;
    if (syn.getVoices().length > 0) {
      syn.removeEventListener("voiceschanged", onVoices);
      clearTimeout(tid);
      run();
    }
  };
  syn.addEventListener("voiceschanged", onVoices);
  const tid = setTimeout(() => {
    syn.removeEventListener("voiceschanged", onVoices);
    run();
  }, 900);
}

/** Đọc từ mặt trước (ưu tiên) bằng Web Speech API khi có. */
function speakFlashcard(c) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  hookFlashSpeechVoicesOnce();
  const syn = window.speechSynthesis;
  syn.cancel();
  const gen = ++flashSpeakGeneration;
  const front = String(c.front || "").trim();
  const back = String(c.back || "").trim();
  const text = front || back;
  if (!text) return;
  const useEn = /^[a-zA-Z0-9\s\-'.,]+$/.test(front);
  const lang = useEn ? "en-US" : "vi-VN";

  const start = () => {
    if (gen !== flashSpeakGeneration) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const voice = pickBestSpeechVoice(lang);
    if (voice) u.voice = voice;
    syn.speak(u);
  };

  whenSpeechVoicesReady(syn, gen, start);
}

/**
 * @param {Record<string, string>} meta
 * @param {number} cIndex
 * @param {{ front: string, back: string }} card
 */
function buildAiDraftFlash(meta, cIndex, card) {
  const src = meta.source || "—";
  const count = meta.count || "—";
  const notes = meta.extra || meta.notes || "—";
  return (
    `[Sửa flashcard — nhờ AI]\n` +
    `Ngữ cảnh — Nguồn: ${src}; Số thẻ (yêu cầu): ${count}; Ghi chú: ${notes}\n` +
    `Thẻ hiện tại (${cIndex + 1}) — Mặt trước: ${card.front}\nMặt sau: ${card.back}\n\n` +
    `Hãy đề xuất cặp từ / nghĩa hoặc ví dụ câu hay hơn.`
  );
}

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onAiEdit?: (draft: string) => void }} [deps]
 */
export async function mountFlashExperience(layerView, meta, deps) {
  layerView.prepareShow();
  hookFlashSpeechVoicesOnce();
  const experienceBody = layerView.body;

  const data = await fetchMockResource("flashcard");
  const titleText = data.title || "Flashcard";
  const cards = Array.isArray(data.cards) ? data.cards : [];

  let index = 0;
  const total = Math.max(1, cards.length);

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-flash";

  const onAi = () => {
    const c = cards[index];
    if (!c || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftFlash(meta, index, c));
  };

  shell.appendChild(
    createExperienceTopBar({
      title: titleText,
      onAiEdit: deps?.onAiEdit ? onAi : undefined,
    }),
  );

  const metaEl = document.createElement("p");
  metaEl.className = "exp-meta-line";
  metaEl.textContent = `Đã ghi nhận — Nguồn: ${meta.source || "—"} | Số thẻ (yêu cầu): ${meta.count || "—"} | Ghi chú: ${meta.extra || "—"}`;
  shell.appendChild(metaEl);

  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  shell.appendChild(progress.wrap);

  const hint = document.createElement("p");
  hint.className = "flash-hint";
  hint.textContent = "Nhấn vào thẻ để lật. Dùng Tiếp theo để sang thẻ khác.";
  shell.appendChild(hint);

  const cardSlot = document.createElement("div");
  cardSlot.className = "flash-slot";
  shell.appendChild(cardSlot);

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: cards.length === 0 });
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function renderCard() {
    const c = cards[index];
    cardSlot.innerHTML = "";
    if (!c) {
      cardSlot.innerHTML = `<p class="exp-empty">Không có thẻ trong bộ mock.</p>`;
      nextBtn.disabled = true;
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "flash-wrap";
    const frame = document.createElement("div");
    frame.className = "flash-card-frame";

    const soundBtn = document.createElement("button");
    soundBtn.type = "button";
    soundBtn.className = "flash-sound-btn";
    soundBtn.setAttribute("aria-label", "Phát âm");
    soundBtn.innerHTML = FLASH_SOUND_SVG;
    soundBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      soundBtn.classList.remove("flash-sound-anim");
      void soundBtn.offsetWidth;
      soundBtn.classList.add("flash-sound-anim");
      speakFlashcard(c);
    });
    soundBtn.addEventListener("animationend", () => {
      soundBtn.classList.remove("flash-sound-anim");
    });

    const inner = document.createElement("div");
    inner.className = "flash-card";
    inner.setAttribute("role", "button");
    inner.tabIndex = 0;
    const frontTerm = escapeHtml(capitalizeFirst(c.front));
    const backText = escapeHtml(capitalizeFirst(c.back));
    const hintBlock = c.hint
      ? `<div class="flash-mini-hint">${escapeHtml(c.hint)}</div>`
      : "";

    inner.innerHTML = `
      <div class="flash-face flash-front">
        <div class="flash-front-stack">
          <span class="flash-front-term">${frontTerm}</span>
          ${hintBlock}
        </div>
      </div>
      <div class="flash-face flash-back">
        <span class="flash-back-text">${backText}</span>
      </div>
    `;

    // Gắn nút loa vào mặt trước để nó xoay theo thẻ
    inner.querySelector(".flash-front").appendChild(soundBtn);

    inner.addEventListener("click", () => inner.classList.toggle("flipped"));
    inner.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inner.classList.toggle("flipped");
      }
    });

    frame.appendChild(inner);
    wrap.appendChild(frame);
    cardSlot.appendChild(wrap);

    progress.paint({ total, index, correct: 0, wrong: 0 });
    nextBtn.textContent = index >= total - 1 ? "Kết thúc" : "Tiếp theo";
    nextBtn.disabled = false;
  }

  nextBtn.addEventListener("click", () => {
    if (total <= 1 || index >= total - 1) {
      nextBtn.disabled = true;
      return;
    }
    index += 1;
    renderCard();
  });

  experienceBody.appendChild(shell);
  renderCard();
}

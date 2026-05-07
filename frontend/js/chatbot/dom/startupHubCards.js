/**
 * Main Hub card grid for empty chat — mirrors `frontend/main_hub.html` structure & SVGs.
 * @param {(flow: "slide"|"quiz"|"flashcard") => void} onPick
 */
export function createStartupHubElement(onPick) {
  const handlePick = typeof onPick === "function" ? onPick : null;
  const wrap = document.createElement("div");
  wrap.className = "chat-startup-hub";
  const svgIdPrefix =
    globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
      ? `startup-${globalThis.crypto.randomUUID()}`
      : `startup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  wrap.innerHTML = `
  <div class="forest-page forest-page--embedded">
    <svg class="trees-bg" viewBox="0 0 900 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:120px;" aria-hidden="true">
      <polygon points="30,120 60,40 90,120" fill="#388e3c" opacity="0.5" />
      <polygon points="55,120 90,30 125,120" fill="#2e7d32" opacity="0.45" />
      <polygon points="10,120 38,60 66,120" fill="#43a047" opacity="0.3" />
      <polygon points="800,120 830,38 860,120" fill="#388e3c" opacity="0.5" />
      <polygon points="830,120 865,28 900,120" fill="#2e7d32" opacity="0.4" />
      <polygon points="775,120 808,55 841,120" fill="#43a047" opacity="0.3" />
      <polygon points="420,120 445,70 470,120" fill="#66bb6a" opacity="0.18" />
    </svg>
    <div class="hero-area">
      <div class="headline-area">
        <p class="startup-hub-instruction">Bạn muốn tạo mới thẻ nào, chọn 1 thẻ để tạo mới</p>
      </div>
    </div>
    <div class="cards-row">
      <button type="button" class="card" data-flow="slide" aria-label="Tạo slide">
        <svg class="card-img" viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="${svgIdPrefix}-forest-grad-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fff59d" />
              <stop offset="38%" stop-color="#c5e1a5" />
              <stop offset="72%" stop-color="#43a047" />
              <stop offset="100%" stop-color="#1b5e20" />
            </linearGradient>
            <linearGradient id="${svgIdPrefix}-slide-screen-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="100%" stop-color="#e8f5e9" />
            </linearGradient>
          </defs>
          <rect width="200" height="116" fill="url(#${svgIdPrefix}-forest-grad-2)" />
          <circle cx="34" cy="24" r="18" fill="#fffde7" opacity="0.65" />
          <circle cx="165" cy="21" r="14" fill="#fff59d" opacity="0.35" />
          <polygon points="0,116 24,62 48,116" fill="#0d3b0d" opacity="0.3" />
          <polygon points="150,116 175,52 200,116" fill="#0d3b0d" opacity="0.35" />
          <path d="M44 18 L46 10 L48 18 L56 20 L48 22 L46 30 L44 22 L36 20 Z" fill="#ffffff" opacity="0.95" />
          <path d="M156 36 L158 30 L160 36 L166 38 L160 40 L158 46 L156 40 L150 38 Z" fill="#fffde7" opacity="0.9" />
          <rect x="32" y="18" width="136" height="80" rx="16" fill="#ffffff" opacity="0.22" />
          <rect x="38" y="24" width="124" height="72" rx="14" fill="url(#${svgIdPrefix}-slide-screen-glow)" stroke="#2e7d32" stroke-width="2.5" />
          <rect x="49" y="34" width="92" height="7" rx="3.5" fill="#43a047" opacity="0.92" />
          <rect x="49" y="47" width="58" height="25" rx="6" fill="#c8e6c9" />
          <polygon points="56,70 68,50 78,61 88,55 101,70" fill="#43a047" />
          <circle cx="91" cy="52" r="6" fill="#fff59d" />
          <rect x="115" y="48" width="24" height="24" rx="5" fill="#e8f5e9" />
          <rect x="120" y="58" width="5" height="14" rx="2.5" fill="#66bb6a" />
          <rect x="128" y="53" width="5" height="19" rx="2.5" fill="#43a047" />
          <rect x="136" y="49" width="5" height="23" rx="2.5" fill="#2e7d32" />
          <rect x="49" y="79" width="88" height="4" rx="2" fill="#a5d6a7" opacity="0.98" />
          <rect x="49" y="86" width="72" height="4" rx="2" fill="#c5e1a5" opacity="0.98" />
        </svg>
        <div class="card-body">
          <div class="card-title">Tạo slide</div>
          <div class="card-desc">Tạo slide theo nội dung của bạn</div>
        </div>
      </button>
      <button type="button" class="card" data-flow="quiz" aria-label="Tạo quiz">
        <svg class="card-img" viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="${svgIdPrefix}-forest-grad-3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#2b7a35" />
              <stop offset="52%" stop-color="#33883b" />
              <stop offset="100%" stop-color="#22662d" />
            </linearGradient>
            <linearGradient id="${svgIdPrefix}-quiz-card-surface" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#fffef2" />
              <stop offset="100%" stop-color="#eef7df" />
            </linearGradient>
            <linearGradient id="${svgIdPrefix}-quiz-progress-accent" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#43a047" />
              <stop offset="100%" stop-color="#9ccc65" />
            </linearGradient>
          </defs>
          <rect width="200" height="116" fill="url(#${svgIdPrefix}-forest-grad-3)" />
          <circle cx="34" cy="22" r="24" fill="#b7ddb3" opacity="0.12" />
          <circle cx="170" cy="20" r="18" fill="#dcedc8" opacity="0.14" />
          <ellipse cx="88" cy="18" rx="40" ry="11" fill="#dcedc8" opacity="0.08" />
          <ellipse cx="100" cy="128" rx="95" ry="48" fill="#1b5e20" opacity="0.5" />
          <circle cx="31" cy="28" r="18" fill="#66bb6a" opacity="0.12" />
          <circle cx="171" cy="24" r="16" fill="#dcedc8" opacity="0.14" />
          <ellipse cx="24" cy="28" rx="12" ry="7" fill="#66bb6a" transform="rotate(-35 24 28)" opacity="0.38" />
          <ellipse cx="178" cy="88" rx="11" ry="7" fill="#8bc34a" transform="rotate(20 178 88)" opacity="0.34" />
          <rect x="41" y="18" width="118" height="82" rx="14" fill="#ffffff" opacity="0.14" />
          <rect x="46" y="24" width="108" height="72" rx="12" fill="url(#${svgIdPrefix}-quiz-card-surface)" stroke="#2e7d32" stroke-width="2.4" />
          <rect x="56" y="34" width="70" height="7" rx="3.5" fill="url(#${svgIdPrefix}-quiz-progress-accent)" />
          <rect x="130" y="33" width="14" height="14" rx="7" fill="#fff59d" opacity="0.96" />
          <line x1="58" y1="49" x2="142" y2="49" stroke="#b7ddb3" stroke-width="2.4" stroke-linecap="round" />
          <line x1="58" y1="57" x2="128" y2="57" stroke="#d6ebcc" stroke-width="2.2" stroke-linecap="round" />
          <circle cx="60" cy="69" r="7.6" fill="#f8fff0" stroke="#43a047" stroke-width="1.7" />
          <text x="60" y="73" font-size="9.5" font-weight="900" text-anchor="middle" fill="#2e7d32" font-family="sans-serif">A</text>
          <rect x="74" y="64" width="56" height="9" rx="3.2" fill="#d7efcf" />
          <rect x="134" y="64" width="10" height="9" rx="3.2" fill="#f1f8e9" />
          <circle cx="60" cy="82" r="7.6" fill="#f8fff0" stroke="#43a047" stroke-width="1.7" />
          <text x="60" y="86" font-size="9.5" font-weight="900" text-anchor="middle" fill="#2e7d32" font-family="sans-serif">B</text>
          <rect x="74" y="77" width="50" height="9" rx="3.2" fill="#c8e6c9" />
          <rect x="128" y="77" width="16" height="9" rx="3.2" fill="#edf7e7" />
          <circle cx="60" cy="95" r="7.8" fill="#43a047" stroke="#1b5e20" stroke-width="1.7" />
          <text x="60" y="99" font-size="9.5" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">C</text>
          <rect x="74" y="90" width="46" height="9" rx="3.2" fill="#a5d6a7" />
          <rect x="124" y="90" width="20" height="9" rx="3.2" fill="#edf7e7" />
          <path d="M160 26 L162 20 L164 26 L170 28 L164 30 L162 36 L160 30 L154 28 Z" fill="#fffde7" opacity="0.92" />
        </svg>
        <div class="card-body">
          <div class="card-title">Tạo quiz</div>
          <div class="card-desc">Tạo quiz cho nội dung thi THPTQG tiếng anh</div>
          <div class="badge badge-new">MỚI</div>
        </div>
      </button>
      <button type="button" class="card" data-flow="flashcard" aria-label="Tạo flashcard">
        <svg class="card-img" viewBox="0 0 200 116" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="${svgIdPrefix}-forest-grad-4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#fff9c4" />
              <stop offset="35%" stop-color="#aed581" />
              <stop offset="100%" stop-color="#2e7d32" />
            </linearGradient>
            <linearGradient id="${svgIdPrefix}-frame-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#b3e5fc" />
              <stop offset="100%" stop-color="#81c784" />
            </linearGradient>
          </defs>
          <rect width="200" height="116" fill="url(#${svgIdPrefix}-forest-grad-4)" />
          <polygon points="0,116 35,72 68,116" fill="#1b5e20" opacity="0.25" />
          <polygon points="140,116 170,68 200,116" fill="#1b5e20" opacity="0.28" />
          <rect x="54" y="18" width="92" height="82" rx="10" fill="#5d4037" />
          <rect x="58" y="22" width="84" height="70" rx="6" fill="url(#${svgIdPrefix}-frame-sky)" stroke="#33691e" stroke-width="1" />
          <polygon points="58,88 78,58 98,88" fill="#388e3c" />
          <polygon points="88,92 110,52 132,92" fill="#2e7d32" />
          <polygon points="118,90 138,62 158,90" fill="#43a047" />
          <circle cx="128" cy="38" r="10" fill="#fff9c4" opacity="0.95" />
          <path d="M44 34 L46 28 L48 34 L54 36 L48 38 L46 44 L44 38 L38 36 Z" fill="#fffde7" opacity="0.95" />
          <path d="M158 26 L159.5 22 L161 26 L165 27 L161 28 L159.5 32 L158 28 L154 27 Z" fill="#fff9c4" opacity="0.9" />
          <circle cx="168" cy="78" r="2" fill="#fff" opacity="0.85" />
          <circle cx="32" cy="88" r="1.5" fill="#fff" opacity="0.7" />
        </svg>
        <div class="card-body">
          <div class="card-title">Tạo flashcard</div>
          <div class="card-desc">Tạo flashcard từ vựng và phát âm chuẩn cho bài giảng của bạn</div>
        </div>
      </button>
    </div>
  </div>`;

  ["slide", "quiz", "flashcard"].forEach((flow) => {
    const card = wrap.querySelector(`.card[data-flow="${flow}"]`);
    if (card?.parentElement) {
      card.parentElement.appendChild(card);
    }
  });

  wrap.querySelectorAll(".card[data-flow]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const flow = /** @type {string} */ (btn.getAttribute("data-flow") || "");
      if (!handlePick) return;
      if (flow === "quiz" || flow === "slide" || flow === "flashcard") {
        handlePick(flow);
      }
    });
  });

  return wrap;
}

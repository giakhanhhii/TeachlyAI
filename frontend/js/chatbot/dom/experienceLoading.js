const SHARED_LOADING_TIPS = [
  "Bạn có thể làm bài Full 40 câu THPTQG bằng cách chọn tạo quiz ở chế độ custom rồi bấm option \"Làm full đề THPTQG\".",
  "Full Set giúp tạo liền mạch slide, quiz và flashcard từ cùng một chủ đề để dạy và ôn tập nhanh hơn.",
  "Nếu đã có tài liệu, bạn chỉ cần tải file có chữ rõ để Teachly chuyển thành nội dung học trong cùng một luồng.",
  "Sau khi tạo slide, bạn có thể tải xuống PDF để dùng khi dạy hoặc chia sẻ cho học sinh.",
  "Flashcard phù hợp để ôn nhanh từ vựng, khái niệm và ý chính ngay sau khi học slide hoặc làm quiz.",
  "Khi chưa có tài liệu sẵn, chế độ nhập chủ đề trực tiếp sẽ giúp bạn tạo bộ nội dung mới rất nhanh.",
  "Quiz custom giúp bạn đổi số lượng câu hỏi linh hoạt để dùng cho warm-up, luyện tập hoặc kiểm tra nhanh.",
  "Slide, quiz và flashcard trong cùng một Full Set được giữ theo cùng mạch nội dung để đỡ mất công biên soạn lại.",
];

/**
 * Appends a loading timer to a loading overlay element and starts ticking.
 * Uses wall-clock time when `startedAt` is set (e.g. from `backgroundFetchStore`) so the
 * label reflects the real wait time if the overlay is torn down and remounted while the
 * same fetch runs. Returns a stop function — call it when the loading is done.
 *
 * @param {HTMLElement} overlayEl
 * @param {number} estimatedSeconds
 * @param {{ startedAt?: number }} [opts]
 * @returns {() => void}
 */
export function startAiCountdown(overlayEl, estimatedSeconds, opts = {}) {
  const countEl = document.createElement("span");
  countEl.className = "ai-loading-countdown";
  overlayEl.appendChild(countEl);

  const total = Math.max(1, Math.round(estimatedSeconds));
  const anchor =
    typeof opts.startedAt === "number" && Number.isFinite(opts.startedAt) ? opts.startedAt : Date.now();

  function update() {
    const elapsed = Math.floor((Date.now() - anchor) / 1000);
    const safeElapsed = Math.max(0, elapsed);
    countEl.textContent =
      safeElapsed < total
        ? `Đã chờ ~${safeElapsed}s`
        : `Đã chờ ~${safeElapsed}s • sắp xong…`;
  }

  update();
  const timer = setInterval(update, 1000);

  return () => clearInterval(timer);
}

/**
 * @param {string | undefined} primaryTip
 * @returns {string[]}
 */
export function buildAiLoadingTips(primaryTip) {
  const normalizedPrimary = String(primaryTip || "").trim();
  const seen = new Set();
  const tips = [];

  const pushTip = (tip) => {
    const normalized = String(tip || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    tips.push(normalized);
  };

  pushTip(normalizedPrimary);

  const pool = [...SHARED_LOADING_TIPS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[swapIndex]] = [pool[swapIndex], pool[i]];
  }
  pool.forEach(pushTip);
  return tips;
}

/**
 * @param {HTMLElement} tipEl
 * @param {string[]} tips
 * @param {{ rotateEveryMs?: number }} [opts]
 * @returns {() => void}
 */
export function startAiTipRotation(tipEl, tips, opts = {}) {
  const safeTips = Array.isArray(tips)
    ? tips.map((tip) => String(tip || "").trim()).filter(Boolean)
    : [];
  if (!tipEl || safeTips.length === 0) return () => {};

  let index = 0;
  tipEl.textContent = safeTips[index];

  if (safeTips.length === 1) return () => {};

  const rotateEveryMs = Math.max(1500, Number(opts.rotateEveryMs) || 4800);
  const timer = setInterval(() => {
    index = (index + 1) % safeTips.length;
    tipEl.textContent = safeTips[index];
  }, rotateEveryMs);

  return () => clearInterval(timer);
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   label: string,
 *   tip?: string,
 *   estimatedSeconds?: number,
 *   startedAt?: number,
 *   rotateEveryMs?: number,
 * }} opts
 */
export function createAiLoadingOverlay(host, opts) {
  const overlay = document.createElement("div");
  overlay.className = "ai-loading-overlay";

  const ring = document.createElement("div");
  ring.className = "ai-loading-ring";
  overlay.appendChild(ring);

  const label = document.createElement("span");
  label.className = "ai-loading-label";
  label.textContent = String(opts?.label || "AI đang xử lý…");
  overlay.appendChild(label);

  const tipEl = document.createElement("span");
  tipEl.className = "ai-loading-tip";
  overlay.appendChild(tipEl);

  host.appendChild(overlay);

  const stopTips = startAiTipRotation(tipEl, buildAiLoadingTips(opts?.tip), {
    rotateEveryMs: opts?.rotateEveryMs,
  });
  const stopCountdown = startAiCountdown(overlay, Number(opts?.estimatedSeconds) || 15, {
    startedAt: opts?.startedAt,
  });

  return {
    overlay,
    remove() {
      stopTips();
      stopCountdown();
      overlay.remove();
    },
  };
}

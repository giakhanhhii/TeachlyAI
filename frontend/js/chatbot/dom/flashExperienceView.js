import { fetchMockResource } from "../services/mockContentApi.js";
import { prepareFlashSessionData } from "../services/sessionContentPrep.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { speakFlashcard, FLASH_SOUND_SVG, hookFlashSpeechVoicesOnce } from "../services/speechService.js";

const BOOKMARK_SVG = `
  <svg class="flash-bookmark-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 3.75h10a1.25 1.25 0 0 1 1.25 1.25v15.22L12 16.6 5.75 20.22V5A1.25 1.25 0 0 1 7 3.75z" />
  </svg>
`;

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

/**
 * @param {any} raw
 */
function normalizeFlashCard(raw) {
  const front = String(raw?.front ?? "").trim();
  const back = String(raw?.back ?? "").trim();
  if (!front || !back) return null;
  const normalized = { front, back };
  const id = String(raw?.id ?? "").trim();
  const phonetic = String(raw?.phonetic ?? "").trim();
  const hint = String(raw?.hint ?? "").trim();
  if (id) normalized.id = id;
  if (phonetic) normalized.phonetic = phonetic;
  if (hint) normalized.hint = hint;
  return normalized;
}

/**
 * @param {any[]} cards
 */
function normalizeFlashCards(cards) {
  return Array.isArray(cards) ? cards.map(normalizeFlashCard).filter(Boolean) : [];
}

/**
 * @param {{ id?: string, front: string, back: string, phonetic?: string, hint?: string }} card
 * @returns {string}
 */
function buildCardFingerprint(card) {
  if (card.id) return `id:${card.id}`;
  return [
    String(card.front || "").trim().toLowerCase(),
    String(card.back || "").trim().toLowerCase(),
    String(card.phonetic || "").trim().toLowerCase(),
    String(card.hint || "").trim().toLowerCase(),
  ].join("::");
}

/**
 * @param {{ id?: string, front: string, back: string, phonetic?: string, hint?: string }[]} cards
 */
function buildCardKeys(cards) {
  const counts = new Map();
  return cards.map((card) => {
    const fingerprint = buildCardFingerprint(card);
    const nextCount = (counts.get(fingerprint) || 0) + 1;
    counts.set(fingerprint, nextCount);
    return `${fingerprint}#${nextCount}`;
  });
}

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {Record<string, string>} meta
 * @param {{ onContinueCreate?: (kind: "slide"|"quiz"|"flash") => void }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountFlashExperience(layerView, meta, deps, opts = {}) {
  layerView.prepareShow();
  hookFlashSpeechVoicesOnce();
  const experienceBody = layerView.body;

  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  const restoredCards = normalizeFlashCards(initial?.cardsSnapshot);
  const data =
    restoredCards.length > 0
      ? { title: typeof initial?.title === "string" && initial.title.trim() ? initial.title.trim() : "Flashcard", cards: restoredCards }
      : prepareFlashSessionData(await fetchMockResource("flashcard"), meta);
  const titleText = data.title || "Flashcard";
  const cards = normalizeFlashCards(data.cards);
  const totalCards = cards.length;
  const cardKeys = buildCardKeys(cards);
  const cardKeySet = new Set(cardKeys);
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  const persistedCardKey = typeof initial?.currentCardKey === "string" ? initial.currentCardKey : "";
  const persistedCardKeyIndex = persistedCardKey ? cardKeys.indexOf(persistedCardKey) : -1;
  if (persistedCardKeyIndex >= 0) index = persistedCardKeyIndex;
  index = Math.min(Math.max(0, index), Math.max(0, totalCards - 1));
  /** @type {boolean[]} */
  const flippedByIndex = Array.from({ length: cards.length }, (_, i) => {
    const arr = Array.isArray(initial?.flippedByIndex) ? initial.flippedByIndex : [];
    return Boolean(arr[i]);
  });
  const initialBookmarkKeys = Array.isArray(initial?.bookmarkedKeys) ? initial.bookmarkedKeys.map(String) : [];
  let bookmarkedKeys = new Set(initialBookmarkKeys.filter((key) => cardKeySet.has(key)));
  let bookmarkFilter = Boolean(initial?.bookmarkFilter) && bookmarkedKeys.size > 0;
  let lastAllCardKey =
    typeof initial?.lastAllCardKey === "string" && cardKeySet.has(initial.lastAllCardKey)
      ? initial.lastAllCardKey
      : cardKeys[index] || "";
  let lastBookmarkCardKey =
    typeof initial?.lastBookmarkCardKey === "string" && cardKeySet.has(initial.lastBookmarkCardKey)
      ? initial.lastBookmarkCardKey
      : "";

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-flash";

  const topBar = createExperienceTopBar({
    title: titleText,
  }).bar;
  topBar.classList.add("exp-topbar-flash");
  topBar.addEventListener("animationend", (event) => {
    if (event.target === topBar) topBar.classList.remove("flash-bookmark-feedback");
  });

  const topBarRight = topBar.querySelector(".exp-topbar-right");
  const bookmarkControl = document.createElement("div");
  bookmarkControl.className = "flash-bookmark-control";
  const bookmarkFilterBtn = document.createElement("button");
  bookmarkFilterBtn.type = "button";
  bookmarkFilterBtn.className = "flash-bookmark-filter-btn";
  bookmarkFilterBtn.innerHTML = `
    ${BOOKMARK_SVG}
    <span class="flash-bookmark-filter-text">Bookmark</span>
    <span class="flash-bookmark-filter-badge">0</span>
  `;
  const bookmarkFilterBadge = bookmarkFilterBtn.querySelector(".flash-bookmark-filter-badge");
  bookmarkControl.appendChild(bookmarkFilterBtn);
  topBarRight?.insertBefore(bookmarkControl, topBarRight.firstChild || null);
  shell.appendChild(topBar);

  const metaEl = document.createElement("p");
  metaEl.className = "exp-meta-line";
  metaEl.textContent = `Đã ghi nhận — Nguồn: ${meta.source || "—"} | Số thẻ (yêu cầu): ${meta.count || "—"} | Ghi chú: ${meta.extra || "—"}`;
  shell.appendChild(metaEl);

  const progress = createProgressRow({ total: Math.max(1, totalCards), index: 0, correct: 0, wrong: 0 });
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
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: cards.length === 0 });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  shell.appendChild(footer);

  function clampBaseIndex(value) {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.min(Math.max(0, Math.floor(Number(value))), Math.max(0, totalCards - 1));
  }

  function getVisibleIndices() {
    if (!bookmarkFilter) return cards.map((_, cardIndex) => cardIndex);
    return cardKeys.reduce((acc, key, cardIndex) => {
      if (bookmarkedKeys.has(key)) acc.push(cardIndex);
      return acc;
    }, []);
  }

  /**
   * @param {number[]} visibleIndices
   * @param {number} preferredIndex
   */
  function resolveNearestVisibleIndex(visibleIndices, preferredIndex) {
    const safePreferred = clampBaseIndex(preferredIndex);
    if (!visibleIndices.length) return 0;
    if (visibleIndices.includes(safePreferred)) return safePreferred;
    const nextVisible = visibleIndices.find((cardIndex) => cardIndex >= safePreferred);
    return Number.isFinite(nextVisible) ? nextVisible : visibleIndices[visibleIndices.length - 1];
  }

  /**
   * @param {number} [preferredIndex]
   */
  function syncVisibleState(preferredIndex = index) {
    if (bookmarkFilter && bookmarkedKeys.size === 0) bookmarkFilter = false;
    const visibleIndices = getVisibleIndices();
    if (!visibleIndices.length) {
      index = 0;
      return { visibleIndices, visibleIndex: -1 };
    }
    index = resolveNearestVisibleIndex(visibleIndices, preferredIndex);
    return { visibleIndices, visibleIndex: visibleIndices.indexOf(index) };
  }

  function triggerTopbarBookmarkFeedback() {
    topBar.classList.remove("flash-bookmark-feedback");
    void topBar.offsetWidth;
    topBar.classList.add("flash-bookmark-feedback");
  }

  /**
   * @param {HTMLButtonElement} btn
   * @param {boolean} active
   */
  function paintBookmarkButton(btn, active) {
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.setAttribute("aria-label", active ? "Bỏ bookmark flashcard" : "Bookmark flashcard");
    btn.title = active ? "Bỏ bookmark" : "Bookmark";
  }

  function renderBookmarkMenu() {
    const bookmarkCount = bookmarkedKeys.size;
    const hasBookmarks = bookmarkCount > 0;
    bookmarkControl.classList.toggle("has-bookmarks", hasBookmarks);
    if (!hasBookmarks) bookmarkFilter = false;
    bookmarkFilterBtn.classList.toggle("active", bookmarkFilter);
    bookmarkFilterBtn.disabled = !hasBookmarks;
    if (bookmarkFilterBadge) bookmarkFilterBadge.textContent = String(bookmarkCount);
    bookmarkFilterBtn.title = bookmarkFilter
      ? `Đang xem ${bookmarkCount} flashcard đã bookmark. Bấm lần nữa để quay lại tất cả.`
      : `Chỉ xem ${bookmarkCount} flashcard đã bookmark`;
  }

  function restoreAllViewIndex() {
    const resumeAllIndex = lastAllCardKey ? cardKeys.indexOf(lastAllCardKey) : -1;
    if (resumeAllIndex >= 0) index = resumeAllIndex;
  }

  /**
   * @param {number[]} visibleIndices
   */
  function paintBookmarkedProgressSegments(visibleIndices) {
    const segments = progress.wrap.querySelectorAll(".exp-progress-seg");
    segments.forEach((segment, segmentIndex) => {
      const baseIndex = visibleIndices[segmentIndex];
      const isBookmarked = Number.isFinite(baseIndex) && bookmarkedKeys.has(cardKeys[baseIndex]);
      const shouldHighlightBookmarked = bookmarkFilter ? segmentIndex <= visibleIndices.indexOf(index) : Boolean(isBookmarked);
      segment.classList.toggle("bookmarked", Boolean(isBookmarked && shouldHighlightBookmarked));
    });
  }

  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "flash",
      meta: { ...meta },
      title: titleText,
      total: cards.length,
      index,
      currentCardKey: cardKeys[index] || "",
      flippedByIndex: [...flippedByIndex],
      cardsSnapshot: cards.map((card) => ({ ...card })),
      bookmarkedKeys: [...bookmarkedKeys],
      bookmarkFilter,
      lastAllCardKey,
      lastBookmarkCardKey,
    });
  }

  function renderCard() {
    const { visibleIndices, visibleIndex } = syncVisibleState(index);
    const c = cards[index];
    if (!bookmarkFilter && cardKeys[index]) lastAllCardKey = cardKeys[index];
    if (bookmarkFilter && cardKeys[index]) lastBookmarkCardKey = cardKeys[index];
    cardSlot.innerHTML = "";
    renderBookmarkMenu();
    if (!c) {
      cardSlot.innerHTML = `<p class="exp-empty">Không có thẻ trong bộ mock.</p>`;
      backBtn.disabled = true;
      nextBtn.disabled = true;
      hint.textContent = "Không có flashcard để hiển thị.";
      emitState();
      return;
    }

    const wrap = document.createElement("div");
    wrap.className = "flash-wrap";
    const frame = document.createElement("div");
    frame.className = "flash-card-frame";

    const inner = document.createElement("div");
    inner.className = "flash-card";
    inner.setAttribute("role", "button");
    inner.tabIndex = 0;

    const frontTerm = escapeHtml(capitalizeFirst(c.front));
    const backText = escapeHtml(capitalizeFirst(c.back));
    const phoneticBlock = c.phonetic ? `<div class="flash-phonetic">${escapeHtml(c.phonetic)}</div>` : "";
    const hintBlock = c.hint ? `<div class="flash-mini-hint">${escapeHtml(c.hint)}</div>` : "";

    inner.innerHTML = `
      <div class="flash-face flash-front">
        <div class="flash-front-stack">
          <span class="flash-front-term">${frontTerm}</span>
          ${phoneticBlock}
          ${hintBlock}
        </div>
      </div>
      <div class="flash-face flash-back">
        <span class="flash-back-text">${backText}</span>
      </div>
    `;

    const toggleBookmark = (event) => {
      event.stopPropagation();
      const key = cardKeys[index];
      const wasBookmarked = bookmarkedKeys.has(key);
      if (wasBookmarked) bookmarkedKeys.delete(key);
      else {
        bookmarkedKeys.add(key);
        triggerTopbarBookmarkFeedback();
      }
      renderCard();
    };

    const addBookmarkBtn = (faceEl) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "flash-bookmark-btn";
      btn.innerHTML = BOOKMARK_SVG;
      paintBookmarkButton(btn, bookmarkedKeys.has(cardKeys[index]));
      btn.addEventListener("click", toggleBookmark);
      faceEl.appendChild(btn);
    };

    // Hàm tạo nút loa để gắn vào cả 2 mặt
    const addSoundBtn = (faceEl) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "flash-sound-btn";
      btn.setAttribute("aria-label", "Phát âm");
      btn.innerHTML = FLASH_SOUND_SVG;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        btn.classList.remove("flash-sound-anim");
        void btn.offsetWidth;
        btn.classList.add("flash-sound-anim");
        speakFlashcard(c);
      });
      btn.addEventListener("animationend", () => {
        btn.classList.remove("flash-sound-anim");
      });
      faceEl.appendChild(btn);
    };

    const frontFace = inner.querySelector(".flash-front");
    const backFace = inner.querySelector(".flash-back");
    addBookmarkBtn(frontFace);
    addBookmarkBtn(backFace);
    addSoundBtn(frontFace);
    addSoundBtn(backFace);

    const syncFlipped = () => {
      flippedByIndex[index] = inner.classList.contains("flipped");
      emitState();
    };
    if (flippedByIndex[index]) inner.classList.add("flipped");
    inner.addEventListener("click", () => {
      inner.classList.toggle("flipped");
      syncFlipped();
    });
    inner.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inner.classList.toggle("flipped");
        syncFlipped();
      }
    });

    frame.appendChild(inner);
    wrap.appendChild(frame);
    cardSlot.appendChild(wrap);

    const visibleTotal = Math.max(1, visibleIndices.length);
    const safeVisibleIndex = Math.max(0, visibleIndex);
    progress.paint({ total: visibleTotal, index: safeVisibleIndex, correct: 0, wrong: 0 });
    paintBookmarkedProgressSegments(visibleIndices);
    hint.textContent = bookmarkFilter
      ? "Đang xem các flashcard đã bookmark. Chạm bookmark lần nữa để bỏ khỏi danh sách này."
      : "Nhấn vào thẻ để lật. Dùng Tiếp theo để sang thẻ khác.";
    backBtn.disabled = safeVisibleIndex <= 0;
    nextBtn.textContent = bookmarkFilter
      ? safeVisibleIndex >= visibleTotal - 1
        ? "Xem tất cả"
        : "Tiếp theo"
      : index >= totalCards - 1
        ? "Tiếp tục tạo"
        : "Tiếp theo";
    nextBtn.disabled = false;
    emitState();
  }

  bookmarkFilterBtn.addEventListener("click", () => {
    if (bookmarkedKeys.size === 0) return;
    if (bookmarkFilter) {
      bookmarkFilter = false;
      restoreAllViewIndex();
      renderCard();
      return;
    }
    bookmarkFilter = true;
    const resumeBookmarkIndex =
      lastBookmarkCardKey && bookmarkedKeys.has(lastBookmarkCardKey) ? cardKeys.indexOf(lastBookmarkCardKey) : -1;
    const firstBookmarkedIndex = cardKeys.findIndex((key) => bookmarkedKeys.has(key));
    if (resumeBookmarkIndex >= 0) index = resumeBookmarkIndex;
    else if (firstBookmarkedIndex >= 0) index = firstBookmarkedIndex;
    renderCard();
  });

  backBtn.addEventListener("click", () => {
    const { visibleIndices, visibleIndex } = syncVisibleState(index);
    if (visibleIndex <= 0) return;
    index = visibleIndices[visibleIndex - 1];
    renderCard();
  });

  nextBtn.addEventListener("click", () => {
    const { visibleIndices, visibleIndex } = syncVisibleState(index);
    if (bookmarkFilter) {
      if (visibleIndex < visibleIndices.length - 1) {
        index = visibleIndices[visibleIndex + 1];
      } else {
        bookmarkFilter = false;
        restoreAllViewIndex();
      }
      renderCard();
      return;
    }
    if (totalCards <= 1 || index >= totalCards - 1) {
      deps?.onContinueCreate?.("flash");
      return;
    }
    index = visibleIndices[Math.min(visibleIndex + 1, visibleIndices.length - 1)];
    renderCard();
  });

  experienceBody.appendChild(shell);
  renderCard();
}

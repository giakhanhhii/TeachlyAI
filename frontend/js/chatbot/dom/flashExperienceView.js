import { fetchMockResource } from "../services/mockContentApi.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";

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
    const inner = document.createElement("div");
    inner.className = "flash-card";
    inner.setAttribute("role", "button");
    inner.tabIndex = 0;
    const hintText = c.hint ? `<div class="flash-mini-hint">${c.hint}</div>` : "";
    inner.innerHTML = `<div class="flash-face flash-front">${c.front}${hintText}</div><div class="flash-face flash-back">${c.back}</div>`;
    inner.addEventListener("click", () => inner.classList.toggle("flipped"));
    inner.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inner.classList.toggle("flipped");
      }
    });
    wrap.appendChild(inner);
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

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {Record<string, string>} meta
 */
export function mountFlashExperience(layerView, meta) {
  layerView.prepareShow();
  const experienceBody = layerView.body;

  const title = document.createElement("h2");
  title.style.marginTop = "0";
  title.textContent = "Flashcard — lật thẻ";
  experienceBody.appendChild(title);

  const metaEl = document.createElement("p");
  metaEl.style.color = "var(--muted)";
  metaEl.style.fontSize = "14px";
  metaEl.textContent = `Đã ghi nhận — Nguồn: ${meta.source || "—"} | Số thẻ: ${meta.count || "—"} | Ghi chú: ${meta.extra || "—"}`;
  experienceBody.appendChild(metaEl);

  const hint = document.createElement("p");
  hint.className = "flash-hint";
  hint.textContent = "Nhấn vào thẻ để lật mặt trước / mặt sau.";
  experienceBody.appendChild(hint);

  const demoCards = [
    { front: "abandon", back: "từ bỏ, ruồng bỏ" },
    { front: "meticulous", back: "tỉ mỉ, cẩn thận" },
    { front: "hypothesis", back: "giả thuyết" },
  ];

  demoCards.forEach((c) => {
    const wrap = document.createElement("div");
    wrap.className = "flash-wrap";
    const inner = document.createElement("div");
    inner.className = "flash-card";
    inner.setAttribute("role", "button");
    inner.tabIndex = 0;
    inner.innerHTML = `<div class="flash-face flash-front">${c.front}</div><div class="flash-face flash-back">${c.back}</div>`;
    inner.addEventListener("click", () => inner.classList.toggle("flipped"));
    inner.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        inner.classList.toggle("flipped");
      }
    });
    wrap.appendChild(inner);
    experienceBody.appendChild(wrap);
  });
}

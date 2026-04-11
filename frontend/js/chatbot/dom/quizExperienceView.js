/**
 * @param {{ body: HTMLElement }} layerView
 * @param {Record<string, string>} meta
 */
export function mountQuizExperience(layerView, meta) {
  layerView.prepareShow();
  const experienceBody = layerView.body;

  const title = document.createElement("h2");
  title.style.marginTop = "0";
  title.textContent = "Đề trắc nghiệm";
  experienceBody.appendChild(title);

  const metaEl = document.createElement("p");
  metaEl.style.color = "var(--muted)";
  metaEl.style.fontSize = "14px";
  metaEl.textContent = `Đã ghi nhận — Chủ đề: ${meta.topic || "—"} | Số câu: ${meta.count || "—"} | Mức độ: ${meta.level || "—"}`;
  experienceBody.appendChild(metaEl);

  const demoQs = [
    {
      q: "By this time next week, I ___ the project.",
      opts: ["finish", "will have finished", "will finish", "am finishing"],
    },
    {
      q: "The passage mainly discusses ___.",
      opts: ["grammar rules", "reading strategy", "vocabulary in context", "listening tips"],
    },
  ];

  demoQs.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "quiz-card";
    const h = document.createElement("h3");
    h.textContent = `Câu ${i + 1}`;
    card.appendChild(h);
    const pq = document.createElement("p");
    pq.style.margin = "0 0 12px";
    pq.style.fontSize = "15px";
    pq.textContent = item.q;
    card.appendChild(pq);
    const opts = document.createElement("div");
    opts.className = "quiz-options";
    item.opts.forEach((o, j) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt";
      b.textContent = `${String.fromCharCode(65 + j)}. ${o}`;
      b.addEventListener("click", () => {
        opts.querySelectorAll(".quiz-opt").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      });
      opts.appendChild(b);
    });
    card.appendChild(opts);
    experienceBody.appendChild(card);
  });
}

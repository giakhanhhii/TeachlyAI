import { fetchMockResource } from "../services/mockContentApi.js";
import {
  prepareQuizSessionData,
  prepareSlideSessionData,
  prepareFlashSessionData,
  shuffleInPlace,
} from "../services/sessionContentPrep.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function capitalizeFirst(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toLocaleUpperCase("vi") + t.slice(1);
}

function insertInlineMcLineBreaks(s) {
  if (!s) return s;
  let t = s.replace(/([:;?])\s+A\.\s/g, "$1\nA. ");
  t = t.replace(/\s+(?=[B-F]\.\s)/g, "\n");
  return t;
}

function quizStemToSafeHtml(s) {
  const withBreaks = insertInlineMcLineBreaks(s);
  const esc = escapeHtml(withBreaks);
  const withBold = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

/**
 * @param {Record<string, string>} meta
 * @param {number} qIndex
 * @param {any} question
 */
function buildAiDraftQuiz(meta, qIndex, question) {
  const topic = meta.topic || "—";
  const count = meta.count || "—";
  const notes = meta.notes || "—";
  const opts = (question.options || []).map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n");
  return (
    `[Sửa đề quiz — nhờ AI]\n` +
    `Ngữ cảnh — Full set trộn | Chủ đề: ${topic}; Số câu quiz trong bộ: ${count}; Ghi chú: ${notes}\n` +
    `Câu hiện tại (mục ${qIndex + 1} trong phiên): ${question.text}\n` +
    `${opts}\n\n` +
    `Hãy đề xuất phiên bản câu hỏi và phương án tốt hơn (giữ định dạng trắc nghiệm 4 lựa chọn), kèm đáp án đúng và gợi ý ngắn.`
  );
}

/**
 * @typedef {{ topic: string, level: string, slides: string, quiz: string, flash: string, extra?: string }} FullSetMixedSpec
 */

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {{ title?: string, spec: FullSetMixedSpec }} bundle
 * @param {{ onAiEdit?: (draft: string) => void }} [deps]
 */
export async function mountFullSetMixedExperience(layerView, bundle, deps) {
  layerView.prepareShow();
  const root = layerView.body;
  root.innerHTML = "";

  const spec = bundle.spec || {};
  const topic = spec.topic || "—";
  const notesLine = spec.extra ? ` | Yêu cầu thêm: ${spec.extra}` : "";

  const slideMeta = { topic, count: spec.slides, notes: "Full set (demo mock)" };
  const quizMeta = { topic, count: spec.quiz, notes: "Full set (demo mock)" };
  const flashMeta = { source: topic, count: spec.flash, extra: "Full set (demo mock)" };

  const [rawSlide, rawQuiz, rawFlash] = await Promise.all([
    fetchMockResource("slide"),
    fetchMockResource("quiz"),
    fetchMockResource("flashcard"),
  ]);

  const slideData = prepareSlideSessionData(rawSlide, slideMeta);
  const quizData = prepareQuizSessionData(rawQuiz, quizMeta);
  const flashData = prepareFlashSessionData(rawFlash, flashMeta);

  const slides = Array.isArray(slideData.slides) ? slideData.slides : [];
  const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
  const cards = Array.isArray(flashData.cards) ? flashData.cards : [];

  /** @type {{ kind: "slide"|"quiz"|"flash", data: any }[]} */
  const steps = [
    ...slides.map((data) => ({ kind: /** @type {"slide"} */ ("slide"), data })),
    ...questions.map((data) => ({ kind: /** @type {"quiz"} */ ("quiz"), data })),
    ...cards.map((data) => ({ kind: /** @type {"flash"} */ ("flash"), data })),
  ];
  shuffleInPlace(steps);

  let index = 0;
  let correct = 0;
  let wrong = 0;
  /** @type {number | null} */
  let quizSelected = null;
  let quizRevealed = false;

  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz exp-shell-mixed";

  const titleText = quizData.title || slideData.title || bundle.title || "Full set — ôn tập trộn";

  const onAi = () => {
    const step = steps[index];
    if (!step || step.kind !== "quiz" || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftQuiz(quizMeta, index, step.data));
  };

  shell.appendChild(
    createExperienceTopBar({
      title: titleText,
      onAiEdit: deps?.onAiEdit ? onAi : undefined,
    }),
  );

  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  const sum = steps.length;
  summary.textContent =
    `Full set — ${topic} | Trình độ: ${spec.level || "—"} | ` +
    `Slide ${spec.slides} + Quiz ${spec.quiz} + Flash ${spec.flash} = ${sum} mục (trộn lẫn)${notesLine}`;

  const total = Math.max(1, steps.length);
  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });

  const stage = document.createElement("div");
  stage.className = "exp-stage";

  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(nextBtn);

  function renderStep() {
    const step = steps[index];
    stage.innerHTML = "";
    quizSelected = null;
    quizRevealed = false;

    if (!step) {
      stage.innerHTML = `<p class="exp-empty">Không có học liệu trong bộ Full set.</p>`;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      progress.paint({ total, index: Math.max(0, index), correct, wrong });
      return;
    }

    const badge = document.createElement("div");
    badge.className = "exp-mixed-kind-badge";
    badge.textContent =
      step.kind === "quiz" ? "Trắc nghiệm" : step.kind === "slide" ? "Slide bài giảng" : "Flashcard";
    stage.appendChild(badge);

    if (step.kind === "slide") {
      const s = step.data;
      const h = document.createElement("h2");
      h.className = "exp-slide-title";
      h.textContent = s.title || "";
      const ul = document.createElement("ul");
      ul.className = "exp-slide-bullets";
      (s.bullets || []).forEach((line) => {
        const li = document.createElement("li");
        li.textContent = line;
        ul.appendChild(li);
      });
      stage.appendChild(h);
      stage.appendChild(ul);
      nextBtn.disabled = false;
    } else if (step.kind === "flash") {
      const c = step.data;
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
      inner.addEventListener("click", () => inner.classList.toggle("flipped"));
      inner.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inner.classList.toggle("flipped");
        }
      });
      frame.appendChild(inner);
      wrap.appendChild(frame);
      stage.appendChild(wrap);
      nextBtn.disabled = false;
    } else {
      const q = step.data;
      const num = document.createElement("div");
      num.className = "exp-q-number";
      num.textContent = `${index + 1}.`;
      const text = document.createElement("p");
      text.className = "exp-q-text";
      text.innerHTML = quizStemToSafeHtml(q.text || "");
      const optsWrap = document.createElement("div");
      optsWrap.className = "exp-option-grid";
      const letters = ["A", "B", "C", "D", "E", "F"];
      (q.options || []).forEach((opt, j) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "exp-opt-btn";
        b.textContent = `${letters[j] || j}. ${opt}`;
        b.addEventListener("click", () => {
          quizSelected = j;
          optsWrap.querySelectorAll(".exp-opt-btn").forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
          nextBtn.disabled = false;
        });
        optsWrap.appendChild(b);
      });
      const hintToggle = document.createElement("button");
      hintToggle.type = "button";
      hintToggle.className = "exp-hint-toggle";
      hintToggle.innerHTML = `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;
      const hintPanel = document.createElement("div");
      hintPanel.className = "exp-hint-panel";
      hintPanel.hidden = true;
      hintPanel.textContent = q.hint || "(Chưa có gợi ý.)";
      let hintOpen = false;
      hintToggle.addEventListener("click", () => {
        hintOpen = !hintOpen;
        hintPanel.hidden = !hintOpen;
        hintToggle.innerHTML = hintOpen
          ? `Ẩn gợi ý <span class="exp-chevron exp-chevron-up" aria-hidden="true">▾</span>`
          : `Hiện gợi ý <span class="exp-chevron" aria-hidden="true">▾</span>`;
      });
      stage.appendChild(num);
      stage.appendChild(text);
      stage.appendChild(optsWrap);
      stage.appendChild(hintToggle);
      stage.appendChild(hintPanel);
      nextBtn.disabled = true;
    }

    progress.paint({ total, index, correct, wrong });
    nextBtn.textContent = index >= total - 1 ? "Kết thúc" : "Tiếp theo";
  }

  nextBtn.addEventListener("click", () => {
    const step = steps[index];
    if (!step) return;

    if (step.kind === "quiz") {
      const q = step.data;
      if (!quizRevealed) {
        if (quizSelected === null) return;
        const ok = quizSelected === q.correctIndex;
        if (ok) correct += 1;
        else wrong += 1;
        quizRevealed = true;
        progress.paint({ total, index, correct, wrong });
        const buttons = stage.querySelectorAll(".exp-opt-btn");
        buttons.forEach((btn, j) => {
          if (j === q.correctIndex) btn.classList.add("correct");
          if (j === quizSelected && j !== q.correctIndex) btn.classList.add("wrong");
          /** @type {HTMLButtonElement} */ (btn).disabled = true;
        });
        nextBtn.textContent = index >= total - 1 ? "Kết thúc" : "Tiếp theo";
        nextBtn.disabled = false;
        return;
      }
      if (index >= total - 1) {
        nextBtn.disabled = true;
        return;
      }
      index += 1;
      renderStep();
      return;
    }

    if (index >= total - 1) {
      nextBtn.disabled = true;
      return;
    }
    index += 1;
    renderStep();
  });

  shell.appendChild(summary);
  shell.appendChild(progress.wrap);
  shell.appendChild(stage);
  shell.appendChild(footer);
  root.appendChild(shell);
  renderStep();
}

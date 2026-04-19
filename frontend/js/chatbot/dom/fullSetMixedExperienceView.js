import { fetchMockResource } from "../services/mockContentApi.js";
import { prepareQuizSessionData, prepareSlideSessionData, prepareFlashSessionData, shuffleInPlace } from "../services/sessionContentPrep.js";
import { resolveSlideShellFilename } from "../data/slideThemeShellMap.js";
import { fetchSlideShellHtml } from "../slide/slideShellLoad.js";
import { buildSlideDeckSrcdoc, setSlideShellNavMode, syncShellSlideNav } from "../slide/slideShellSrcdoc.js";
import { createExperienceTopBar, createProgressRow, createPrimaryNavButton } from "./experienceChrome.js";
import { buildQuizStepOrder, buildAiDraftQuiz, initMixedQuizTracking, recomputeMixedQuizScore, quizCorrectOptionIndex, quizOptionList } from "../services/fullSetMixedService.js";
import { hookFlashSpeechVoicesOnce } from "../services/speechService.js";
import { applyQuizRevealStyles, createStepBadge, renderFlashStep, renderQuizStep, renderSlideStep } from "./fullSetMixedStepView.js";
import { renderFullSetMixedReviewView } from "./fullSetMixedReviewView.js";

/**
 * @typedef {{ topic: string, level: string, slides: string, quiz: string, flash: string, extra?: string, slideTemplate?: string }} FullSetMixedSpec
 */

/**
 * @param {{ body: HTMLElement, prepareShow: () => void }} layerView
 * @param {{ title?: string, spec: FullSetMixedSpec }} bundle
 * @param {{ onAiEdit?: (draft: string) => void, onContinueCreate?: (kind: "fullset"|"slide"|"quiz"|"flash", opts?: { preset?: "same"|"other" }) => void | Promise<void> }} [deps]
 * @param {{ initialState?: any, onStateChange?: (state: any) => void }} [opts]
 */
export async function mountFullSetMixedExperience(layerView, bundle, deps, opts = {}) {
  layerView.prepareShow();
  hookFlashSpeechVoicesOnce();
  const root = layerView.body;
  root.innerHTML = "";
  const spec = bundle.spec || {};
  const topic = spec.topic || "—";
  const notesLine = spec.extra ? ` | Yêu cầu thêm: ${spec.extra}` : "";
  const slideNotes =
    spec.slideTemplate
      ? `Mẫu slide: ${spec.slideTemplate} | Full set (demo mock)`
      : "Full set (demo mock)";
  const slideMeta = { topic, count: spec.slides, notes: slideNotes };
  const quizMeta = { topic, count: spec.quiz, notes: "Full set (demo mock)" };
  const flashMeta = { source: topic, count: spec.flash, extra: "Full set (demo mock)" };
  const [rawSlide, rawQuiz, rawFlash] = await Promise.all([fetchMockResource("slide"), fetchMockResource("quiz"), fetchMockResource("flashcard")]);
  const slideData = prepareSlideSessionData(rawSlide, slideMeta);
  const quizData = prepareQuizSessionData(rawQuiz, quizMeta);
  const flashData = prepareFlashSessionData(rawFlash, flashMeta);
  const slides = Array.isArray(slideData.slides) ? slideData.slides : [];
  const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
  const cards = Array.isArray(flashData.cards) ? flashData.cards : [];
  /** Một bước slide = cả bộ trong iframe (giống thẻ Slide), tránh lặp một slide. */
  /** @type {{ kind: "slide_deck"|"quiz"|"flash", data: any }[]} */
  const steps = [
    ...(slides.length ? [{ kind: /** @type {"slide_deck"} */ ("slide_deck"), data: { slides } }] : []),
    ...questions.map((data) => ({ kind: /** @type {"quiz"} */ ("quiz"), data })),
    ...cards.map((data) => ({ kind: /** @type {"flash"} */ ("flash"), data })),
  ];
  shuffleInPlace(steps);
  const initial = opts.initialState && typeof opts.initialState === "object" ? opts.initialState : null;
  let index = Number.isFinite(Number(initial?.index)) ? Math.floor(Number(initial.index)) : 0;
  let correct = 0;
  let wrong = 0;
  let reviewMode = Boolean(initial?.reviewMode);
  /** @type {"all"|"wrong"} */
  let reviewFilter = initial?.reviewFilter === "wrong" ? "wrong" : "all";
  /** @type {number | null} */
  let quizSelected = null;
  let quizRevealed = false;
  const { quizSelectedByStep, quizRevealedByStep, quizCountedByStep, quizCorrectByStep } = initMixedQuizTracking(steps.length, initial);
  const { quizStepIndexes, quizOrderByStep } = buildQuizStepOrder(steps);
  index = Math.min(Math.max(0, index), Math.max(0, steps.length - 1));
  /** Tăng mỗi lần render bước — hủy tải iframe slide khi đã chuyển bước. */
  let renderStepGen = 0;
  /** Gỡ listener Trình chiếu/Lướt/toàn màn hình của bước slide trước. */
  let slideUiAbort = null;
  /** Chỉ số slide trong bộ khi bước hiện tại là `slide_deck` (0..n-1). */
  let slideDeckIndex = Number.isFinite(Number(initial?.slideDeckIndex))
    ? Math.floor(Number(initial.slideDeckIndex))
    : 0;
  /** Sau khi iframe slide_deck load xong — dùng cho nút footer / đồng bộ. */
  let activeSlideDeckShell = null;
  const shell = document.createElement("div");
  shell.className = "exp-shell exp-shell-quiz exp-shell-mixed";
  const titleText = quizData.title || slideData.title || bundle.title || "Full set — ôn tập trộn";
  const onAi = () => {
    const step = steps[index];
    if (!step || step.kind !== "quiz" || !deps?.onAiEdit) return;
    deps.onAiEdit(buildAiDraftQuiz(quizMeta, index, step.data));
  };
  shell.appendChild(createExperienceTopBar({ title: titleText, onAiEdit: deps?.onAiEdit ? onAi : undefined }).bar);
  const summary = document.createElement("p");
  summary.className = "exp-meta-line";
  const sum = slides.length + questions.length + cards.length;
  const templateSeg = spec.slideTemplate ? ` | Mẫu slide: ${spec.slideTemplate}` : "";
  summary.textContent = `Full set — ${topic} | Trình độ: ${spec.level || "—"}${templateSeg} | Slide ${spec.slides} + Quiz ${spec.quiz} + Flash ${spec.flash} = ${sum} mục (trộn lẫn)${notesLine}`;
  const total = Math.max(1, steps.length);
  const progress = createProgressRow({ total, index: 0, correct: 0, wrong: 0 });
  const stage = document.createElement("div");
  stage.className = "exp-stage";
  const footer = document.createElement("div");
  footer.className = "exp-footer-bar";
  const backBtn = createPrimaryNavButton({ label: "Quay lại", disabled: true });
  backBtn.classList.add("exp-back-btn");
  const nextBtn = createPrimaryNavButton({ label: "Tiếp theo", disabled: true });
  footer.appendChild(backBtn);
  footer.appendChild(nextBtn);
  function refreshScore() {
    const score = recomputeMixedQuizScore(quizCountedByStep, quizCorrectByStep);
    correct = score.correct;
    wrong = score.wrong;
  }
  function syncScoreAndEmit() {
    refreshScore();
    emitState();
  }
  function emitState() {
    if (typeof opts.onStateChange !== "function") return;
    opts.onStateChange({
      kind: "fullset",
      title: titleText,
      spec: { ...spec },
      total: steps.length,
      index,
      quizSelectedByStep: [...quizSelectedByStep],
      quizRevealedByStep: [...quizRevealedByStep],
      quizCountedByStep: [...quizCountedByStep],
      quizCorrectByStep: [...quizCorrectByStep],
      reviewMode,
      reviewFilter,
      correct,
      wrong,
      slideDeckIndex,
    });
  }
  function exitReviewToLastStep() {
    reviewMode = false;
    index = Math.max(0, steps.length - 1);
    footer.hidden = false;
    renderStep();
  }
  function renderReview() {
    slideUiAbort?.abort();
    slideUiAbort = null;
    activeSlideDeckShell = null;
    shell.classList.remove("exp-shell-slide");
    stage.className = "exp-stage";
    footer.hidden = true;
    refreshScore();
    progress.paint({ total, index: Math.max(0, steps.length - 1), correct, wrong });
    renderFullSetMixedReviewView({
      stage,
      steps,
      quizStepIndexes,
      quizOrderByStep,
      quizSelectedByStep,
      quizCountedByStep,
      quizCorrectByStep,
      reviewFilter,
      correct,
      wrong,
      onBackToStep: exitReviewToLastStep,
      onCreateOther: () => deps?.onContinueCreate?.("fullset", { preset: "other" }),
      onContinueCreate: () => deps?.onContinueCreate?.("fullset", { preset: "same" }),
      onFilterChange: (filter) => {
        reviewFilter = filter;
        renderReview();
      },
    });
    emitState();
  }
  function refreshMixedNavChrome() {
    const st = steps[index];
    if (st?.kind === "slide_deck") {
      const dl = (st.data.slides || []).length;
      const atFirst = dl === 0 || slideDeckIndex <= 0;
      const atLast = dl > 0 && slideDeckIndex >= dl - 1;
      backBtn.disabled = index <= 0 && atFirst;
      nextBtn.textContent = index >= total - 1 && atLast ? "Tiếp tục tạo" : "Tiếp theo";
    } else {
      backBtn.disabled = index <= 0;
      nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
    }
  }
  function renderStep() {
    if (reviewMode) {
      renderReview();
      return;
    }
    slideUiAbort?.abort();
    slideUiAbort = null;
    activeSlideDeckShell = null;
    footer.hidden = false;
    const step = steps[index];
    stage.innerHTML = "";
    renderStepGen += 1;
    const myGen = renderStepGen;
    backBtn.textContent = "Quay lại";
    quizSelected = quizSelectedByStep[index] ?? null;
    quizRevealed = !!quizRevealedByStep[index];
    refreshScore();
    if (!step) {
      shell.classList.remove("exp-shell-slide");
      stage.className = "exp-stage";
      stage.innerHTML = `<p class="exp-empty">Không có học liệu trong bộ Full set.</p>`;
      backBtn.disabled = true;
      nextBtn.textContent = "—";
      nextBtn.disabled = true;
      progress.paint({ total, index: Math.max(0, index), correct, wrong });
      return;
    }
    stage.appendChild(createStepBadge(step.kind));
    if (step.kind === "slide_deck") {
      shell.classList.add("exp-shell-slide");
      stage.className = "exp-stage exp-slide-stage";
      nextBtn.disabled = true;
      slideUiAbort = new AbortController();
      const uiSignal = slideUiAbort.signal;

      const deckSlides = Array.isArray(step.data?.slides) ? step.data.slides : [];
      if (deckSlides.length) {
        slideDeckIndex = Math.min(Math.max(0, slideDeckIndex), deckSlides.length - 1);
      } else {
        slideDeckIndex = 0;
      }

      const host = document.createElement("div");
      host.className = "exp-mixed-slide-host";

      if (!deckSlides.length) {
        host.innerHTML = `<p class="exp-empty">Không có slide trong bộ.</p>`;
        stage.appendChild(host);
        nextBtn.disabled = false;
        refreshMixedNavChrome();
      } else {
        const loading = document.createElement("p");
        loading.className = "exp-meta-line";
        loading.textContent = "Đang tải giao diện slide…";

        const deckHint = document.createElement("p");
        deckHint.className = "exp-meta-line";
        function paintDeckHint() {
          deckHint.textContent = `Trong bộ: ${slideDeckIndex + 1} / ${deckSlides.length}`;
        }
        paintDeckHint();

        const modeBar = document.createElement("div");
        modeBar.className = "exp-slide-mode-bar";
        modeBar.hidden = true;
        const modePresBtn = document.createElement("button");
        modePresBtn.type = "button";
        modePresBtn.className = "exp-slide-mode-btn";
        modePresBtn.textContent = "Trình chiếu";
        modePresBtn.setAttribute("aria-pressed", "true");
        const modeScrollBtn = document.createElement("button");
        modeScrollBtn.type = "button";
        modeScrollBtn.className = "exp-slide-mode-btn";
        modeScrollBtn.textContent = "Lướt";
        modeScrollBtn.setAttribute("aria-pressed", "false");
        modeBar.append(modePresBtn, modeScrollBtn);

        const viewport = document.createElement("div");
        viewport.className = "exp-slide-viewport";

        const fsBtn = document.createElement("button");
        fsBtn.type = "button";
        fsBtn.className = "exp-slide-fs-btn";
        fsBtn.setAttribute("aria-label", "Toàn màn hình");
        fsBtn.title = "Toàn màn hình (chế độ Trình chiếu)";
        fsBtn.hidden = true;
        fsBtn.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10-18h3a2 2 0 0 1 2 2v3M3 8V5a2 2 0 0 1 2-2h3"/></svg>';

        const prevArrow = document.createElement("button");
        prevArrow.type = "button";
        prevArrow.className = "exp-slide-arrow exp-slide-arrow--prev";
        prevArrow.setAttribute("aria-label", "Slide trước");
        prevArrow.textContent = "←";
        prevArrow.hidden = true;

        const nextArrow = document.createElement("button");
        nextArrow.type = "button";
        nextArrow.className = "exp-slide-arrow exp-slide-arrow--next";
        nextArrow.setAttribute("aria-label", "Slide sau");
        nextArrow.textContent = "→";
        nextArrow.hidden = true;

        const iframe = document.createElement("iframe");
        iframe.className = "exp-slide-shell-iframe";
        iframe.setAttribute("title", "Bộ slide");
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
        iframe.style.border = "0";
        iframe.style.display = "none";

        viewport.append(iframe, prevArrow, nextArrow, fsBtn);
        host.append(loading, deckHint, modeBar, viewport);
        stage.appendChild(host);

        let shellReady = false;
        /** @type {"presentation" | "scroll"} */
        let viewMode = "presentation";
        let suppressArrowNavUntil = 0;

        function syncViewModeToIframe() {
          if (!shellReady) return;
          setSlideShellNavMode(iframe, viewMode === "scroll" ? "scroll" : "active", slideDeckIndex);
        }

        function paintSlideChrome() {
          const pres = viewMode === "presentation";
          modePresBtn.setAttribute("aria-pressed", pres ? "true" : "false");
          modeScrollBtn.setAttribute("aria-pressed", pres ? "false" : "true");
          modePresBtn.classList.toggle("is-selected", pres);
          modeScrollBtn.classList.toggle("is-selected", !pres);
          prevArrow.disabled = slideDeckIndex <= 0;
          nextArrow.disabled = slideDeckIndex >= deckSlides.length - 1;
          prevArrow.hidden = !pres || !shellReady;
          nextArrow.hidden = !pres || !shellReady;
          fsBtn.hidden = !pres || !shellReady;
          modeBar.hidden = !shellReady;
          paintDeckHint();
        }

        function applyViewMode(next) {
          if (document.fullscreenElement === viewport) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (typeof exit === "function") void exit.call(document);
          }
          viewMode = next;
          syncViewModeToIframe();
          paintSlideChrome();
        }

        function bumpDeck(delta) {
          const next = slideDeckIndex + delta;
          if (next < 0 || next >= deckSlides.length) return;
          slideDeckIndex = next;
          syncViewModeToIframe();
          syncShellSlideNav(iframe, slideDeckIndex);
          paintSlideChrome();
          emitState();
          refreshMixedNavChrome();
        }

        modePresBtn.addEventListener("click", () => applyViewMode("presentation"), { signal: uiSignal });
        modeScrollBtn.addEventListener("click", () => applyViewMode("scroll"), { signal: uiSignal });

        prevArrow.addEventListener("click", () => bumpDeck(-1), { signal: uiSignal });
        nextArrow.addEventListener("click", () => bumpDeck(1), { signal: uiSignal });

        fsBtn.addEventListener(
          "click",
          () => {
            if (!shellReady || viewMode !== "presentation") return;
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            if (fsEl === viewport) {
              const exit = document.exitFullscreen || document.webkitExitFullscreen;
              if (typeof exit === "function") void exit.call(document);
              return;
            }
            const req = viewport.requestFullscreen || viewport.webkitRequestFullscreen;
            if (typeof req === "function") void req.call(viewport);
          },
          { signal: uiSignal },
        );

        function onFsChange() {
          suppressArrowNavUntil = performance.now() + 320;
          const fs = document.fullscreenElement === viewport || document.webkitFullscreenElement === viewport;
          fsBtn.setAttribute("aria-label", fs ? "Thoát toàn màn hình" : "Toàn màn hình");
          fsBtn.title = fs ? "Thoát toàn màn hình" : "Toàn màn hình (chế độ Trình chiếu)";
          fsBtn.innerHTML = fs
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m10-18h3a2 2 0 0 1 2 2v3M3 8V5a2 2 0 0 1 2-2h3"/></svg>';
        }
        document.addEventListener("fullscreenchange", onFsChange, { signal: uiSignal });

        function onDocKeydown(e) {
          const layer = document.getElementById("experienceLayer");
          if (!layer?.classList.contains("visible") || !shellReady || viewMode !== "presentation") return;
          if (performance.now() < suppressArrowNavUntil) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            bumpDeck(-1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            bumpDeck(1);
          }
        }
        document.addEventListener("keydown", onDocKeydown, { signal: uiSignal });

        (async () => {
          try {
            const file = resolveSlideShellFilename(spec.slideTemplate);
            const html = await fetchSlideShellHtml(file);
            const srcdoc = buildSlideDeckSrcdoc(html, deckSlides, {
              ...slideMeta,
              slideTemplate: String(spec.slideTemplate || ""),
              shellYear: String(new Date().getFullYear()),
              slideNavMode: "active",
            });
            if (myGen !== renderStepGen) return;
            const loadPromise = new Promise((resolve) => {
              iframe.addEventListener("load", resolve, { once: true });
            });
            iframe.srcdoc = srcdoc;
            await Promise.race([
              loadPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("iframe load timeout")), 6000)),
            ]);
            if (myGen !== renderStepGen) return;
            loading.remove();
            iframe.style.display = "";
            shellReady = true;
            viewMode = "presentation";
            syncViewModeToIframe();
            syncShellSlideNav(iframe, slideDeckIndex);
            paintSlideChrome();
            activeSlideDeckShell = {
              iframe,
              bumpDeck,
              syncViewModeToIframe,
              paintChrome: paintSlideChrome,
              deckLen: deckSlides.length,
            };
            nextBtn.disabled = false;
            refreshMixedNavChrome();
          } catch (err) {
            console.warn("[fullset-mixed] slide shell fallback", err);
            if (myGen !== renderStepGen) return;
            host.remove();
            slideUiAbort?.abort();
            slideUiAbort = null;
            shell.classList.remove("exp-shell-slide");
            stage.className = "exp-stage";
            deckSlides.forEach((s) => {
              renderSlideStep(stage, s);
            });
            nextBtn.disabled = false;
            refreshMixedNavChrome();
          }
        })();
      }
    } else if (step.kind === "flash") {
      shell.classList.remove("exp-shell-slide");
      stage.className = "exp-stage";
      renderFlashStep(stage, step.data);
      nextBtn.disabled = false;
    } else {
      shell.classList.remove("exp-shell-slide");
      stage.className = "exp-stage";
      const quizUi = renderQuizStep(stage, {
        index,
        question: step.data,
        selected: quizSelected,
        revealed: !!quizRevealedByStep[index],
        onPick: (pickedIndex) => {
          quizSelected = pickedIndex;
          quizSelectedByStep[index] = pickedIndex;
          nextBtn.disabled = false;
          syncScoreAndEmit();
        },
      });
      nextBtn.disabled = !quizUi.canProceed;
    }
    progress.paint({ total, index, correct, wrong });
    refreshMixedNavChrome();
    emitState();
  }
  nextBtn.addEventListener("click", () => {
    if (reviewMode) {
      void Promise.resolve(deps?.onContinueCreate?.("fullset"));
      return;
    }
    const step = steps[index];
    if (!step) return;
    if (step.kind === "slide_deck") {
      const ds = step.data.slides || [];
      if (!ds.length) return;
      if (slideDeckIndex < ds.length - 1) {
        if (!activeSlideDeckShell) return;
        activeSlideDeckShell.bumpDeck(1);
        return;
      }
      if (index >= total - 1) {
        if (quizStepIndexes.length === 0) {
          deps?.onContinueCreate?.("fullset");
          return;
        }
        reviewMode = true;
        reviewFilter = "all";
        renderReview();
        return;
      }
      index += 1;
      renderStep();
      return;
    }
    if (step.kind === "quiz") {
      const q = step.data;
      const opts = quizOptionList(q);
      const correctIdx = quizCorrectOptionIndex(q);
      if (opts.length === 0) {
        if (index >= total - 1) {
          nextBtn.disabled = true;
          return;
        }
        index += 1;
        renderStep();
        return;
      }
      if (!quizRevealed) {
        if (quizSelected == null || !Number.isFinite(Number(quizSelected))) return;
        const picked = Number(quizSelected);
        const ok = picked === correctIdx;
        quizRevealed = true;
        quizSelectedByStep[index] = picked;
        quizRevealedByStep[index] = true;
        if (!quizCountedByStep[index]) {
          quizCountedByStep[index] = true;
          quizCorrectByStep[index] = ok;
        }
        refreshScore();
        progress.paint({ total, index, correct, wrong });
        applyQuizRevealStyles(stage, q, picked);
        nextBtn.textContent = index >= total - 1 ? "Tiếp tục tạo" : "Tiếp theo";
        nextBtn.disabled = false;
        emitState();
        return;
      }
      if (index >= total - 1) {
        if (quizStepIndexes.length === 0) {
          deps?.onContinueCreate?.("fullset");
          return;
        }
        reviewMode = true;
        reviewFilter = "all";
        renderReview();
        return;
      }
      index += 1;
      renderStep();
      return;
    }
    if (index >= total - 1) {
      if (quizStepIndexes.length === 0) {
        deps?.onContinueCreate?.("fullset");
        return;
      }
      reviewMode = true;
      reviewFilter = "all";
      renderReview();
      return;
    }
    index += 1;
    renderStep();
  });
  backBtn.addEventListener("click", () => {
    if (reviewMode) {
      exitReviewToLastStep();
      return;
    }
    const step = steps[index];
    if (step?.kind === "slide_deck" && slideDeckIndex > 0) {
      if (!activeSlideDeckShell) return;
      activeSlideDeckShell.bumpDeck(-1);
      return;
    }
    if (index <= 0) return;
    index -= 1;
    renderStep();
  });
  shell.appendChild(summary);
  shell.appendChild(progress.wrap);
  shell.appendChild(stage);
  shell.appendChild(footer);
  root.appendChild(shell);
  renderStep();
}

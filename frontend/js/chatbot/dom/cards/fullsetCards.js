import { consumeNextMock, getAnyMock } from "../../data/sampleFlowData.js";
import { SLIDE_TEMPLATE_DEFAULT, SLIDE_TEMPLATE_OPTIONS } from "../../data/slideTemplateOptions.js";
import { DEFAULT_DIFFICULTY } from "../../constants.js";
import {
  MSG_SKIP_USE_SUBMIT,
  MSG_SKIP_PDF_HAS_FILE,
  MSG_AUTO_CONFIRM_PDF,
  addAutofillBtn,
  getAiAutofillHistory,
  addAiAutofillHistory,
  appendSelectOptions,
  coerceSelectThemeValue,
  coerceAllowedCount,
  el,
  flowTextarea,
  normalizeFullsetLevelAutofill,
  randomFullsetTripleSum40,
  removeSkipConfirm,
  showAutoConfirmPanel,
  showPartialFillConfirm,
  appendSelectPlaceholder,
  wrapField,
  wrapMini,
} from "./flowCardShared.js";
import { mountFlowMobileSelect } from "./flowMobileSelect.js";
import { populateSlideTemplateSelect } from "./slideTemplateSelect.js";
import { fetchAiAutofillTopic } from "../../services/aiContentApi.js";
import { setPendingPdfFile } from "../../pdfPrefillStore.js";
import { buildFormTitle } from "../../services/contentTitles.js";
import { createAutofillIntentTracker } from "./autofillIntent.js";

const FULLSET_SLIDE_COUNT_OPTIONS = ["10", "20"];
const FULLSET_QUIZ_COUNT_OPTIONS = ["10", "20"];
const FULLSET_FLASH_COUNT_OPTIONS = ["10", "20"];
const FULLSET_DEFAULT_COUNTS = { slides: "10", quiz: "20", flash: "10" };
const FULLSET_VALID_COUNT_COMBOS = [
  { slides: "10", quiz: "10", flash: "10" },
  { slides: "10", quiz: "10", flash: "20" },
  { slides: "10", quiz: "20", flash: "10" },
  { slides: "20", quiz: "10", flash: "10" },
];

function coerceFullsetCountCombo(slideRaw, quizRaw, flashRaw) {
  const safeSlide = Number(coerceAllowedCount(slideRaw, FULLSET_SLIDE_COUNT_OPTIONS, FULLSET_DEFAULT_COUNTS.slides));
  const safeQuiz = Number(coerceAllowedCount(quizRaw, FULLSET_QUIZ_COUNT_OPTIONS, FULLSET_DEFAULT_COUNTS.quiz));
  const safeFlash = Number(coerceAllowedCount(flashRaw, FULLSET_FLASH_COUNT_OPTIONS, FULLSET_DEFAULT_COUNTS.flash));

  let best = FULLSET_VALID_COUNT_COMBOS[0];
  let bestScore = Number.POSITIVE_INFINITY;
  FULLSET_VALID_COUNT_COMBOS.forEach((combo) => {
    const score =
      Math.abs(Number(combo.slides) - safeSlide) +
      Math.abs(Number(combo.quiz) - safeQuiz) +
      Math.abs(Number(combo.flash) - safeFlash);
    if (score < bestScore) {
      best = combo;
      bestScore = score;
    }
  });
  return best;
}

export function createFullsetTopicCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  const titleEl = el("div", "flow-card-title", buildFormTitle("fullset"));
  root.appendChild(titleEl);
  const autofillIntent = createAutofillIntentTracker();
  const refreshTitle = () => {
    titleEl.textContent = buildFormTitle("fullset", topic.value);
  };

  const topic = flowTextarea("VD: Ôn tập đọc hiểu — chủ đề môi trường", 2);
  root.appendChild(wrapField("Chủ đề", topic, "Nhập tên bài học"));

  const level = el("select", "flow-select");
  appendSelectPlaceholder(level, "Chọn trình độ…");
  ["Mất gốc", "Cơ bản", "Khá", "Nâng cao"].forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    level.appendChild(o);
  });
  const levelMobileSelect = mountFlowMobileSelect(level);
  root.appendChild(wrapField("Trình độ", levelMobileSelect.control));

  const slideTemplate = el("select", "flow-select");
  populateSlideTemplateSelect(slideTemplate);
  const slideTemplateMobileSelect = mountFlowMobileSelect(slideTemplate);
  root.appendChild(
    wrapField(
      "Mẫu slide",
      slideTemplateMobileSelect.control,
      "Chọn mẫu giao diện slide (giống form tạo slide).",
    ),
  );

  const slides = el("select", "flow-select");
  appendSelectPlaceholder(slides, "Slide");
  appendSelectOptions(slides, FULLSET_SLIDE_COUNT_OPTIONS);
  const slidesMobileSelect = mountFlowMobileSelect(slides);
  const quiz = el("select", "flow-select");
  appendSelectPlaceholder(quiz, "Quiz");
  appendSelectOptions(quiz, FULLSET_QUIZ_COUNT_OPTIONS);
  const quizMobileSelect = mountFlowMobileSelect(quiz);
  const flash = el("select", "flow-select");
  appendSelectPlaceholder(flash, "Flashcard");
  appendSelectOptions(flash, FULLSET_FLASH_COUNT_OPTIONS);
  const flashMobileSelect = mountFlowMobileSelect(flash);
  const qtyWrap = el("div", "flow-field");
  qtyWrap.appendChild(el("span", "flow-label", "Số lượng (tổng max 40)"));
  const row = el("div", "flow-row-3");
  row.appendChild(wrapMini("Số slide", slidesMobileSelect.control));
  row.appendChild(wrapMini("Số câu Quiz", quizMobileSelect.control));
  row.appendChild(wrapMini("Số Flashcard", flashMobileSelect.control));
  qtyWrap.appendChild(row);
  qtyWrap.appendChild(
    el("p", "flow-hint", "Chọn các tổ hợp hợp lệ có sẵn để tổng không vượt 40 mục."),
  );
  root.appendChild(qtyWrap);

  const extra = flowTextarea("VD: Tông giọng hài hước, có minigame…", 3);
  root.appendChild(wrapField("Yêu cầu thêm", extra, ""));

  const prefill = deps?.prefill && typeof deps.prefill === "object" ? deps.prefill : {};
  if (typeof prefill.topic === "string") topic.value = prefill.topic;
  if (typeof prefill.level === "string") {
    level.value = prefill.level;
    levelMobileSelect.sync();
  }
  if (typeof prefill.slideTemplate === "string") {
    slideTemplate.value = prefill.slideTemplate;
    slideTemplateMobileSelect.sync();
  }
  if (
    typeof prefill.slides === "string" ||
    Number.isFinite(Number(prefill.slides)) ||
    typeof prefill.quiz === "string" ||
    Number.isFinite(Number(prefill.quiz)) ||
    typeof prefill.flash === "string" ||
    Number.isFinite(Number(prefill.flash))
  ) {
    const combo = coerceFullsetCountCombo(prefill.slides, prefill.quiz, prefill.flash);
    slides.value = combo.slides;
    quiz.value = combo.quiz;
    flash.value = combo.flash;
    slidesMobileSelect.sync();
    quizMobileSelect.sync();
    flashMobileSelect.sync();
  }
  if (typeof prefill.extra === "string") extra.value = prefill.extra;
  refreshTitle();
  topic.addEventListener("input", refreshTitle);

  function currentAutofillComparableState() {
    return {
      topic: topic.value,
      level: level.value,
      slideTemplate: slideTemplate.value,
      slides: slides.value,
      quiz: quiz.value,
      flash: flash.value,
      extra: extra.value,
    };
  }

  addAutofillBtn(root, async () => {
    const sample = consumeNextMock("fullset");
    if (sample) {
      const combo = coerceFullsetCountCombo(sample.s, sample.q, sample.f);
      topic.value = String(sample.t ?? "");
      level.value = normalizeFullsetLevelAutofill(sample.l);
      levelMobileSelect.sync();
      slideTemplate.value = coerceSelectThemeValue(SLIDE_TEMPLATE_OPTIONS, sample.m, SLIDE_TEMPLATE_DEFAULT);
      slideTemplateMobileSelect.sync();
      slides.value = combo.slides;
      quiz.value = combo.quiz;
      flash.value = combo.flash;
      slidesMobileSelect.sync();
      quizMobileSelect.sync();
      flashMobileSelect.sync();
      extra.value = String(sample.e ?? "");
      refreshTitle();
      autofillIntent.remember(currentAutofillComparableState());
      return "mock";
    } else {
      try {
        const ai = await fetchAiAutofillTopic("fullset", getAiAutofillHistory("fullset"));
        topic.value = String(ai.topic ?? "");
        addAiAutofillHistory("fullset", ai.topic);
        if (ai.level) {
          level.value = normalizeFullsetLevelAutofill(ai.level);
          levelMobileSelect.sync();
        }
        const combo = coerceFullsetCountCombo(ai.slides, ai.quiz, ai.flash);
        slides.value = combo.slides;
        quiz.value = combo.quiz;
        flash.value = combo.flash;
        slidesMobileSelect.sync();
        quizMobileSelect.sync();
        flashMobileSelect.sync();
        extra.value = String(ai.extra ?? "");
        refreshTitle();
        autofillIntent.remember(currentAutofillComparableState());
        return "ai";
      } catch {
        const fb = getAnyMock("fullset");
        const combo = coerceFullsetCountCombo(fb.s, fb.q, fb.f);
        topic.value = String(fb.t ?? "");
        level.value = normalizeFullsetLevelAutofill(fb.l);
        levelMobileSelect.sync();
        slideTemplate.value = coerceSelectThemeValue(SLIDE_TEMPLATE_OPTIONS, fb.m, SLIDE_TEMPLATE_DEFAULT);
        slideTemplateMobileSelect.sync();
        slides.value = combo.slides;
        quiz.value = combo.quiz;
        flash.value = combo.flash;
        slidesMobileSelect.sync();
        quizMobileSelect.sync();
        flashMobileSelect.sync();
        extra.value = String(fb.e ?? "");
        refreshTitle();
        autofillIntent.remember(currentAutofillComparableState());
        return "mock";
      }
    }
  });

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const skip = el("button", "flow-secondary-btn", "Bỏ qua");
  skip.type = "button";
  const submit = el("button", "flow-primary-btn", "Gửi thông tin");
  submit.type = "button";
  actions.appendChild(submit);
  actions.appendChild(skip);
  root.appendChild(actions);

  function readFullsetState() {
    const t = topic.value.trim();
    const lv = level.value;
    const stpl = slideTemplate.value;
    const s = slides.value.trim();
    const q = quiz.value.trim();
    const f = flash.value.trim();
    const ex = extra.value.trim();
    const sn = Number(s);
    const qn = Number(q);
    const fn = Number(f);
    const sumOk = Number.isFinite(sn) && Number.isFinite(qn) && Number.isFinite(fn) && sn + qn + fn <= 40;
    const complete =
      Boolean(t) &&
      Boolean(lv) &&
      Boolean(stpl) &&
      FULLSET_SLIDE_COUNT_OPTIONS.includes(s) &&
      FULLSET_QUIZ_COUNT_OPTIONS.includes(q) &&
      FULLSET_FLASH_COUNT_OPTIONS.includes(f) &&
      Number.isFinite(sn) &&
      sn >= 10 &&
      Number.isFinite(qn) &&
      qn >= 10 &&
      Number.isFinite(fn) &&
      fn >= 10 &&
      sumOk;
    return { t, lv, s, q, f, ex, complete };
  }

  function resolveFullsetCounts(slideRaw, quizRaw, flashRaw) {
    const hasSlide = Boolean(slideRaw);
    const hasQuiz = Boolean(quizRaw);
    const hasFlash = Boolean(flashRaw);
    const sn = hasSlide ? Number(slideRaw) : null;
    const qn = hasQuiz ? Number(quizRaw) : null;
    const fn = hasFlash ? Number(flashRaw) : null;

    if (hasSlide && (!Number.isFinite(sn) || !FULLSET_SLIDE_COUNT_OPTIONS.includes(slideRaw))) {
      return { ok: false, message: "Số slide trong Full Set chỉ có thể là 10 hoặc 20." };
    }
    if (hasQuiz && (!Number.isFinite(qn) || !FULLSET_QUIZ_COUNT_OPTIONS.includes(quizRaw))) {
      return { ok: false, message: "Số câu Quiz trong Full Set chỉ có thể là 10 hoặc 20." };
    }
    if (hasFlash && (!Number.isFinite(fn) || !FULLSET_FLASH_COUNT_OPTIONS.includes(flashRaw))) {
      return { ok: false, message: "Số Flashcard trong Full Set chỉ có thể là 10 hoặc 20." };
    }
    if (hasSlide && hasQuiz && hasFlash) {
      const total = sn + qn + fn;
      if (total > 40) {
        return {
          ok: false,
          message: `Tổng số lượng (slide + quiz + flashcard) đang là ${total}, vượt quá 40. Vui lòng giảm bớt và nhập lại.`,
        };
      }
    }
    const combo = coerceFullsetCountCombo(
      hasSlide ? slideRaw : FULLSET_DEFAULT_COUNTS.slides,
      hasQuiz ? quizRaw : FULLSET_DEFAULT_COUNTS.quiz,
      hasFlash ? flashRaw : FULLSET_DEFAULT_COUNTS.flash,
    );
    return { ok: true, slides: combo.slides, quiz: combo.quiz, flash: combo.flash };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    err.textContent = "";
    const st = readFullsetState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    const { sn, qn, fn } = randomFullsetTripleSum40();
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      topic: "(Teachly tự động)",
      level: DEFAULT_DIFFICULTY,
      slideTemplate: SLIDE_TEMPLATE_DEFAULT,
      slides: String(coerceFullsetCountCombo(sn, qn, fn).slides),
      quiz: String(coerceFullsetCountCombo(sn, qn, fn).quiz),
      flash: String(coerceFullsetCountCombo(sn, qn, fn).flash),
      extra: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    err.textContent = "";
    const slideRaw = slides.value.trim();
    const quizRaw = quiz.value.trim();
    const flashRaw = flash.value.trim();
    const resolvedCounts = resolveFullsetCounts(slideRaw, quizRaw, flashRaw);
    if (!resolvedCounts.ok) {
      err.textContent = resolvedCounts.message;
      err.style.display = "block";
      return;
    }
    const t = topic.value.trim();
    const lv = level.value;
    const stpl = slideTemplate.value;
    const extraValue = extra.value.trim();
    const hasAnyInput = Boolean(t || lv || stpl || slideRaw || quizRaw || flashRaw || extraValue);
    if (!hasAnyInput) {
      err.textContent = "Vui lòng nhập ít nhất một thông tin hoặc nhấn Bỏ qua.";
      err.style.display = "block";
      return;
    }
    if (t && lv && stpl && slideRaw && quizRaw && flashRaw) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit(autofillIntent.applyToPayload({
        topic: t,
        level: lv,
        slideTemplate: stpl,
        slides: resolvedCounts.slides,
        quiz: resolvedCounts.quiz,
        flash: resolvedCounts.flash,
        extra: extraValue,
      }, currentAutofillComparableState()));
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit(autofillIntent.applyToPayload({
        topic: t || "(Teachly tự động)",
        level: lv || DEFAULT_DIFFICULTY,
        slideTemplate: stpl || SLIDE_TEMPLATE_DEFAULT,
        slides: resolvedCounts.slides,
        quiz: resolvedCounts.quiz,
        flash: resolvedCounts.flash,
        extra: extraValue,
      }, currentAutofillComparableState()));
    });
  });

  return root;
}

export function createFullsetPdfCard(deps) {
  const root = el("div", "flow-card");
  root.appendChild(el("div", "flow-card-title", "Tải lên file"));

  const hint = el(
    "p",
    "flow-hint",
    "Hỗ trợ: PDF, DOCX, MD, TXT, ảnh (JPG, PNG, WEBP…) — tối đa 20 trang / 10 MB. Ảnh cần có chữ rõ để Teachly đọc và tạo Full Set.",
  );
  root.appendChild(hint);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.md,.txt,.docx,.jpg,.jpeg,.png,.webp,.gif,.bmp,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*";
  input.style.display = "none";

  const name = el("span", "flow-file-name", "Chưa chọn tệp");
  const pick = el("button", "flow-secondary-btn", "Chọn file");
  pick.type = "button";

  const row = el("div", "flow-file-row");
  row.appendChild(pick);
  row.appendChild(name);
  root.appendChild(row);
  root.appendChild(input);

  pick.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const f = input.files && input.files[0];
    name.textContent = f ? f.name : "Chưa chọn tệp";
  });

  addAutofillBtn(root, () => {
    const mockFile = new File(["dummy content"], "de_on_tap_anh_van.pdf", { type: "application/pdf" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(mockFile);
    input.files = dataTransfer.files;
    name.textContent = mockFile.name;
    input.dispatchEvent(new Event("change"));
  });

  if (deps.initialFile) {
    try {
      const dt = new DataTransfer();
      dt.items.add(deps.initialFile);
      input.files = dt.files;
      name.textContent = deps.initialFile.name;
    } catch {
      name.textContent = "Chưa chọn tệp";
    }
  }

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const skip = el("button", "flow-secondary-btn", "Bỏ qua");
  skip.type = "button";
  const submit = el("button", "flow-primary-btn", "Xác nhận tệp");
  submit.type = "button";
  actions.appendChild(submit);
  actions.appendChild(skip);
  root.appendChild(actions);

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const f = input.files && input.files[0];
    if (f) {
      err.textContent = MSG_SKIP_PDF_HAS_FILE;
      err.style.display = "block";
      return;
    }
    showAutoConfirmPanel(
      root,
      err,
      () => {
        submit.disabled = true;
        skip.disabled = true;
        pick.disabled = true;
        deps.onSubmit({ __auto: "1", fileName: "" });
      },
      MSG_AUTO_CONFIRM_PDF,
    );
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const f = input.files && input.files[0];
    if (!f) {
      err.textContent = "Vui lòng chọn một tệp hợp lệ (PDF, DOCX, Markdown, TXT hoặc ảnh có chữ rõ).";
      err.style.display = "block";
      return;
    }
    setPendingPdfFile(f);
    submit.disabled = true;
    skip.disabled = true;
    pick.disabled = true;
    deps.onSubmit({ fileName: f.name });
  });

  return root;
}

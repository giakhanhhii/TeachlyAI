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
  coerceSelectThemeValue,
  el,
  flowTextarea,
  normalizeFullsetCounts,
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

  const slides = el("input", "flow-input");
  slides.type = "number";
  slides.min = "1";
  slides.max = "30";
  slides.placeholder = "Slide";
  const quiz = el("input", "flow-input");
  quiz.type = "number";
  quiz.min = "1";
  quiz.placeholder = "Quiz";
  const flash = el("input", "flow-input");
  flash.type = "number";
  flash.min = "1";
  flash.placeholder = "Flashcard";
  const qtyWrap = el("div", "flow-field");
  qtyWrap.appendChild(el("span", "flow-label", "Số lượng (tổng max 40)"));
  const row = el("div", "flow-row-3");
  row.appendChild(wrapMini("Số slide", slides));
  row.appendChild(wrapMini("Số câu Quiz", quiz));
  row.appendChild(wrapMini("Số Flashcard", flash));
  qtyWrap.appendChild(row);
  qtyWrap.appendChild(
    el("p", "flow-hint", "Ba ô cộng lại tối đa 40 mục (ví dụ 10 slide + 20 quiz + 10 flashcard). Mỗi ô tối thiểu 1."),
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
  if (typeof prefill.slides === "string" || Number.isFinite(Number(prefill.slides))) slides.value = String(prefill.slides);
  if (typeof prefill.quiz === "string" || Number.isFinite(Number(prefill.quiz))) quiz.value = String(prefill.quiz);
  if (typeof prefill.flash === "string" || Number.isFinite(Number(prefill.flash))) flash.value = String(prefill.flash);
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
      const { sn, qn, fn } = normalizeFullsetCounts(sample.s, sample.q, sample.f);
      topic.value = String(sample.t ?? "");
      level.value = normalizeFullsetLevelAutofill(sample.l);
      levelMobileSelect.sync();
      slideTemplate.value = coerceSelectThemeValue(SLIDE_TEMPLATE_OPTIONS, sample.m, SLIDE_TEMPLATE_DEFAULT);
      slideTemplateMobileSelect.sync();
      slides.value = String(sn);
      quiz.value = String(qn);
      flash.value = String(fn);
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
        const { sn, qn, fn } = normalizeFullsetCounts(
          String(ai.slides ?? 10),
          String(ai.quiz ?? 20),
          String(ai.flash ?? 10),
        );
        slides.value = String(sn);
        quiz.value = String(qn);
        flash.value = String(fn);
        extra.value = String(ai.extra ?? "");
        refreshTitle();
        autofillIntent.remember(currentAutofillComparableState());
        return "ai";
      } catch {
        const fb = getAnyMock("fullset");
        const { sn, qn, fn } = normalizeFullsetCounts(fb.s, fb.q, fb.f);
        topic.value = String(fb.t ?? "");
        level.value = normalizeFullsetLevelAutofill(fb.l);
        levelMobileSelect.sync();
        slideTemplate.value = coerceSelectThemeValue(SLIDE_TEMPLATE_OPTIONS, fb.m, SLIDE_TEMPLATE_DEFAULT);
        slideTemplateMobileSelect.sync();
        slides.value = String(sn);
        quiz.value = String(qn);
        flash.value = String(fn);
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
      Boolean(s) &&
      Boolean(q) &&
      Boolean(f) &&
      Number.isFinite(sn) &&
      sn >= 1 &&
      sn <= 30 &&
      Number.isFinite(qn) &&
      qn >= 1 &&
      Number.isFinite(fn) &&
      fn >= 1 &&
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

    if (hasSlide && (!Number.isFinite(sn) || sn < 1 || sn > 30)) {
      return { ok: false, message: "Số slide phải từ 1 đến 30." };
    }
    if (hasQuiz && (!Number.isFinite(qn) || qn < 1)) {
      return { ok: false, message: "Số câu Quiz phải là số dương." };
    }
    if (hasFlash && (!Number.isFinite(fn) || fn < 1)) {
      return { ok: false, message: "Số Flashcard phải là số dương." };
    }

    const values = {
      slides: hasSlide ? sn : 10,
      quiz: hasQuiz ? qn : 20,
      flash: hasFlash ? fn : 10,
    };
    const specifiedTotal = (hasSlide ? sn : 0) + (hasQuiz ? qn : 0) + (hasFlash ? fn : 0);
    const missingKeys = [];
    if (!hasSlide) missingKeys.push("slides");
    if (!hasQuiz) missingKeys.push("quiz");
    if (!hasFlash) missingKeys.push("flash");

    if (specifiedTotal + missingKeys.length > 40) {
      return { ok: false, message: "Tổng Slide + Quiz + Flashcard không được vượt quá 40 sau khi Teachly tự điền phần còn thiếu." };
    }

    let total = values.slides + values.quiz + values.flash;
    while (total > 40) {
      let reduced = false;
      for (const keys of [missingKeys, ["quiz", "flash", "slides"]]) {
        for (const key of keys) {
          if (values[key] > 1) {
            values[key] -= 1;
            total -= 1;
            reduced = true;
            break;
          }
        }
        if (reduced || total <= 40) break;
      }
      if (!reduced) {
        return { ok: false, message: `Tổng Slide + Quiz + Flashcard không được vượt quá 40 (hiện tại: ${total}).` };
      }
    }

    return { ok: true, slides: String(values.slides), quiz: String(values.quiz), flash: String(values.flash) };
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
      slides: String(sn),
      quiz: String(qn),
      flash: String(fn),
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
    "Hỗ trợ: PDF, DOCX, MD, TXT, ảnh (JPG, PNG, WEBP…) — tối đa 20 trang / 10 MB. Teachly sẽ dùng AI để tạo Full Set từ nội dung tài liệu.",
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
      err.textContent = "Vui lòng chọn một tệp hợp lệ (PDF, DOCX, Markdown, TXT).";
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

import { consumeNextMock, getAnyMock } from "../../data/sampleFlowData.js";
import { SLIDE_TEMPLATE_DEFAULT, SLIDE_TEMPLATE_OPTIONS } from "../../data/slideTemplateOptions.js";
import {
  MSG_SKIP_USE_SUBMIT,
  addAutofillBtn,
  getAiAutofillHistory,
  addAiAutofillHistory,
  clamp,
  el,
  flowTextarea,
  coerceSelectThemeValue,
  removeSkipConfirm,
  showPartialFillConfirm,
  toPositiveInt,
  wrapField,
} from "./flowCardShared.js";
import { mountFlowMobileSelect } from "./flowMobileSelect.js";
import { populateSlideTemplateSelect } from "./slideTemplateSelect.js";
import { fetchAiAutofillTopic } from "../../services/aiContentApi.js";
import { createAutofillIntentTracker } from "./autofillIntent.js";

export function createSlideFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Form tạo slide bài giảng"));
  const autofillIntent = createAutofillIntentTracker();

  const docText = flowTextarea("Nhập tên bài học / chủ đề…", 2);
  const docBlock = el("div", "flow-field");
  docBlock.appendChild(el("label", "flow-label", "Tên chủ đề"));
  docBlock.appendChild(docText);
  docBlock.appendChild(el("p", "flow-hint", "Bạn đã chọn nhập tên chủ đề trực tiếp — mô tả rõ nội dung mong muốn."));
  root.appendChild(docBlock);

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = "5";
  count.max = "30";
  count.placeholder = "5–30";
  root.appendChild(wrapField("Số lượng slide", count, "Chọn từ 5 đến 30 slide để đảm bảo chất lượng nội dung."));

  const structure = flowTextarea("VD: Lý thuyết → Ví dụ → Tổng kết", 2);
  root.appendChild(wrapField("Cấu trúc mong muốn", structure));

  const style = el("select", "flow-select");
  populateSlideTemplateSelect(style);
  const styleMobileSelect = mountFlowMobileSelect(style);
  root.appendChild(wrapField("Mẫu", styleMobileSelect.control, "Chọn mẫu giao diện slide."));

  const notes = flowTextarea("VD: Minigame, Thảo luận nhóm…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

  const prefill = deps?.prefill && typeof deps.prefill === "object" ? deps.prefill : {};
  let presetId = typeof prefill.presetId === "string" ? prefill.presetId : "";
  if (typeof prefill.topic === "string") docText.value = prefill.topic;
  if (typeof prefill.count === "string" || Number.isFinite(Number(prefill.count))) count.value = String(prefill.count);
  if (typeof prefill.structure === "string") structure.value = prefill.structure;
  if (typeof prefill.style === "string") {
    style.value = prefill.style;
    styleMobileSelect.sync();
  }
  if (typeof prefill.notes === "string") notes.value = prefill.notes;

  function currentAutofillComparableState() {
    return {
      topic: docText.value,
      count: count.value,
      structure: structure.value,
      style: style.value,
      notes: notes.value,
    };
  }

  addAutofillBtn(root, async () => {
    const sample = consumeNextMock("slide");
    if (sample) {
      presetId = String(sample.id ?? "");
      docText.value = String(sample.t ?? "");
      count.value = String(clamp(toPositiveInt(sample.c, 10), 5, 30));
      structure.value = String(sample.s ?? "");
      style.value = coerceSelectThemeValue(SLIDE_TEMPLATE_OPTIONS, sample.y, SLIDE_TEMPLATE_DEFAULT);
      styleMobileSelect.sync();
      notes.value = String(sample.n ?? "");
      autofillIntent.remember(currentAutofillComparableState());
      return "mock";
    } else {
      try {
        const ai = await fetchAiAutofillTopic("slide", getAiAutofillHistory("slide"));
        presetId = "";
        docText.value = String(ai.topic ?? "");
        addAiAutofillHistory("slide", ai.topic);
        if (ai.count) count.value = String(clamp(toPositiveInt(ai.count, 10), 5, 30));
        if (ai.structure) structure.value = String(ai.structure);
        notes.value = String(ai.notes ?? "");
        autofillIntent.remember(currentAutofillComparableState());
        return "ai";
      } catch {
        const fb = getAnyMock("slide");
        presetId = String(fb.id ?? "");
        docText.value = String(fb.t ?? "");
        count.value = String(clamp(toPositiveInt(fb.c, 10), 5, 30));
        structure.value = String(fb.s ?? "");
        style.value = coerceSelectThemeValue(SLIDE_TEMPLATE_OPTIONS, fb.y, SLIDE_TEMPLATE_DEFAULT);
        styleMobileSelect.sync();
        notes.value = String(fb.n ?? "");
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

  function readSlideState() {
    const topic = docText.value.trim();
    const countRaw = count.value.trim();
    const n = Number(countRaw);
    const sty = style.value;
    const complete = Boolean(topic) && Boolean(countRaw) && Number.isFinite(n) && n >= 5 && n <= 30 && Boolean(sty);
    return { topic, n, sty, countRaw, complete };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readSlideState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      topic: "(Teachly tự động)",
      count: "20",
      structure: "",
      style: SLIDE_TEMPLATE_DEFAULT,
      notes: "",
      presetId: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const countRaw = count.value.trim();
    if (countRaw) {
      const n = Number(countRaw);
      if (!Number.isFinite(n) || n < 5 || n > 30) {
        err.textContent = "Số slide phải từ 5 đến 30.";
        err.style.display = "block";
        return;
      }
    }
    const topic = docText.value.trim();
    const sty = style.value;
    const structureValue = structure.value.trim();
    const notesValue = notes.value.trim();
    const hasAnyInput = Boolean(topic || countRaw || structureValue || sty || notesValue);
    if (!hasAnyInput) {
      err.textContent = "Vui lòng nhập ít nhất một thông tin hoặc nhấn Bỏ qua.";
      err.style.display = "block";
      return;
    }
    const useCount = countRaw || "20";
    if (topic && sty && countRaw) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit(autofillIntent.applyToPayload({
        topic,
        count: useCount,
        structure: structureValue,
        style: sty,
        notes: notesValue,
        presetId,
      }, currentAutofillComparableState()));
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit(autofillIntent.applyToPayload({
        topic: topic || "(Teachly tự động)",
        count: useCount,
        structure: structureValue,
        style: sty || SLIDE_TEMPLATE_DEFAULT,
        notes: notesValue,
        presetId,
      }, currentAutofillComparableState()));
    });
  });

  return root;
}

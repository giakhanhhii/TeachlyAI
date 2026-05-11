import { SAMPLES_QUIZ, AUTOFILL_MOCK_LENGTHS } from "../../data/sampleFlowData.js";
import { DEFAULT_DIFFICULTY } from "../../constants.js";
import {
  MSG_SKIP_USE_SUBMIT,
  addAutofillBtn,
  autofillCounters,
  resetAutofillCounter,
  getAiAutofillHistory,
  addAiAutofillHistory,
  el,
  flowTextarea,
  normalizeFullsetLevelAutofill,
  removeSkipConfirm,
  showPartialFillConfirm,
  toPositiveInt,
  appendSelectPlaceholder,
  wrapField,
} from "./flowCardShared.js";
import { mountFlowMobileSelect } from "./flowMobileSelect.js";
import { fetchAiAutofillTopic } from "../../services/aiContentApi.js";

export function createQuizFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Form Quiz (THPTQG)"));

  const srcText = flowTextarea("Nhập chủ đề / chuyên đề…", 2);
  const src = el("div", "flow-field");
  src.appendChild(el("label", "flow-label", "Chủ đề / chuyên đề"));
  src.appendChild(srcText);
  src.appendChild(el("p", "flow-hint", "Bạn đã chọn nhập chủ đề trực tiếp — không cần tải tệp ở bước này."));
  root.appendChild(src);

  const kind = flowTextarea("VD: Phát âm, Ngữ pháp, Đọc hiểu, Từ vựng", 2);
  root.appendChild(wrapField("Dạng bài", kind));

  const qn = el("input", "flow-input");
  qn.type = "number";
  qn.min = "1";
  qn.placeholder = "VD: 20";
  root.appendChild(wrapField("Số lượng câu", qn));

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

  const notes = flowTextarea("Ghi chú thêm cho bộ đề…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

  const prefill = deps?.prefill && typeof deps.prefill === "object" ? deps.prefill : {};
  let presetId = typeof prefill.presetId === "string" ? prefill.presetId : "";
  if (typeof prefill.source === "string") srcText.value = prefill.source;
  if (typeof prefill.kind === "string") kind.value = prefill.kind;
  if (typeof prefill.count === "string" || Number.isFinite(Number(prefill.count))) qn.value = String(prefill.count);
  if (typeof prefill.difficulty === "string") {
    level.value = prefill.difficulty;
    levelMobileSelect.sync();
  }
  if (typeof prefill.notes === "string") notes.value = prefill.notes;

  addAutofillBtn(root, async () => {
    const idx = autofillCounters.quiz++;
    if (idx < AUTOFILL_MOCK_LENGTHS.quiz) {
      const item = SAMPLES_QUIZ[idx];
      presetId = String(item.id ?? "");
      srcText.value = String(item.s ?? "");
      kind.value = String(item.k ?? "");
      qn.value = String(toPositiveInt(item.q, 20));
      level.value = normalizeFullsetLevelAutofill(item.d);
      levelMobileSelect.sync();
      notes.value = String(item.n ?? "");
      return "mock";
    } else {
      try {
        const ai = await fetchAiAutofillTopic("quiz");
        presetId = "";
        srcText.value = String(ai.source ?? "");
        if (ai.kind) kind.value = String(ai.kind);
        if (ai.count) qn.value = String(toPositiveInt(ai.count, 20));
        if (ai.difficulty) {
          level.value = normalizeFullsetLevelAutofill(ai.difficulty);
          levelMobileSelect.sync();
        }
        notes.value = String(ai.notes ?? "");
        return "ai";
      } catch {
        const item = SAMPLES_QUIZ[idx % SAMPLES_QUIZ.length];
        presetId = String(item.id ?? "");
        srcText.value = String(item.s ?? "");
        kind.value = String(item.k ?? "");
        qn.value = String(toPositiveInt(item.q, 20));
        level.value = normalizeFullsetLevelAutofill(item.d);
        levelMobileSelect.sync();
        notes.value = String(item.n ?? "");
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

  function readQuizState() {
    const t = srcText.value.trim();
    const k = kind.value.trim();
    const lv = level.value;
    const countRaw = qn.value.trim();
    const n = Number(countRaw);
    const complete =
      Boolean(t) && Boolean(countRaw) && Number.isFinite(n) && n >= 1 && Boolean(k) && Boolean(lv);
    return { t, k, n, lv, countRaw, complete };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readQuizState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      source: "(Teachly tự động)",
      kind: "Ôn tập THPTQG",
      count: "20",
      difficulty: DEFAULT_DIFFICULTY,
      notes: "",
      presetId: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const countRaw = qn.value.trim();
    if (countRaw) {
      const n = Number(countRaw);
      if (!Number.isFinite(n) || n < 1) {
        err.textContent = "Số lượng câu phải là số dương.";
        err.style.display = "block";
        return;
      }
    }
    const t = srcText.value.trim();
    const k = kind.value.trim();
    const lv = level.value;
    const notesValue = notes.value.trim();
    const hasAnyInput = Boolean(t || k || lv || countRaw || notesValue);
    if (!hasAnyInput) {
      err.textContent = "Vui lòng nhập ít nhất một thông tin hoặc nhấn Bỏ qua.";
      err.style.display = "block";
      return;
    }
    const useCount = countRaw || "20";
    if (t && k && lv && countRaw) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        source: t,
        kind: k,
        count: useCount,
        difficulty: lv,
        notes: notesValue,
        presetId,
      });
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        source: t || "(Teachly tự động)",
        kind: k || "Ôn tập THPTQG",
        count: useCount,
        difficulty: lv || DEFAULT_DIFFICULTY,
        notes: notesValue,
        presetId,
      });
    });
  });

  return root;
}

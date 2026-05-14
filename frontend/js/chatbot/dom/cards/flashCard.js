import { consumeNextMock, getAnyMock } from "../../data/sampleFlowData.js";
import {
  MSG_SKIP_USE_SUBMIT,
  addAutofillBtn,
  getAiAutofillHistory,
  addAiAutofillHistory,
  clamp,
  el,
  flowTextarea,
  removeSkipConfirm,
  showPartialFillConfirm,
  toPositiveInt,
  wrapField,
} from "./flowCardShared.js";
import { fetchAiAutofillTopic } from "../../services/aiContentApi.js";
import { buildFormTitle } from "../../services/contentTitles.js";
import { createAutofillIntentTracker } from "./autofillIntent.js";

function randomFlashAutofillCount() {
  if (Math.random() < 0.6) return 20;
  return 10 + Math.floor(Math.random() * 10);
}

export function createFlashcardFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  const titleEl = el("div", "flow-card-title", buildFormTitle("flash"));
  root.appendChild(titleEl);
  const autofillIntent = createAutofillIntentTracker();
  const refreshTitle = () => {
    titleEl.textContent = buildFormTitle("flash", list.value, deps?.prefill?.source);
  };

  const list = flowTextarea("Dán danh sách từ hoặc mô tả chủ đề… (có thể bỏ trống)", 4);
  root.appendChild(wrapField("Danh sách từ / Chủ đề", list, "Có thể bỏ qua — Teachly sẽ gợi ý theo ghi chú của bạn."));

  const back = flowTextarea("VD: Nghĩa tiếng Việt, Phiên âm, Ví dụ, Từ đồng nghĩa", 2);
  root.appendChild(wrapField("Thông tin mặt trước & sau", back));

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = "1";
  count.max = "40";
  count.placeholder = "1–40 (mặc định 20)";
  root.appendChild(wrapField("Số lượng thẻ", count, "Tối đa 40 thẻ mỗi lần tạo."));

  const notes = flowTextarea("Ghi chú thêm…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

  const prefill = deps?.prefill && typeof deps.prefill === "object" ? deps.prefill : {};
  let presetId = typeof prefill.presetId === "string" ? prefill.presetId : "";
  if (typeof prefill.list === "string") list.value = prefill.list;
  if (typeof prefill.back === "string") back.value = prefill.back;
  if (typeof prefill.count === "string" || Number.isFinite(Number(prefill.count))) count.value = String(prefill.count);
  if (typeof prefill.notes === "string") notes.value = prefill.notes;
  refreshTitle();
  list.addEventListener("input", refreshTitle);

  function currentAutofillComparableState() {
    return {
      list: list.value,
      back: back.value,
      count: count.value,
      notes: notes.value,
    };
  }

  addAutofillBtn(root, async () => {
    const sample = consumeNextMock("flash");
    if (sample) {
      presetId = String(sample.id ?? "");
      list.value = String(sample.l ?? "");
      back.value = String(sample.b ?? "");
      count.value = String(clamp(randomFlashAutofillCount(), 1, 40));
      notes.value = String(sample.n ?? "");
      refreshTitle();
      autofillIntent.remember(currentAutofillComparableState());
      return "mock";
    } else {
      try {
        const ai = await fetchAiAutofillTopic("flash", getAiAutofillHistory("flash"));
        presetId = "";
        list.value = String(ai.list ?? "");
        addAiAutofillHistory("flash", ai.list);
        back.value = String(ai.back ?? "Nghĩa tiếng Việt, Phiên âm, Ví dụ");
        count.value = String(clamp(toPositiveInt(ai.count, 20), 1, 40));
        notes.value = String(ai.notes ?? "");
        refreshTitle();
        autofillIntent.remember(currentAutofillComparableState());
        return "ai";
      } catch {
        const fb = getAnyMock("flash");
        presetId = String(fb.id ?? "");
        list.value = String(fb.l ?? "");
        back.value = String(fb.b ?? "");
        count.value = String(clamp(randomFlashAutofillCount(), 1, 40));
        notes.value = String(fb.n ?? "");
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

  function readFlashState() {
    const lst = list.value.trim();
    const bk = back.value.trim();
    const nt = notes.value.trim();
    const cv = count.value.trim();
    const n = Number(cv || "20");
    const mainDesc = lst || bk || nt;
    const complete = Boolean(mainDesc) && Number.isFinite(n) && n >= 1 && n <= 40;
    return { complete };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readFlashState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      __auto: "1",
      list: "",
      back: "",
      count: "20",
      aiImage: "Không",
      notes: "",
      presetId: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const cv = count.value.trim();
    if (cv) {
      const n = Number(cv);
      if (!Number.isFinite(n) || n < 1 || n > 40) {
        err.textContent = "Số lượng thẻ phải từ 1 đến 40.";
        err.style.display = "block";
        return;
      }
    }
    const lst = list.value.trim();
    const bk = back.value.trim();
    const nt = notes.value.trim();
    const mainDesc = lst || bk || nt;
    const useCount = cv || "20";
    if (cv && !mainDesc) {
      showPartialFillConfirm(root, err, () => {
        submit.disabled = true;
        skip.disabled = true;
        deps.onSubmit(autofillIntent.applyToPayload({
          list: "",
          back: "",
          count: useCount,
          aiImage: "Không",
          notes: "",
          presetId,
        }, currentAutofillComparableState()));
      });
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit(autofillIntent.applyToPayload({
      list: lst,
      back: bk,
      count: useCount,
      aiImage: "Không",
      notes: nt,
      presetId,
    }, currentAutofillComparableState()));
  });

  return root;
}

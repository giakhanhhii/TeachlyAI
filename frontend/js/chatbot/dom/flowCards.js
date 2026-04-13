/**
 * Card-style form blocks embedded in bot chat bubbles (UI only).
 * @param {(payload: Record<string, string>) => void} onSubmit
 */

import { takePendingPdfFile } from "../pdfPrefillStore.js";
import { randomIntInclusive } from "../services/sessionContentPrep.js";

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

/** Ô nhập đa dòng — Enter và Shift+Enter đều xuống dòng (hành vi mặc định của textarea). */
function flowTextarea(placeholder, rows = 2) {
  const n = el("textarea", "flow-textarea");
  n.rows = rows;
  if (placeholder) n.placeholder = placeholder;
  n.title = "Enter hoặc Shift+Enter để xuống dòng";
  return n;
}

const MSG_SKIP_USE_SUBMIT = "Bạn đã điền đủ thông tin. Hãy nhấn Gửi thông tin để tiếp tục.";
const MSG_SKIP_PDF_HAS_FILE =
  "Bạn đã chọn tệp PDF — nhấn Xác nhận tệp để tiếp tục, hoặc tải lại trang nếu muốn chọn lại.";
const MSG_AUTO_CONFIRM =
  "Bạn chưa điền gì. Teachly sẽ tự động soạn nội dung phù hợp. Bạn có chắc không?";
const MSG_AUTO_CONFIRM_PDF =
  "Bạn chưa chọn tệp PDF. Teachly sẽ tự động soạn nội dung phù hợp. Bạn có chắc không?";
const MSG_PARTIAL_FILL =
  "Bạn mới điền số lượng (hoặc thông tin một phần), Teachly sẽ tự điền những thông tin còn lại cho bạn. Bạn có muốn tiếp tục không?";

/** @param {HTMLElement} root */
function removeSkipConfirm(root) {
  root.querySelector(".flow-skip-confirm")?.remove();
}

/**
 * @param {HTMLElement} root
 * @param {HTMLElement} errEl
 * @param {() => void} onYes
 * @param {string} [message]
 */
function showAutoConfirmPanel(root, errEl, onYes, message) {
  removeSkipConfirm(root);
  errEl.style.display = "none";
  const wrap = el("div", "flow-skip-confirm");
  wrap.appendChild(el("p", "flow-skip-text", message || MSG_AUTO_CONFIRM));
  const row = el("div", "flow-skip-actions");
  const yes = el("button", "flow-primary-btn", "Có, để Teachly tự động");
  const no = el("button", "flow-secondary-btn", "Không");
  yes.type = "button";
  no.type = "button";
  yes.addEventListener("click", () => {
    removeSkipConfirm(root);
    onYes();
  });
  no.addEventListener("click", () => removeSkipConfirm(root));
  row.appendChild(yes);
  row.appendChild(no);
  wrap.appendChild(row);
  root.appendChild(wrap);
}

/**
 * Xác nhận khi đã có số lượng / thông tin một phần nhưng thiếu mô tả chính.
 * @param {HTMLElement} root
 * @param {HTMLElement} errEl
 * @param {() => void} onYes
 */
function showPartialFillConfirm(root, errEl, onYes) {
  removeSkipConfirm(root);
  errEl.style.display = "none";
  const wrap = el("div", "flow-skip-confirm");
  wrap.appendChild(el("p", "flow-skip-text", MSG_PARTIAL_FILL));
  const row = el("div", "flow-skip-actions");
  const yes = el("button", "flow-primary-btn", "Có");
  const no = el("button", "flow-secondary-btn", "Không");
  yes.type = "button";
  no.type = "button";
  yes.addEventListener("click", () => {
    removeSkipConfirm(root);
    onYes();
  });
  no.addEventListener("click", () => removeSkipConfirm(root));
  row.appendChild(yes);
  row.appendChild(no);
  wrap.appendChild(row);
  root.appendChild(wrap);
}

/** @param {number | null} countMax */
function randomCountSkipPdf(countMax) {
  const hi = countMax == null ? 40 : Math.min(40, countMax);
  const lo = Math.min(20, hi);
  return randomIntInclusive(lo, hi);
}

/** Slide + Quiz + Flash = 40, mỗi loại ≥ 1, slide ≤ 30. */
function randomFullsetTripleSum40() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const cut1 = randomIntInclusive(1, 38);
    const cut2 = randomIntInclusive(cut1 + 1, 39);
    const sn = cut1;
    const qn = cut2 - cut1;
    const fn = 40 - cut2;
    if (sn <= 30 && qn >= 1 && fn >= 1) return { sn, qn, fn };
  }
  return { sn: 10, qn: 20, fn: 10 };
}

/** @param {{ onSubmit: (p: Record<string, string>) => void }} deps */
export function createFullsetTopicCard(deps) {
  const root = el("div", "flow-card");
  root.appendChild(el("div", "flow-card-title", "Form Full Set"));

  const topic = flowTextarea("VD: Ôn tập đọc hiểu — chủ đề môi trường", 2);
  root.appendChild(wrapField("Chủ đề", topic, "Nhập tên bài học"));

  const level = el("select", "flow-select");
  ["", "Mất gốc", "Cơ bản", "Khá", "Nâng cao"].forEach((v, i) => {
    const o = document.createElement("option");
    o.value = i === 0 ? "" : v;
    o.textContent = i === 0 ? "Chọn trình độ…" : v;
    level.appendChild(o);
  });
  root.appendChild(wrapField("Trình độ", level));

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
    const s = slides.value.trim();
    const q = quiz.value.trim();
    const f = flash.value.trim();
    const ex = extra.value.trim();
    const hasAny = Boolean(t || lv || s || q || f || ex);
    const sn = Number(s);
    const qn = Number(q);
    const fn = Number(f);
    const sumOk = Number.isFinite(sn) && Number.isFinite(qn) && Number.isFinite(fn) && sn + qn + fn <= 40;
    const complete =
      Boolean(t) &&
      Boolean(lv) &&
      Number.isFinite(sn) &&
      sn >= 1 &&
      sn <= 30 &&
      Number.isFinite(qn) &&
      qn >= 1 &&
      Number.isFinite(fn) &&
      fn >= 1 &&
      sumOk;
    return { t, lv, s, q, f, ex, hasAny, complete };
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
      level: "Cơ bản",
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
    const sn = Number(slides.value);
    const qn = Number(quiz.value);
    const fn = Number(flash.value);
    if (!Number.isFinite(sn) || sn < 1 || sn > 30) {
      err.textContent = "Số slide phải từ 1 đến 30.";
      err.style.display = "block";
      return;
    }
    if (!Number.isFinite(qn) || qn < 1) {
      err.textContent = "Số câu Quiz phải là số dương.";
      err.style.display = "block";
      return;
    }
    if (!Number.isFinite(fn) || fn < 1) {
      err.textContent = "Số Flashcard phải là số dương.";
      err.style.display = "block";
      return;
    }
    const sum = sn + qn + fn;
    if (sum > 40) {
      err.textContent = `Tổng Slide + Quiz + Flashcard không được vượt quá 40 (hiện tại: ${sum}).`;
      err.style.display = "block";
      return;
    }
    const t = topic.value.trim();
    const lv = level.value;
    if (t && lv) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic: t,
        level: lv,
        slides: String(sn),
        quiz: String(qn),
        flash: String(fn),
        extra: extra.value.trim(),
      });
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic: t || "(Teachly tự động)",
        level: lv || "Cơ bản",
        slides: String(sn),
        quiz: String(qn),
        flash: String(fn),
        extra: extra.value.trim(),
      });
    });
  });

  return root;
}

function wrapField(labelText, control, hint) {
  const f = el("div", "flow-field");
  f.appendChild(el("label", "flow-label", labelText));
  f.appendChild(control);
  if (hint) f.appendChild(el("p", "flow-hint", hint));
  return f;
}

function wrapMini(labelText, control) {
  const f = el("div", "flow-field");
  f.appendChild(el("span", "flow-label", labelText));
  f.appendChild(control);
  return f;
}

/**
 * Form sau khi chọn "Tải lên PDF" (chỉ nhập meta; tệp xử lý ở bước tích hợp sau).
 * @param {{
 *   title: string,
 *   countLabel: string,
 *   countMin: number,
 *   countMax: number | null,
 *   defaultCount: string,
 *   onSubmit: (p: Record<string, string>) => void,
 * }} opts
 */
function createPdfMetaCard(opts) {
  const { title, countLabel, countMin, countMax, defaultCount, onSubmit } = opts;
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", title));

  const name = flowTextarea("VD: Bài 8 — Động lực học", 2);
  root.appendChild(wrapField("Tên", name, "Tên gọi bộ nội dung / phiên làm việc"));

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = String(countMin);
  if (countMax != null) count.max = String(countMax);
  count.placeholder = countMax != null ? `${countMin}–${countMax}` : `≥ ${countMin}`;
  root.appendChild(wrapField(countLabel, count, ""));

  const structure = flowTextarea("VD: Mở đầu → Nội dung chính → Củng cố", 2);
  root.appendChild(wrapField("Cấu trúc", structure, ""));

  const style = flowTextarea("VD: Trang trọng, gần gũi, hài hước…", 2);
  root.appendChild(wrapField("Phong cách", style, ""));

  const notes = flowTextarea("Yêu cầu bổ sung, ngữ cảnh lớp học…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes, ""));

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

  function readState() {
    const nm = name.value.trim();
    const c = count.value.trim();
    const n = Number(c);
    const st = structure.value.trim();
    const sy = style.value.trim();
    const nt = notes.value.trim();
    const hasAny = Boolean(nm || c || st || sy || nt);
    const inRange =
      Number.isFinite(n) &&
      n >= countMin &&
      (countMax == null || (n <= countMax && n >= countMin));
    const complete = Boolean(nm) && Boolean(c) && inRange;
    return { nm, c, n, st, sy, nt, hasAny, complete, inRange };
  }

  skip.addEventListener("click", () => {
    err.style.display = "none";
    const st = readState();
    if (st.complete) {
      err.textContent = MSG_SKIP_USE_SUBMIT;
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    onSubmit({
      __auto: "1",
      name: "(Teachly tự động)",
      count: String(randomCountSkipPdf(countMax)),
      structure: "",
      style: "",
      notes: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const st = readState();
    if (st.nm && st.c && st.inRange) {
      submit.disabled = true;
      skip.disabled = true;
      onSubmit({
        name: st.nm,
        count: String(st.n),
        structure: st.st,
        style: st.sy,
        notes: st.nt,
      });
      return;
    }
    if (st.c && st.inRange && !st.nm) {
      showPartialFillConfirm(root, err, () => {
        submit.disabled = true;
        skip.disabled = true;
        onSubmit({
          name: "(Teachly tự động)",
          count: String(st.n),
          structure: st.st,
          style: st.sy,
          notes: st.nt,
        });
      });
      return;
    }
    if (!st.c || !st.inRange) {
      err.textContent =
        countMax != null
          ? `Số lượng phải từ ${countMin} đến ${countMax}.`
          : `Số lượng phải là số ≥ ${countMin}.`;
      err.style.display = "block";
      return;
    }
    err.textContent = "Vui lòng nhập tên.";
    err.style.display = "block";
  });

  return root;
}

/** @param {{ onSubmit: (p: Record<string, string>) => void, initialFile?: File }} deps */
export function createFullsetPdfCard(deps) {
  const root = el("div", "flow-card");
  root.appendChild(el("div", "flow-card-title", "Tải lên PDF"));

  const hint = el(
    "p",
    "flow-hint",
    "Giao diện chọn tệp (Chandra OCR2 → Markdown sẽ được kích hoạt ở bước tích hợp sau).",
  );
  root.appendChild(hint);

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,application/pdf";
  input.style.display = "none";

  const name = el("span", "flow-file-name", "Chưa chọn tệp");

  const pick = el("button", "flow-secondary-btn", "Chọn file PDF");
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
      err.textContent = "Vui lòng chọn một tệp PDF.";
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    pick.disabled = true;
    deps.onSubmit({ fileName: f.name });
  });

  return root;
}

/** Chỉ chọn PDF — bắt buộc trước khi hiện form meta (slide/quiz/flash). */
/** @param {{ onSubmit: (p: Record<string, string>) => void }} deps */
export function createPickPdfGateCard(deps) {
  const root = el("div", "flow-card");
  root.appendChild(el("div", "flow-card-title", "Chọn tệp PDF"));
  root.appendChild(
    el("p", "flow-hint", "Chọn một tệp .pdf, sau đó nhấn Tiếp tục. Teachly sẽ hiển thị biểu mẫu chi tiết ở bước sau."),
  );

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,application/pdf";
  input.style.display = "none";

  const name = el("span", "flow-file-name", "Chưa chọn tệp");

  const pick = el("button", "flow-secondary-btn", "Chọn file PDF");
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

  const err = el("div", "flow-err");
  err.style.display = "none";
  root.appendChild(err);

  const actions = el("div", "flow-card-actions");
  const skip = el("button", "flow-secondary-btn", "Bỏ qua");
  skip.type = "button";
  const submit = el("button", "flow-primary-btn", "Tiếp tục");
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
    submit.disabled = true;
    skip.disabled = true;
    pick.disabled = true;
    deps.onSubmit({ __no_file: "1" });
  });

  submit.addEventListener("click", () => {
    err.style.display = "none";
    const f = input.files && input.files[0];
    if (!f) {
      err.textContent = "Vui lòng chọn một tệp PDF.";
      err.style.display = "block";
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    pick.disabled = true;
    deps.onSubmit({ fileName: f.name });
  });

  return root;
}

/** @param {{ onSubmit: (p: Record<string, string>) => void }} deps */
export function createSlideFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Form tạo slide bài giảng"));

  const docText = flowTextarea("Nhập tên bài học / chủ đề…", 2);
  const docBlock = el("div", "flow-field");
  docBlock.appendChild(el("label", "flow-label", "Chủ đề bài giảng"));
  docBlock.appendChild(docText);
  docBlock.appendChild(el("p", "flow-hint", "Bạn đã chọn nhập chủ đề trực tiếp — mô tả rõ nội dung mong muốn."));
  root.appendChild(docBlock);

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = "1";
  count.max = "30";
  count.placeholder = "1–30";
  root.appendChild(wrapField("Số lượng slide", count, "Tối đa 30 slide để đảm bảo chất lượng nội dung."));

  const structure = flowTextarea("VD: Lý thuyết → Ví dụ → Tổng kết", 2);
  root.appendChild(wrapField("Cấu trúc mong muốn", structure));

  const style = el("select", "flow-select");
  ["", "Trang trọng", "Gần gũi", "Hài hước"].forEach((v, i) => {
    const o = document.createElement("option");
    o.value = i === 0 ? "" : v;
    o.textContent = i === 0 ? "Chọn phong cách…" : v;
    style.appendChild(o);
  });
  root.appendChild(wrapField("Phong cách", style));

  const notes = flowTextarea("VD: Minigame, Thảo luận nhóm…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

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
    const n = Number(count.value);
    const st = structure.value.trim();
    const sty = style.value;
    const nt = notes.value.trim();
    const hasAny = Boolean(topic || count.value.trim() || st || sty || nt);
    const complete = Boolean(topic) && Number.isFinite(n) && n >= 1 && n <= 30 && Boolean(sty);
    return { topic, n, st, sty, nt, hasAny, complete };
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
      count: String(randomIntInclusive(20, 30)),
      structure: "",
      style: "Gần gũi",
      notes: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const n = Number(count.value);
    if (!Number.isFinite(n) || n < 1 || n > 30) {
      err.textContent = "Số slide phải từ 1 đến 30.";
      err.style.display = "block";
      return;
    }
    const topic = docText.value.trim();
    const sty = style.value;
    if (topic && sty) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic,
        count: String(n),
        structure: structure.value.trim(),
        style: sty,
        notes: notes.value.trim(),
      });
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        topic: topic || "(Teachly tự động)",
        count: String(n),
        structure: structure.value.trim(),
        style: sty || "Gần gũi",
        notes: notes.value.trim(),
      });
    });
  });

  return root;
}

/** @param {{ onSubmit: (p: Record<string, string>) => void }} deps */
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

  const diff = flowTextarea("VD: 40% NB - 30% TH - 20% VD - 10% VDC", 2);
  root.appendChild(wrapField("Tỉ lệ độ khó", diff));

  const notes = flowTextarea("Ghi chú thêm cho bộ đề…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

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
    const n = Number(qn.value);
    const d = diff.value.trim();
    const nt = notes.value.trim();
    const hasAny = Boolean(t || k || qn.value.trim() || d || nt);
    const complete = Boolean(t) && Number.isFinite(n) && n >= 1 && Boolean(k);
    return { t, k, n, d, nt, hasAny, complete };
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
      count: String(randomIntInclusive(20, 40)),
      difficulty: "",
      notes: "",
    });
  });

  submit.addEventListener("click", () => {
    removeSkipConfirm(root);
    err.style.display = "none";
    const n = Number(qn.value);
    if (!Number.isFinite(n) || n < 1) {
      err.textContent = "Số lượng câu phải là số dương.";
      err.style.display = "block";
      return;
    }
    const t = srcText.value.trim();
    const k = kind.value.trim();
    if (t && k) {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        source: t,
        kind: k,
        count: String(n),
        difficulty: diff.value.trim(),
        notes: notes.value.trim(),
      });
      return;
    }
    showPartialFillConfirm(root, err, () => {
      submit.disabled = true;
      skip.disabled = true;
      deps.onSubmit({
        source: t || "(Teachly tự động)",
        kind: k || "Ôn tập THPTQG",
        count: String(n),
        difficulty: diff.value.trim(),
        notes: notes.value.trim(),
      });
    });
  });

  return root;
}

/** @param {{ onSubmit: (p: Record<string, string>) => void }} deps */
export function createFlashcardFormCard(deps) {
  const root = el("div", "flow-card flow-card-flow-wide");
  root.appendChild(el("div", "flow-card-title", "Form Flashcard từ vựng"));

  const list = flowTextarea("Dán danh sách từ hoặc mô tả chủ đề… (có thể bỏ trống)", 4);
  root.appendChild(wrapField("Danh sách từ / Chủ đề", list, "Có thể bỏ qua — Teachly sẽ gợi ý theo ghi chú của bạn."));

  const back = flowTextarea("VD: Nghĩa tiếng Việt, Phiên âm, Ví dụ, Từ đồng nghĩa", 2);
  root.appendChild(wrapField("Thông tin mặt sau", back));

  const count = el("input", "flow-input");
  count.type = "number";
  count.min = "1";
  count.max = "40";
  count.placeholder = "1–40 (mặc định 20)";
  root.appendChild(wrapField("Số lượng thẻ", count, "Tối đa 40 thẻ mỗi lần tạo."));

  const notes = flowTextarea("Ghi chú thêm…", 3);
  root.appendChild(wrapField("Ghi chú thêm", notes));

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
    const hasAny = Boolean(mainDesc || cv);
    const complete = Boolean(mainDesc) && Number.isFinite(n) && n >= 1 && n <= 40;
    return { hasAny, complete };
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
      count: String(randomIntInclusive(20, 40)),
      aiImage: "Không",
      notes: "",
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
        deps.onSubmit({
          list: "",
          back: "",
          count: useCount,
          aiImage: "Không",
          notes: "",
        });
      });
      return;
    }
    submit.disabled = true;
    skip.disabled = true;
    deps.onSubmit({
      list: lst,
      back: bk,
      count: useCount,
      aiImage: "Không",
      notes: nt,
    });
  });

  return root;
}

/**
 * @param {string} cardType
 * @param {{ onSubmit: (p: Record<string, string>) => void }} deps
 */
export function createFlowCard(cardType, deps) {
  switch (cardType) {
    case "fullset_topic":
      return createFullsetTopicCard(deps);
    case "fullset_pdf": {
      const pendingPdf = takePendingPdfFile();
      return createFullsetPdfCard(
        pendingPdf ? { ...deps, initialFile: pendingPdf } : deps,
      );
    }
    case "pick_pdf_gate":
      return createPickPdfGateCard(deps);
    case "slide_pdf_meta":
      return createPdfMetaCard({
        title: "Form Slide (PDF)",
        countLabel: "Số lượng slide",
        countMin: 1,
        countMax: 30,
        defaultCount: "10",
        onSubmit: deps.onSubmit,
      });
    case "quiz_pdf_meta":
      return createPdfMetaCard({
        title: "Form Quiz (PDF)",
        countLabel: "Số lượng câu hỏi",
        countMin: 1,
        countMax: null,
        defaultCount: "15",
        onSubmit: deps.onSubmit,
      });
    case "flash_pdf_meta":
      return createPdfMetaCard({
        title: "Form Flashcard (PDF)",
        countLabel: "Số lượng thẻ",
        countMin: 1,
        countMax: 500,
        defaultCount: "20",
        onSubmit: deps.onSubmit,
      });
    case "slide_form":
      return createSlideFormCard(deps);
    case "quiz_form":
      return createQuizFormCard(deps);
    case "flash_form":
      return createFlashcardFormCard(deps);
    default:
      return el("div", "flow-card", "");
  }
}

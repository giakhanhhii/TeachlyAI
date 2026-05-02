/**
 * Audit fixes for mock tests 10–15 in backend/mock/thptqg_fulltest.json:
 * - Remove empty-string padding from context arrays (fix_fullthptqg.md)
 * - Apply verified correctIndex corrections
 * - Set explanation + explanationEvidence to match mock test 2 style (Vietnamese)
 *
 * Run: node scripts/patch_thptqg_mock10_15_quality.mjs
 * Then: node scripts/sync_thptqg_embedded_bundle.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "backend", "mock", "thptqg_fulltest.json");

const TARGET_IDS = new Set([
  "thptqg-simulation-test-10",
  "thptqg-simulation-test-11",
  "thptqg-simulation-test-12",
  "thptqg-simulation-test-13",
  "thptqg-simulation-test-14",
  "thptqg-simulation-test-15",
]);

/** questionNumber -> correctIndex (0-based) */
const CORRECT_INDEX_PATCHES = {
  "thptqg-simulation-test-11": {
    7: 3,
    18: 3,
    23: 1,
    24: 3,
    26: 3,
    29: 0,
    31: 2,
    35: 0,
    36: 2,
    40: 2,
  },
  "thptqg-simulation-test-13": {
    14: 2,
    15: 2,
    16: 0,
    17: 2,
    18: 1,
    37: 2,
    38: 0,
    40: 0,
  },
  "thptqg-simulation-test-14": {
    18: 2,
  },
};

const LETTERS = ["A", "B", "C", "D"];

function buildExplanation(q) {
  const ci = q.correctIndex;
  const letter = LETTERS[ci] ?? "?";
  const opt = q.options?.[ci] ?? "";
  const prompt = (q.prompt || "").trim();
  const pl = prompt.toLowerCase();

  if (
    /choose the option that best fits blank|blank \(\d+\)|numbered blanks|correct word or phrase that best fits/i.test(
      pl,
    )
  ) {
    return `Đáp án ${letter} (${opt}) hợp collocation và cấu trúc ngữ pháp tại chỗ trống; các phương án khác không tạo nghĩa hoặc không đi kèm đúng giới từ/hình thức từ loại trong ngữ cảnh đó.`;
  }
  if (
    /best arrangement|meaningful exchange|^question \d+\.\s*a[\.\-]|utterances or sentences/i.test(
      pl,
    )
  ) {
    return `Thứ tự ${letter} giữ đúng luồng hội thoại hoặc liên kết giữa các câu; các đáp án khác làm mất logic đáp–hỏi hoặc đảo sai trình tự diễn biến.`;
  }
  if (/opposite in meaning|is opposite in meaning/i.test(pl)) {
    return `Đáp án ${letter} (${opt}) tạo cặp trái nghĩa trực tiếp với từ/cụm gạch chân trong đoạn; các lựa chọn còn lại gần nghĩa hoặc không đối lập đúng ngữ cảnh.`;
  }
  if (
    /\bnot\b.*\bmentioned\b|\bwhich of the following is (not )?true\b|according to paragraph|in paragraph|refers to|could be best replaced|best paraphrases|best summaris|inferred from the passage|where in paragraph|following sentence best fit/i.test(
      pl,
    )
  ) {
    return `Đáp án ${letter} khớp chi tiết hoặc suy luận có căn cứ trong bài đọc; các phương án khác không được nhắc tới, mâu thuẫn đoạn văn, hoặc quá tuyệt đối so với nội dung.`;
  }
  return `Đáp án ${letter} (${opt}) phù hợp yêu cầu đề và ngữ cảnh; các lựa chọn khác không khớp logic hoặc không được văn bản hỗ trợ.`;
}

function stripEmptyContext(groups) {
  for (const g of groups) {
    if (!Array.isArray(g.context)) continue;
    g.context = g.context.filter(
      (s) => typeof s === "string" && s.trim().length > 0,
    );
  }
}

function patchInstructionTitles(test) {
  if (test.id !== "thptqg-simulation-test-13") return;

  for (const part of test.parts) {
    for (const g of part.groups) {
      if (typeof g.instruction === "string") {
        g.instruction = g.instruction
          .replace(/safer streets/gi, "green living")
          .replace(/about the urban shift/gi, "multicultural life");
      }
    }
  }
}

function patchTest11UrbanFragment(test) {
  if (test.id !== "thptqg-simulation-test-11") return;
  for (const part of test.parts) {
    for (const g of part.groups) {
      if (!Array.isArray(g.context)) continue;
      g.context = g.context.map((s) =>
        typeof s === "string"
          ? s.replace(
              /On one hand, opportunities, higher salaries/g,
              "On one hand, there are more opportunities, higher salaries",
            )
          : s,
      );
    }
  }
}

function applyPatches(bundle) {
  const list = bundle.tests;
  if (!Array.isArray(list)) throw new Error("Expected bundle.tests array");

  for (const test of list) {
    if (!TARGET_IDS.has(test.id)) continue;

    patchInstructionTitles(test);
    patchTest11UrbanFragment(test);

    for (const part of test.parts) {
      stripEmptyContext(part.groups);
    }

    const patches = CORRECT_INDEX_PATCHES[test.id];
    if (!test.questions) continue;

    for (const q of test.questions) {
      if (patches && typeof patches[q.number] === "number") {
        q.correctIndex = patches[q.number];
      }
      q.explanation = buildExplanation(q);
      q.explanationEvidence = `Cau ${q.number}: doi chieu ngu phap, ngu nghia va van canh doan van.`;
    }
  }
}

const raw = fs.readFileSync(JSON_PATH, "utf8");
const bundle = JSON.parse(raw);
applyPatches(bundle);
fs.writeFileSync(JSON_PATH, JSON.stringify(bundle, null, 2) + "\n", "utf8");
console.log(`Patched ${JSON_PATH} (mock 10–15 context + explanations + answer keys).`);

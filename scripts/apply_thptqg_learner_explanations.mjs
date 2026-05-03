/**
 * Gộp lời giải học đường (tiếng Việt, dễ hiểu) vào backend/mock/thptqg_fulltest.json
 * cho đề Mock 03–09. Chạy: node scripts/apply_thptqg_learner_explanations.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { explanations as ex03 } from "./thptqg_learner_explanations/test03.mjs";
import { explanations as ex04 } from "./thptqg_learner_explanations/test04.mjs";
import { explanations as ex05 } from "./thptqg_learner_explanations/test05.mjs";
import { explanations as ex06 } from "./thptqg_learner_explanations/test06.mjs";
import { explanations as ex07 } from "./thptqg_learner_explanations/test07.mjs";
import { explanations as ex08 } from "./thptqg_learner_explanations/test08.mjs";
import { explanations as ex09 } from "./thptqg_learner_explanations/test09.mjs";

const MAP = {
  "thptqg-simulation-test-3": ex03,
  "thptqg-simulation-test-4": ex04,
  "thptqg-simulation-test-5": ex05,
  "thptqg-simulation-test-6": ex06,
  "thptqg-simulation-test-7": ex07,
  "thptqg-simulation-test-8": ex08,
  "thptqg-simulation-test-9": ex09,
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "backend/mock/thptqg_fulltest.json");

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let updated = 0;

for (const test of data.tests) {
  const ex = MAP[test.id];
  if (!ex || !Array.isArray(test.questions)) continue;
  for (const q of test.questions) {
    const row = ex[q.number];
    if (!row) continue;
    if (row.explanation != null) q.explanation = row.explanation;
    if (row.explanationEvidence != null) q.explanationEvidence = row.explanationEvidence;
    updated++;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Applied learner explanations: ${updated} questions (Mock 03–09).`);

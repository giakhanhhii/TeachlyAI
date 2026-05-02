import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "backend", "mock", "thptqg_fulltest.json");

const raw = fs.readFileSync(JSON_PATH, "utf8");
const bundle = JSON.parse(raw);
const test = bundle.tests.find((t) => t.id === "thptqg-simulation-test-11");
if (!test) throw new Error("thptqg-simulation-test-11 not found");

for (const q of test.questions) {
  if (![13, 14, 15, 16, 17].includes(q.number) || typeof q.prompt !== "string")
    continue;
  q.prompt = q.prompt
    .replace(/ - a\./g, " a.")
    .replace(/ - b\./g, " b.")
    .replace(/ - c\./g, " c.")
    .replace(/ - d\./g, " d.")
    .replace(/ - e\./g, " e.")
    .replace(/ - f\./g, " f.");
}

fs.writeFileSync(JSON_PATH, JSON.stringify(bundle, null, 2) + "\n", "utf8");
console.log("Removed stray ' - a.'… hyphen prefixes from test 11 questions 13–17.");

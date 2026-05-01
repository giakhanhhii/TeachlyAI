import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "backend", "mock", "thptqg_fulltest.json");

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

function getTest(testId) {
  const test = data.tests.find((item) => item.id === testId);
  if (!test) {
    throw new Error(`Missing test: ${testId}`);
  }
  return test;
}

function getGroup(test, groupId) {
  for (const part of test.parts || []) {
    const group = (part.groups || []).find((item) => item.id === groupId);
    if (group) return group;
  }
  throw new Error(`Missing group: ${test.id} ${groupId}`);
}

function getQuestion(test, number) {
  const question = (test.questions || []).find((item) => item.number === number);
  if (!question) {
    throw new Error(`Missing question: ${test.id} #${number}`);
  }
  return question;
}

function joinParagraphs(context, segments) {
  return segments.map((segment) => {
    if (Array.isArray(segment)) {
      const [from, to] = segment;
      return context.slice(from, to + 1).join(" ").replace(/\s+/g, " ").trim();
    }
    return String(context[segment] || "").trim();
  });
}

function overrideGroup(testId, groupId, segments) {
  const test = getTest(testId);
  const group = getGroup(test, groupId);
  group.context = joinParagraphs(group.context || [], segments);
}

function overridePrompt(testId, number, prompt) {
  const test = getTest(testId);
  getQuestion(test, number).prompt = prompt;
}

const GROUP_OVERRIDES = [
  ["thptqg-simulation-test-2", "part-4-group-6", [[0, 2], 3, [4, 5], [6, 8]]],
  ["thptqg-simulation-test-4", "part-4-group-4", [[0, 2], [3, 4], [5, 7], 8, 9]],
  ["thptqg-simulation-test-7", "part-4-group-6", [0, 1, [2, 4], 5, [6, 7], 8]],
  ["thptqg-simulation-test-8", "part-2-group-3", [[0, 2], [3, 5], [6, 8], 9]],
  ["thptqg-simulation-test-8", "part-3-group-3", [[0, 2], [3, 5], [6, 8], 9]],
  ["thptqg-simulation-test-9", "part-1-group-2", [0, [1, 4], [5, 6], 7, [8, 9], [10, 11]]],
  ["thptqg-simulation-test-9", "part-2-group-2", [0, [1, 4], [5, 6], 7, [8, 9], [10, 11]]],
  ["thptqg-simulation-test-11", "part-4-group-6", [[0, 2], [3, 4], 5, [6, 7]]],
  ["thptqg-simulation-test-13", "part-2-group-3", [[0, 2], [3, 4], [5, 6], [7, 8], 9]],
  ["thptqg-simulation-test-13", "part-3-group-3", [[0, 2], [3, 4], [5, 6], [7, 8], 9]],
  ["thptqg-simulation-test-14", "part-4-group-6", [0, [1, 3], 4, 5, 6]],
  ["thptqg-simulation-test-15", "part-2-group-4", [[0, 1], [2, 4], 5, 6]],
  ["thptqg-simulation-test-15", "part-3-group-4", [[0, 1], [2, 4], 5, 6]],
  ["thptqg-simulation-test-16", "part-1-group-2", [[0, 2], [3, 4], [5, 6], [7, 8], [9, 11]]],
  ["thptqg-simulation-test-16", "part-2-group-2", [[0, 2], [3, 4], [5, 6], [7, 8], [9, 11]]],
  ["thptqg-simulation-test-17", "part-4-group-6", [[0, 2], 3, [4, 5], [6, 8]]],
  ["thptqg-simulation-test-18", "part-2-group-3", [[0, 3], 4, 5, 6]],
  ["thptqg-simulation-test-18", "part-3-group-3", [[0, 3], 4, 5, 6]],
  ["thptqg-simulation-test-19", "part-4-group-6", [[0, 1], [2, 5], 6, 7]],
];

const PROMPT_OVERRIDES = [
  [
    "thptqg-simulation-test-4",
    38,
    'Question 38. The word "unabated" in paragraph 5 is OPPOSITE in meaning to _.',
  ],
  [
    "thptqg-simulation-test-14",
    34,
    "Question 34. The word viable in paragraph 4 is OPPOSITE in meaning to.",
  ],
];

GROUP_OVERRIDES.forEach(([testId, groupId, segments]) => overrideGroup(testId, groupId, segments));
PROMPT_OVERRIDES.forEach(([testId, number, prompt]) => overridePrompt(testId, number, prompt));

fs.writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Repaired paragraph grouping in ${GROUP_OVERRIDES.length} groups.`);

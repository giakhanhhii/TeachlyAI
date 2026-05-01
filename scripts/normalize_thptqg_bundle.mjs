import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "backend", "mock", "thptqg_fulltest.json");
const EMBEDDED_PATH = path.join(ROOT, "frontend", "js", "chatbot", "services", "embeddedThptqgFullTestBundle.js");

const DIRECTIVE_SPLIT_PATTERNS = [
  /^(.*?\bfrom\s+\d+\s+to\s+\d+\s*[.:*]?)\s+(.+)$/i,
  /^(.*?\bquestions?\s+\d+\s+to\s+\d+\s*[.:*]?)\s+(.+)$/i,
  /^(.*?\bthe following questions\s*[.:*]?)\s+(.+)$/i,
  /^(.*?\bnumbered blanks\s*[.:*]?)\s+(.+)$/i,
  /^(.*?\bbest answer to each of the following questions\s*[.:*]?)\s+(.+)$/i,
];

const NOISE_LINE_PATTERNS = [
  /^\s*Tài\s+tài\s+liệu\s+free\s+tại\s+Tailieuonthi\.org\s*$/i,
  /^\s*Tài\s+liệu\s+free\s+tại\s+Tailieuonthi\.org\s*$/i,
  /^\s*Tailieuonthi\.org\s*$/i,
  /^\s*TaiLieuOnThi\s*$/i,
  /^\s*TailieuOnThi\s*$/i,
  /^\s*#{2,}\s*$/i,
];

const PARAGRAPH_TRANSITIONS = [
  "Firstly",
  "First",
  "Secondly",
  "Second",
  "Thirdly",
  "Third",
  "Finally",
  "However",
  "Moreover",
  "In addition",
  "Additionally",
  "For example",
  "For instance",
  "In conclusion",
  "In summary",
  "Overall",
  "Meanwhile",
  "Today",
  "Nowadays",
  "Unlike",
  "Despite",
  "Therefore",
  "As a result",
  "Recent studies",
  "The government believes",
  "Others put",
  "All these",
  "So when",
  "And what",
  "So, why",
  "While it is true",
  "In the past",
  "Now, however",
  "Beyond",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeEmbeddedBundle(filePath, value) {
  const raw = JSON.stringify(value, null, 2);
  const encoded = JSON.stringify(raw);
  fs.writeFileSync(filePath, `export const EMBEDDED_THPTQG_FULLTEST = JSON.parse(${encoded});\n`, "utf8");
}

function normalizeSpacing(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripNoiseLines(text) {
  return normalizeSpacing(text)
    .split("\n")
    .filter((line) => !NOISE_LINE_PATTERNS.some((pattern) => pattern.test(line.trim())))
    .join("\n")
    .trim();
}

function cleanText(text, { keepNewlines = true } = {}) {
  let next = String(text || "");
  next = next.replace(/\\([*_#])/g, "$1");
  next = next.replace(/^#{1,6}\s+/gm, "");
  next = next.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1");
  next = next.replace(/\s*\*\s*/g, " ");
  next = next.replace(/\$\s*(\d+)/g, "$1");
  next = next.replace(/\bA,\s*B,\s*or\s*D\b/gi, "A, B, C, or D");
  next = next.replace(/\bA,\s*B,\s*or\s*Don\b/gi, "A, B, C, or D on");
  next = next.replace(/\bor Don your\b/gi, "or D on your");
  next = next.replace(/\b([A-Za-z0-9_-]+)\.\s+md\b/g, "$1.md");
  next = next.replace(/\bCVA offers a variety of opportunities for individuals\s+_/gi, "CVA offers a variety of opportunities for individuals (16) _");
  next = next.replace(/\s+([,.;:!?])/g, "$1");
  next = next.replace(/([,.;:!?])(?=[A-Za-z"(])/g, "$1 ");
  next = next.replace(/\s*#{2,}\s*/g, " ");
  next = next.replace(/\s{2,}/g, " ");
  next = stripNoiseLines(next);
  if (!keepNewlines) {
    next = next.replace(/\n+/g, " ");
  }
  return normalizeSpacing(next);
}

function isGenericTitle(text) {
  return /^Câu\s+\d+$/i.test(String(text || "").trim());
}

function isHeadingLike(text) {
  const line = String(text || "").trim();
  if (!line || line.length > 90) return false;
  if (/^[A-Z0-9'"():,&\- ]+$/.test(line)) return true;
  const upperCount = Array.from(line).filter((ch) => ch >= "A" && ch <= "Z").length;
  return upperCount >= Math.max(5, Math.floor(line.length / 2));
}

function splitDirectiveAndBody(instruction, contextLines) {
  const cleanedInstruction = cleanText(instruction, { keepNewlines: true });
  const cleanedContextLines = contextLines.map((line) => cleanText(line, { keepNewlines: true })).filter(Boolean);
  if (!cleanedInstruction) {
    return {
      instruction: "",
      body: cleanedContextLines.join("\n\n"),
    };
  }

  let bodyFromInstruction = "";
  let nextInstruction = cleanedInstruction;
  const shouldTrySplit = cleanedInstruction.length > 220 || cleanedContextLines.length === 0;
  if (shouldTrySplit) {
    for (const pattern of DIRECTIVE_SPLIT_PATTERNS) {
      const match = cleanedInstruction.match(pattern);
      if (!match) continue;
      const candidateInstruction = cleanText(match[1], { keepNewlines: false });
      const candidateBody = cleanText(match[2], { keepNewlines: true });
      if (candidateBody.length < 80 && /^from\s+\d+\s+to\s+\d+[.:]?$/i.test(candidateBody)) {
        continue;
      }
      nextInstruction = candidateInstruction;
      bodyFromInstruction = candidateBody;
      break;
    }
  }

  if (!bodyFromInstruction && cleanedInstruction.length > 400 && cleanedContextLines.length === 0) {
    const firstSentenceBoundary = cleanedInstruction.indexOf(". ");
    if (firstSentenceBoundary > 0 && firstSentenceBoundary < 260) {
      nextInstruction = cleanText(cleanedInstruction.slice(0, firstSentenceBoundary + 1), { keepNewlines: false });
      bodyFromInstruction = cleanText(cleanedInstruction.slice(firstSentenceBoundary + 2), { keepNewlines: true });
    }
  }

  return {
    instruction: nextInstruction,
    body: [bodyFromInstruction, ...cleanedContextLines].filter(Boolean).join("\n\n"),
  };
}

function breakSentenceBlock(block) {
  const normalized = cleanText(block, { keepNewlines: false })
    .replace(/\s+\((I|II|III|IV)\)\s+/g, "\n($1) ")
    .replace(/\.\s+\((I|II|III|IV)\)\s+/g, ".\n($1) ");
  const rawSegments = normalized
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=(?:["'(]*[A-Z]|\([IVX]+\)))/))
    .map((segment) => cleanText(segment, { keepNewlines: false }))
    .filter(Boolean);

  const paragraphs = [];
  let current = [];
  let currentLength = 0;

  rawSegments.forEach((segment) => {
    const startsNewParagraph =
      current.length > 0
      && (
        currentLength >= 420
        || current.length >= 3
        || PARAGRAPH_TRANSITIONS.some((prefix) => segment.startsWith(prefix))
        || /^\([IVX]+\)/.test(segment)
      );
    if (startsNewParagraph) {
      paragraphs.push(current.join(" "));
      current = [];
      currentLength = 0;
    }
    current.push(segment);
    currentLength += segment.length;
  });

  if (current.length) {
    paragraphs.push(current.join(" "));
  }
  return paragraphs.map((paragraph) => cleanText(paragraph, { keepNewlines: false })).filter(Boolean);
}

function splitBodyIntoParagraphs(bodyText) {
  const raw = cleanText(bodyText, { keepNewlines: true });
  if (!raw) return [];

  const explicitBlocks = raw
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const paragraphs = explicitBlocks.flatMap((block) => {
    const singleLine = cleanText(block, { keepNewlines: false });
    if (singleLine.length <= 320) {
      return [singleLine];
    }
    return breakSentenceBlock(singleLine);
  });
  return paragraphs.filter(Boolean);
}

function promoteHeading(title, paragraphs) {
  const nextParagraphs = [...paragraphs];
  let nextTitle = cleanText(title, { keepNewlines: false });
  if (!isGenericTitle(nextTitle) && nextTitle) {
    return { title: nextTitle, paragraphs: nextParagraphs };
  }
  if (nextParagraphs.length && isHeadingLike(nextParagraphs[0])) {
    nextTitle = cleanText(nextParagraphs.shift(), { keepNewlines: false });
  }
  return {
    title: nextTitle || cleanText(title, { keepNewlines: false }),
    paragraphs: nextParagraphs,
  };
}

function normalizeGroup(group) {
  const sourceContext = Array.isArray(group?.context) ? group.context : [];
  const { instruction, body } = splitDirectiveAndBody(group?.instruction || "", sourceContext);
  const paragraphs = splitBodyIntoParagraphs(body);
  const promoted = promoteHeading(group?.title || "", paragraphs);
  return {
    ...group,
    title: cleanText(promoted.title || group?.title || "", { keepNewlines: false }),
    instruction: cleanText(instruction, { keepNewlines: false }),
    context: promoted.paragraphs.map((paragraph) => cleanText(paragraph, { keepNewlines: false })).filter(Boolean),
  };
}

function normalizeQuestionText(text) {
  let next = cleanText(text, { keepNewlines: false });
  next = next.replace(/\(\s*(\d+)\s*\)_/g, "($1) _");
  next = next.replace(/\(\s*(\d+)\s*\)\./g, "($1).");
  return next;
}

function normalizeBundle(bundle) {
  const next = structuredClone(bundle);
  next.tests = (Array.isArray(next.tests) ? next.tests : []).map((test) => {
    const normalizedTest = {
      ...test,
      title: cleanText(test.title, { keepNewlines: false }),
      source: cleanText(test.source, { keepNewlines: false }),
      parts: (Array.isArray(test.parts) ? test.parts : []).map((part) => ({
        ...part,
        title: cleanText(part.title, { keepNewlines: false }),
        groups: (Array.isArray(part.groups) ? part.groups : []).map(normalizeGroup),
      })),
      questions: (Array.isArray(test.questions) ? test.questions : []).map((question) => ({
        ...question,
        prompt: normalizeQuestionText(question.prompt),
        options: (Array.isArray(question.options) ? question.options : []).map((option) => normalizeQuestionText(option)),
        explanation: cleanText(question.explanation, { keepNewlines: false }),
        explanationEvidence: cleanText(question.explanationEvidence, { keepNewlines: false }),
      })),
    };
    return normalizedTest;
  });
  return next;
}

const bundle = readJson(JSON_PATH);
const normalized = normalizeBundle(bundle);
writeJson(JSON_PATH, normalized);
writeEmbeddedBundle(EMBEDDED_PATH, normalized);

const summary = normalized.tests.map((test) => ({
  id: test.id,
  groups: test.parts.flatMap((part) => part.groups || []).length,
  emptyContexts: test.parts.flatMap((part) => part.groups || []).filter((group) => !(group.context || []).length).length,
}));
console.log(JSON.stringify(summary, null, 2));

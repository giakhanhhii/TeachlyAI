import { DIRECT_FLASH_PRESETS } from "./directFlashPresets.js";

function normalizeLineBreaks(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function cleanLabelValue(line) {
  const colonIndex = line.indexOf(":");
  return colonIndex >= 0 ? line.slice(colonIndex + 1).trim() : line.trim();
}

function extractFrontLines(card) {
  return normalizeLineBreaks(card?.front)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractBackLines(card) {
  return normalizeLineBreaks(card?.back)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractRootWord(card) {
  const frontLines = extractFrontLines(card);
  const labelledRoot = frontLines.find((line) => /^từ gốc\s*:/i.test(line));
  if (labelledRoot) return cleanLabelValue(labelledRoot);
  const firstLine = frontLines[0] || "";
  if (firstLine.includes(" - ")) return firstLine.split(" - ")[0].trim();
  return cleanLabelValue(firstLine);
}

function extractWordFormationAnswer(card) {
  const firstLine = extractBackLines(card)[0] || "";
  const raw = cleanLabelValue(firstLine);
  return raw.split(/\s+\(/)[0].split(":")[0].trim();
}

function extractQuizAnswer(card, preset) {
  const presetId = String(preset?.id || "").toLowerCase();
  const topic = String(preset?.topic || "").toLowerCase();
  if (presetId.includes("word-formation") || topic.includes("word formation")) {
    return extractWordFormationAnswer(card) || extractRootWord(card);
  }
  return extractRootWord(card);
}

function extractMeaning(card) {
  const firstLine = extractBackLines(card)[0] || "";
  return cleanLabelValue(firstLine);
}

function extractHintText(card) {
  const raw = String(card?.hint || "").trim();
  return raw.replace(/^(Example|Use|Note|Hint)\s*:\s*/i, "").trim();
}

function extractSynonym(card) {
  return cleanLabelValue(extractFrontLines(card).find((line) => /^đồng nghĩa\s*:/i.test(line)) || "");
}

function extractAntonym(card) {
  return cleanLabelValue(extractFrontLines(card).find((line) => /^trái nghĩa\s*:/i.test(line)) || "");
}

function buildDistractorIndexes(length, index) {
  const picks = [];
  for (let step = 1; picks.length < 3 && step < length; step += 1) {
    const candidate = (index + step * 7) % length;
    if (candidate !== index && !picks.includes(candidate)) picks.push(candidate);
  }
  for (let step = 1; picks.length < 3 && step < length; step += 1) {
    const candidate = (index + step * 11) % length;
    if (candidate !== index && !picks.includes(candidate)) picks.push(candidate);
  }
  return picks.slice(0, 3);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildBlankedSentence(exampleText, answer, preset) {
  const cleanExample = String(exampleText || "").trim();
  const cleanAnswer = String(answer || "").trim();
  if (!cleanExample) return "";
  if (!cleanAnswer) return cleanExample;

  const variants = [cleanAnswer];
  if (cleanAnswer.includes(" - ")) variants.push(cleanAnswer.split(" - ")[0].trim());

  for (const variant of variants.filter(Boolean)) {
    const regex = new RegExp(`\\b${escapeRegExp(variant)}\\b`, "i");
    if (regex.test(cleanExample)) return cleanExample.replace(regex, "_______");
  }

  const presetId = String(preset?.id || "").toLowerCase();
  if (presetId.includes("synonyms-antonyms")) {
    const collocation = cleanExample.replace(/[.?!]+$/, "");
    if (collocation) return `The teacher used the phrase "${collocation}" to explain the blank _______.`;
  }

  return cleanExample;
}

function buildFallbackSentence(answer, card, preset) {
  const kind = String(preset?.kind || "").toLowerCase();
  const topic = String(preset?.topic || "").toLowerCase();
  const phrase = extractHintText(card).replace(/[.?!]+$/, "");

  if (kind === "word formation") {
    return `Choose the correct form to complete the sentence: The school expects a clear _______ from every applicant.`;
  }

  if (kind === "phrasal verbs") {
    return `The teacher asked the class to _______ the new grammar points once more before the quiz.`;
  }

  if (kind === "idioms") {
    return `Before the final exam, most students have to _______ for several nights in a row.`;
  }

  if (kind === "synonyms and antonyms") {
    return `The report should provide _______ information so readers can trust the result.`;
  }

  if (kind === "collocations") {
    return `Students need to _______ regularly if they want to improve before the final test.`;
  }

  if (topic.includes("giới từ") || topic.includes("từ nối")) {
    return `The writer used the expression _______ to connect the two ideas clearly.`;
  }

  if (phrase) return `Choose the option that best completes the sentence related to "${phrase}": _______.`;
  return `Choose the option that best fits the blank in the sentence: _______.`;
}

function buildThptqgStylePrompt(card, preset) {
  const answer = extractQuizAnswer(card, preset);
  const hintText = extractHintText(card);
  const blanked = buildBlankedSentence(hintText, answer, preset);
  const sentence = blanked || buildFallbackSentence(answer, card, preset);
  return `Choose the option that best fits the blank in the sentence: ${sentence}`;
}

function buildOptionPool(cards, preset, index) {
  const correct = extractQuizAnswer(cards[index], preset);
  const distractorIndexes = buildDistractorIndexes(cards.length, index);
  const options = [correct, ...distractorIndexes.map((itemIndex) => extractQuizAnswer(cards[itemIndex], preset))]
    .filter(Boolean)
    .filter((option, optionIndex, arr) => arr.indexOf(option) === optionIndex);
  if (options.length >= 4) return options.slice(0, 4);
  return [
    ...options,
    ...cards
      .map((card) => extractQuizAnswer(card, preset))
      .filter(Boolean)
      .filter((option, optionIndex, arr) => arr.indexOf(option) === optionIndex),
  ].slice(0, 4);
}

function reorderOptions(options, correctIndex) {
  const answerIndex = Math.max(0, Math.min(options.length - 1, correctIndex % Math.max(1, options.length)));
  if (answerIndex === 0) return { options, correctIndex: 0 };
  const reordered = options.slice();
  [reordered[0], reordered[answerIndex]] = [reordered[answerIndex], reordered[0]];
  return { options: reordered, correctIndex: answerIndex };
}

function buildVocabularyQuestionBank(preset) {
  const cards = Array.isArray(preset?.cards) ? preset.cards.slice(0, 40) : [];
  return cards.map((card, index) => {
    const optionPool = buildOptionPool(cards, preset, index);
    const ordered = reorderOptions(optionPool, index);
    const answer = extractQuizAnswer(card, preset);
    const meaning = extractMeaning(card);
    return {
      id: `quiz-${preset.id}-${String(index + 1).padStart(2, "0")}`,
      text: buildThptqgStylePrompt(card, preset),
      options: ordered.options,
      correctIndex: ordered.correctIndex,
      hint: `Đáp án đúng xoay quanh "${answer}" (${meaning}).`,
    };
  });
}

function buildDefaultQuestionIndexes(count) {
  const picked = [];
  const want = Math.max(1, Math.min(40, count));
  const step = 40 / want;
  for (let i = 0; i < want; i += 1) {
    const idx = Math.min(39, Math.floor(i * step));
    if (!picked.includes(idx)) picked.push(idx);
  }
  while (picked.length < want) {
    const idx = picked.length;
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked.map((index) => index + 1);
}

function resolveQuizKindFromFlashPreset(preset) {
  const id = String(preset?.id || "").toLowerCase();
  const topic = String(preset?.topic || "").toLowerCase();
  if (id.includes("synonyms-antonyms")) return "Synonyms and Antonyms";
  if (id.includes("prefix-suffix") || id.includes("opposite-prefixes") || topic.includes("word formation")) return "Word Formation";
  if (id.includes("phrasal-verbs")) return "Phrasal Verbs";
  if (id.includes("collocations") || topic.includes("collocation")) return "Collocations";
  if (id.includes("linking") || topic.includes("từ nối") || topic.includes("liên kết")) return "Word Choice";
  if (topic.includes("idiom") || topic.includes("thành ngữ")) return "Idioms";
  return "Word Choice";
}

function pickQuestionSet(questions, indexes) {
  const picked = indexes.map((index) => questions[index - 1]).filter(Boolean);
  return picked.length ? picked : questions.slice();
}

function buildQuizPresetFromFlashPreset(preset, index) {
  const count = String(20 + (index % 5));
  const questions = buildVocabularyQuestionBank(preset);
  const defaultQuestions = pickQuestionSet(questions, buildDefaultQuestionIndexes(Number(count)));
  const kind = resolveQuizKindFromFlashPreset(preset);
  return {
    id: `quiz-extra-${preset.id}`,
    source: preset.topic,
    kind,
    count,
    difficulty: index % 3 === 0 ? "Cơ bản" : index % 3 === 1 ? "Khá" : "Nâng cao",
    notes: `Form câu ngắn bám kiểu THPTQG từ đề 1-15, sáng tạo thêm theo chủ đề: ${preset.notes}`,
    questions,
    defaultQuestions,
  };
}

export const EXTRA_DIRECT_QUIZ_PRESETS = DIRECT_FLASH_PRESETS.slice(0, 40).map(buildQuizPresetFromFlashPreset);

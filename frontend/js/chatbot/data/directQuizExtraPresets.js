import { DIRECT_FLASH_PRESETS } from "./directFlashPresets.js";

function normalizeLineBreaks(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractTerm(card) {
  const front = normalizeLineBreaks(card?.front);
  const firstLine = front.split("\n").map((line) => line.trim()).find(Boolean) || front;
  const colonIndex = firstLine.indexOf(":");
  return colonIndex >= 0 ? firstLine.slice(colonIndex + 1).trim() : firstLine;
}

function extractMeaning(card) {
  const back = normalizeLineBreaks(card?.back);
  if (!back) return "";
  const firstLine = back.split("\n").map((line) => line.trim()).find(Boolean) || back;
  const colonIndex = firstLine.indexOf(":");
  return colonIndex >= 0 ? firstLine.slice(colonIndex + 1).trim() : firstLine;
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

function buildVocabularyQuestionBank(preset) {
  const cards = Array.isArray(preset?.cards) ? preset.cards.slice(0, 40) : [];
  return cards.map((card, index) => {
    const term = extractTerm(card);
    const correct = extractMeaning(card);
    const distractorIndexes = buildDistractorIndexes(cards.length, index);
    const options = [correct, ...distractorIndexes.map((itemIndex) => extractMeaning(cards[itemIndex]))]
      .filter(Boolean)
      .slice(0, 4);
    const paddedOptions = options.length === 4 ? options : [...options, ...cards.map((item) => extractMeaning(item)).filter(Boolean)]
      .filter((option, optionIndex, arr) => arr.indexOf(option) === optionIndex)
      .slice(0, 4);
    return {
      id: `quiz-${preset.id}-${String(index + 1).padStart(2, "0")}`,
      text: `Choose the best Vietnamese meaning of: ${term}`,
      options: paddedOptions,
      correctIndex: 0,
      hint: String(card?.hint || `Vocabulary focus: ${preset.topic}`).trim(),
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

function pickQuestionSet(questions, indexes) {
  const picked = indexes.map((index) => questions[index - 1]).filter(Boolean);
  return picked.length ? picked : questions.slice();
}

function buildQuizPresetFromFlashPreset(preset, index) {
  const count = String(20 + (index % 5));
  const questions = buildVocabularyQuestionBank(preset);
  const defaultQuestions = pickQuestionSet(questions, buildDefaultQuestionIndexes(Number(count)));
  return {
    id: `quiz-extra-${preset.id}`,
    source: `Vocabulary: ${preset.topic}`,
    kind: "Vocabulary",
    count,
    difficulty: index % 3 === 0 ? "Cơ bản" : index % 3 === 1 ? "Khá" : "Nâng cao",
    notes: `Tạo từ preset flashcard: ${preset.notes}`,
    questions,
    defaultQuestions,
  };
}

export const EXTRA_DIRECT_QUIZ_PRESETS = DIRECT_FLASH_PRESETS.slice(0, 40).map(buildQuizPresetFromFlashPreset);

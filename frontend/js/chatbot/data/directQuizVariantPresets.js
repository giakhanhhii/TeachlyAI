function cloneQuestions(questions, prefix) {
  return (questions || []).map((question, index) => ({
    ...question,
    id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    options: Array.isArray(question?.options) ? question.options.slice() : [],
  }));
}

function pickQuestions(questions, indexes, prefix) {
  const picked = (indexes || [])
    .map((index) => questions[index - 1])
    .filter(Boolean);
  return cloneQuestions(picked, prefix);
}

function findBasePreset(basePresets, id) {
  return (basePresets || []).find((preset) => preset.id === id) || null;
}

function buildVariantPreset(basePresets, config) {
  const sourcePreset = findBasePreset(basePresets, config.baseId);
  if (!sourcePreset) return null;
  const questions = pickQuestions(sourcePreset.questions, config.indexes, config.id);
  return {
    id: config.id,
    source: config.source,
    kind: config.kind,
    count: String(config.count || questions.length || sourcePreset.count || 20),
    difficulty: config.difficulty || sourcePreset.difficulty,
    notes: config.notes || sourcePreset.notes,
    questions,
    defaultQuestions: questions.slice(0, Math.min(Number(config.count || questions.length || 20), questions.length)),
  };
}

function shuffleCopy(list) {
  const arr = Array.isArray(list) ? list.slice() : [];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isVocabularyLikePreset(preset) {
  const kind = String(preset?.kind || "").toLowerCase();
  return [
    "vocabulary",
    "word choice",
    "word formation",
    "phrasal verbs",
    "idioms",
    "synonyms and antonyms",
    "collocations",
  ].includes(kind);
}

export function buildBalancedQuizAutofillSamples(presets) {
  const nonVocabulary = shuffleCopy((presets || []).filter((preset) => !isVocabularyLikePreset(preset)));
  const vocabulary = shuffleCopy((presets || []).filter((preset) => isVocabularyLikePreset(preset)));
  const ordered = [];

  while (nonVocabulary.length || vocabulary.length) {
    if (nonVocabulary.length) ordered.push(nonVocabulary.shift());
    if (nonVocabulary.length) ordered.push(nonVocabulary.shift());
    if (vocabulary.length) ordered.push(vocabulary.shift());
  }

  return ordered.map((preset) => ({
    id: preset.id,
    s: preset.source,
    k: preset.kind,
    q: preset.count,
    d: preset.difficulty,
    n: preset.notes,
  }));
}

export function buildQuizVariantPresets(basePresets) {
  const configs = [
    {
      id: "quiz-variant-passive-reported-speech",
      baseId: "quiz-sentence-transformation",
      source: "Câu bị động và câu tường thuật",
      kind: "Grammar",
      count: 18,
      difficulty: "Khá",
      notes: "Biến đổi câu xoay quanh bị động, reported speech, suggest, advise và remind.",
      indexes: [5, 7, 15, 17, 21, 24, 29, 35, 40, 2, 10, 16, 23, 31, 34, 36, 38, 39],
    },
    {
      id: "quiz-variant-conditionals-wish-inversion",
      baseId: "quiz-sentence-transformation",
      source: "Điều kiện, wish và đảo ngữ",
      kind: "Grammar",
      count: 18,
      difficulty: "Nâng cao",
      notes: "Tập trung vào if, unless, wish, hardly/no sooner và các mẫu đảo ngữ quen thuộc.",
      indexes: [1, 3, 8, 9, 11, 14, 20, 22, 25, 27, 28, 30, 32, 33, 37, 4, 12, 18],
    },
    {
      id: "quiz-variant-error-subject-verb-agreement",
      baseId: "quiz-error-identification",
      source: "Tìm lỗi sai: Hòa hợp chủ vị",
      kind: "Grammar",
      count: 16,
      difficulty: "Cơ bản",
      notes: "Chỉ tập trung vào chủ ngữ đặc biệt, each/every, there is/are và cấu trúc either/neither.",
      indexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 31, 32, 33, 34, 35, 36],
    },
    {
      id: "quiz-variant-error-tenses-conditions",
      baseId: "quiz-error-identification",
      source: "Tìm lỗi sai: Thì động từ và câu điều kiện",
      kind: "Grammar",
      count: 15,
      difficulty: "Khá",
      notes: "Rà lỗi về thì, lùi thì, wish, mệnh đề thời gian và điều kiện.",
      indexes: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 37, 38, 39, 40, 30],
    },
    {
      id: "quiz-variant-error-word-form-parallel",
      baseId: "quiz-error-identification",
      source: "Tìm lỗi sai: Từ loại và song song",
      kind: "Grammar",
      count: 18,
      difficulty: "Khá",
      notes: "Luyện nhận diện adjective, adverb, noun form và lỗi song song trong câu.",
      indexes: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 34, 35, 36, 37, 38, 39, 40, 33],
    },
    {
      id: "quiz-variant-present-perfect-past-perfect",
      baseId: "quiz-tenses-verb-forms",
      source: "Hiện tại hoàn thành và quá khứ hoàn thành",
      kind: "Grammar",
      count: 20,
      difficulty: "Khá",
      notes: "Bao gồm since/for, by the time, already, how long và chuỗi hành động quá khứ.",
      indexes: [3, 4, 8, 10, 13, 18, 20, 24, 26, 29, 31, 33, 38, 39, 2, 7, 15, 19, 30, 36],
    },
    {
      id: "quiz-variant-future-forms-conditionals",
      baseId: "quiz-tenses-verb-forms",
      source: "Tương lai, câu điều kiện và wish",
      kind: "Grammar",
      count: 20,
      difficulty: "Khá",
      notes: "Tập trung vào future continuous, future perfect, conditionals, wish và if only.",
      indexes: [5, 6, 9, 15, 16, 17, 21, 23, 25, 28, 29, 35, 36, 37, 40, 1, 11, 22, 32, 34],
    },
    {
      id: "quiz-variant-relative-pronouns",
      baseId: "quiz-relative-clauses",
      source: "Đại từ quan hệ và trạng từ quan hệ",
      kind: "Grammar",
      count: 20,
      difficulty: "Khá",
      notes: "Chỉ xoay quanh who, whom, whose, which, where, when, why và giới từ + whom/which.",
      indexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 19, 20, 31, 32],
    },
    {
      id: "quiz-variant-reduced-relative-clauses",
      baseId: "quiz-relative-clauses",
      source: "Rút gọn mệnh đề quan hệ",
      kind: "Grammar",
      count: 18,
      difficulty: "Nâng cao",
      notes: "V-ing, V3/ed và các dạng rút gọn thường gặp trong đề thi.",
      indexes: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 34, 35, 37, 38, 39, 40, 13, 17],
    },
    {
      id: "quiz-variant-reading-career-skills",
      baseId: "quiz-reading-education",
      source: "Reading: Career Skills and Study Habits",
      kind: "Reading",
      count: 12,
      difficulty: "Khá",
      notes: "Đọc hiểu ngắn về kỹ năng học tập, phỏng vấn, CV và định hướng nghề nghiệp.",
      indexes: [1, 2, 3, 4, 9, 10, 11, 12, 17, 18, 25, 26],
    },
    {
      id: "quiz-variant-reading-green-living",
      baseId: "quiz-reading-environment",
      source: "Reading: Green Living and Recycling",
      kind: "Reading",
      count: 12,
      difficulty: "Nâng cao",
      notes: "Đọc hiểu về tái chế, năng lượng, lối sống bền vững và hành động môi trường.",
      indexes: [1, 2, 3, 4, 9, 10, 11, 12, 21, 22, 23, 24],
    },
    {
      id: "quiz-variant-pronunciation-vowels-endings",
      baseId: "quiz-phonetics-stress",
      source: "Phát âm nguyên âm và đuôi -ed/-s",
      kind: "Phonetics",
      count: 20,
      difficulty: "Cơ bản",
      notes: "Luyện phân biệt vowel sounds, phụ âm cuối và cách phát âm -ed/-s.",
      indexes: [1, 2, 3, 4, 5, 7, 8, 10, 11, 15, 16, 17, 21, 22, 23, 24, 26, 27, 28, 29],
    },
    {
      id: "quiz-variant-word-stress-patterns",
      baseId: "quiz-phonetics-stress",
      source: "Trọng âm từ 2-4 âm tiết",
      kind: "Phonetics",
      count: 20,
      difficulty: "Khá",
      notes: "Tập trung vào quy tắc trọng âm của danh từ, động từ và từ có hậu tố.",
      indexes: [6, 9, 12, 13, 14, 18, 19, 20, 25, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
    },
    {
      id: "quiz-variant-prepositions-adjective-verb",
      baseId: "quiz-prepositions",
      source: "Giới từ đi với tính từ và động từ",
      kind: "Grammar",
      count: 18,
      difficulty: "Cơ bản",
      notes: "Tập trung vào interested in, good at, depend on, belong to và các cụm quen thuộc.",
      indexes: [1, 2, 3, 4, 5, 6, 8, 10, 11, 13, 14, 16, 18, 19, 21, 23, 24, 27],
    },
    {
      id: "quiz-variant-fixed-expressions",
      baseId: "quiz-prepositions",
      source: "Fixed Expressions và giới từ cố định",
      kind: "Grammar",
      count: 16,
      difficulty: "Khá",
      notes: "Luyện các cụm cố định, noun phrases và verb-preposition combinations phổ biến.",
      indexes: [7, 9, 12, 15, 17, 20, 22, 25, 26, 28, 29, 30, 31, 34, 35, 40],
    },
  ];

  return configs
    .map((config) => buildVariantPreset(basePresets, config))
    .filter(Boolean);
}

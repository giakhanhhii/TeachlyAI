function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Rút gọn một dòng để tránh tràn bìa theme 1.thptqg (đa sắc). */
function clampPlainLine(text, maxChars) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!maxChars || !Number.isFinite(maxChars) || s.length <= maxChars) return s;
  const cut = s.slice(0, Math.max(0, maxChars - 1)).trim();
  return `${cut.replace(/[,;:\s]+$/u, "")}…`;
}

/** Short cover title to reduce repeated "Vocabulary: ..." patterns. */
function shortTopicLabel(topic) {
  const t = String(topic || "").trim();
  if (!t) return "Topic";
  const m = t.match(/^Vocabulary:\s+(.+)$/iu);
  if (m) return `Vocabulary: ${m[1].trim()}`;
  return clampPlainLine(t, 44);
}

function trimCompactFocusTail(value) {
  return String(value || "")
    .replace(/\s*\([^()]+\)\s*\.?$/u, "")
    .replace(/[.]+$/u, "")
    .trim();
}

function buildCompactCoverBullets(preset) {
  const chapterLines = (Array.isArray(preset?.chapters) ? preset.chapters : [])
    .slice(0, 3)
    .map((chapter) => {
      const name = String(chapter?.name || "").trim();
      const focus = trimCompactFocusTail(chapter?.focus);
      if (name && focus) return clampPlainLine(`${name}: ${focus}.`, 64);
      if (focus) return clampPlainLine(focus, 64);
      return "";
    })
    .filter(Boolean);
  return chapterLines.length ? chapterLines : [shortTopicLabel(preset?.topic)];
}

function createSlide(id, title, bullets, clipOpts) {
  const titleMax = clipOpts && Number.isFinite(clipOpts.titleMax) ? clipOpts.titleMax : null;
  const bulletMax = clipOpts && Number.isFinite(clipOpts.bulletMax) ? clipOpts.bulletMax : null;
  const outTitle = titleMax ? clampPlainLine(title, titleMax) : String(title || "").trim();
  const outBullets = (Array.isArray(bullets) ? bullets : [])
    .map((item) => {
      const line = String(item || "").trim();
      return bulletMax ? clampPlainLine(line, bulletMax) : line;
    })
    .filter(Boolean);
  return {
    id,
    title: outTitle,
    bullets: outBullets,
  };
}

function splitStructure(structure) {
  return String(structure || "")
    .split("->")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRouteLineText(value) {
  return String(value || "")
    .trim()
    .replace(/(^|\n)(\s*)(\p{L})/gu, (match, prefix, spacing, letter) => {
      void match;
      return `${prefix}${spacing}${letter.toLocaleUpperCase("vi-VN")}`;
    });
}

function isFriendlySlideStyle(style) {
  return normalizeText(style).includes("friendly");
}

function shortenFriendlyRouteLineText(value, maxLength) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function compactFriendlyRouteLine(value) {
  const lines = String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line, index) => {
      if (index === 0) {
        const match = line.match(/^((?:Track|Mạch)\s+\d+)\s*:\s*(.+)$/iu);
        if (!match) return shortenFriendlyRouteLineText(line, 40);
        return `${match[1]}: ${shortenFriendlyRouteLineText(match[2], 34)}`;
      }

      const labelMatch = line.match(/^([^:]+):\s*(.+)$/u);
      if (!labelMatch) return shortenFriendlyRouteLineText(line, 58);

      const label = labelMatch[1].trim();
      const body = labelMatch[2].trim();
      const maxLength =
        /^Knowledge$/i.test(label) ? 58 :
        /^Example$/i.test(label) ? 56 :
        /^Note$/i.test(label) ? 52 :
        56;
      return `${label}: ${shortenFriendlyRouteLineText(body, maxLength)}`;
    })
    .join("\n");
}

function normalizeExampleSnippet(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/u, "")
    .trim();
}

/**
 * Builds slide indexes in chapter order: overview (1-3) → chapter 1 → chapter 2 → … → summary (last).
 * Slide 4 (Khung ghi nhớ) is intentionally skipped to match EXTRA preset behavior.
 * @param {string|number} count - requested number of slides
 * @param {number} deckSize - total slides in the deck (default 30 for 5-chapter RAW presets)
 * @returns {number[]}
 */
function buildDefaultSlideIndexes(count, deckSize = 30) {
  const want = Math.max(1, Math.min(deckSize, Number(count) || 10));
  if (want >= deckSize) return Array.from({ length: deckSize }, (_, i) => i + 1);

  const OVERVIEW = [1, 2, 3];
  const SUMMARY = deckSize;
  const CHAPTER_START = 5; // slide 4 skipped (same as buildExtraPresetDefaultIndexes)

  if (want <= OVERVIEW.length) return OVERVIEW.slice(0, want);
  if (want === OVERVIEW.length + 1) return [...OVERVIEW, SUMMARY];

  const chapterBudget = want - OVERVIEW.length - 1; // reserve 1 slot for summary
  const chapterSlides = [];
  for (let i = CHAPTER_START; i < SUMMARY && chapterSlides.length < chapterBudget; i += 1) {
    chapterSlides.push(i);
  }
  return [...OVERVIEW, ...chapterSlides, SUMMARY];
}

/**
 * Exported version so sessionContentPrep.js can call it with the *actual* user-requested count.
 * @param {number} want
 * @param {number} deckSize
 * @returns {number[]}
 */
export function buildPresetSlideIndexes(want, deckSize) {
  return buildDefaultSlideIndexes(want, deckSize);
}

function pickSlidesByIndexes(slides, indexes) {
  const picked = indexes.map((index) => slides[index - 1]).filter(Boolean);
  return picked.length ? picked : slides.slice();
}

function buildDetailedExampleLine(chapter) {
  const detailedExample = String(chapter?.detailedExample || "").trim();
  if (detailedExample) return detailedExample;
  const sentenceA = normalizeExampleSnippet(chapter?.exampleA);
  return sentenceA ? `Example 1: ${sentenceA}` : "";
}

function buildMultilineSectionLine(label, parts) {
  const rows = parts.map((part) => String(part || "").trim()).filter(Boolean);
  return rows.length ? `${label}: ${rows.join("\n")}` : "";
}

function trimTrailingSentencePunctuation(value) {
  return String(value || "").trim().replace(/[.!?]+$/u, "");
}

function buildSecondExampleLine(chapter) {
  const sentenceB = normalizeExampleSnippet(chapter?.exampleB);
  return sentenceB ? `Example 2: ${sentenceB}` : "";
}

function buildDetailedExplanationLine(chapter) {
  const rule = trimTrailingSentencePunctuation(chapter?.rule);
  return rule ? `Remember: ${rule}` : "";
}

function buildPracticeTaskLine(chapter) {
  const detailedPractice = String(chapter?.detailedPractice || "").trim();
  if (detailedPractice) return detailedPractice;
  const practiceA = String(chapter?.practiceA || "").trim();
  return practiceA ? `Practice task: ${practiceA}` : "";
}

function buildSelfCheckLine(chapter) {
  const practiceA = String(chapter?.practiceA || "").trim();
  return practiceA ? `Self-check: ${practiceA}` : "";
}

function buildPracticeGuideLine(chapter, preset) {
  const pitfallA = String(chapter?.pitfallA || "").trim();
  const notes = String(preset?.notes || "").trim();
  if (pitfallA && notes) {
    return `Practice note: avoid "${pitfallA.toLowerCase()}"; ${notes.toLowerCase()}`;
  }
  return pitfallA || notes || "";
}

function buildConceptLine(chapter) {
  const name = String(chapter?.name || "").trim();
  const focus = String(chapter?.focus || "").trim();
  if (focus) return `Core idea: ${focus}`;
  if (name) return `Core idea: ${name} must be recognised accurately in context.`;
  return "Core idea: identify the grammatical role before applying the rule.";
}

function buildConceptSupportLine(chapter) {
  const name = String(chapter?.name || "").trim();
  const rule = String(chapter?.rule || "").trim();
  if (name && rule) return `Key signal: for ${name.toLowerCase()}, remember ${rule}`;
  if (rule) return `Key signal: ${rule}`;
  return "Key signal: check the role of the word or phrase before choosing a structure.";
}

function buildConceptExampleLine(chapter) {
  const exampleA = String(chapter?.exampleA || "").trim();
  const exampleB = String(chapter?.exampleB || "").trim();
  if (exampleA && exampleB) return `Quick example: ${exampleA} ${exampleB}`;
  if (exampleA) return `Quick example: ${exampleA}`;
  if (exampleB) return `Quick example: ${exampleB}`;
  return "Quick example: place the structure in a short sentence to test meaning and grammar.";
}

function buildConceptTakeawayLine(chapter, preset) {
  const practiceA = String(chapter?.practiceA || "").trim();
  const notes = String(preset?.notes || "").trim();
  if (practiceA && notes) return `Quick study tip: ${practiceA} ${notes}`;
  if (practiceA) return `Quick study tip: ${practiceA}`;
  if (notes) return `Quick study tip: ${notes}`;
  return "Quick study tip: read the idea, match the rule, then write one sample sentence.";
}

function buildAutoPracticeColumns(topic, template, index) {
  const shortL = shortTopicLabel(topic);
  const chapterName = String(template?.name || "").trim() || `Focus ${index + 1}`;
  return [
    [
      "Practice tasks",
      `Restate the key idea of ${chapterName.toLowerCase()}.`,
      `Find 2 signals for ${shortL.toLowerCase()}.`,
      "Compare 1 correct example with 1 incorrect example.",
      "Fix one common mistake from this topic.",
      "Write 1 fast memory tip for this section.",
    ].join("\n"),
    [
      "Test-day reminders",
      "Read the key words before choosing an answer.",
      "Check the grammatical role of the blank.",
      "Solve recognition items before application items.",
      "Eliminate obviously wrong options first.",
      "Check the full sentence meaning at the end.",
    ].join("\n"),
    [
      "Answer guide",
      "Write a short and clear answer.",
      "Explain the choice with direct textual evidence.",
      "Underline the clue if the item provides context.",
      "Repeat the rule after finishing the item.",
      "Note which step caused difficulty.",
    ].join("\n"),
  ];
}

function buildFormulaColumnBlock(column) {
  const heading = String(column?.heading || "").trim();
  const example = String(column?.example || "").trim();
  return [heading, example ? `Example: ${example}` : ""].filter(Boolean).join(": ") || heading;
}

function buildFormulaSummaryLines(chapter) {
  const formulaColumns = Array.isArray(chapter?.formulaColumns) ? chapter.formulaColumns : [];
  if (formulaColumns.length) {
    return formulaColumns.slice(0, 3).map((column) => buildFormulaColumnBlock(column)).filter(Boolean);
  }

  const name = String(chapter?.name || "").trim();
  const rule = String(chapter?.rule || "").trim();
  const exampleA = String(chapter?.exampleA || "").trim();
  const pitfallA = String(chapter?.pitfallA || "").trim();

  return [
    rule ? `${name}: ${rule}` : (name || "Core rule"),
    exampleA ? `Example: ${exampleA}` : "",
    pitfallA ? `Avoid: ${pitfallA}` : "",
  ].filter(Boolean);
}

function buildQuickMemoryBullets(preset, chapterRules, chapterExamples) {
  const chapterBullets = (preset?.chapters || [])
    .slice(0, 3)
    .map((chapter) => {
      const name = String(chapter?.name || "").trim();
      const focus = String(chapter?.focus || "").trim();
      const exampleA = String(chapter?.exampleA || "").trim();
      if (name && focus && exampleA) return `${name}: ${focus} General example: ${exampleA}`;
      if (name && focus) return `${name}: ${focus}`;
      if (name && exampleA) return `${name}: General example: ${exampleA}`;
      return focus || exampleA || "";
    })
    .filter(Boolean);

  if (chapterBullets.length) return chapterBullets;

  return [
    ...chapterRules.map((rule, index) => {
      const example = chapterExamples[index] || chapterExamples[0] || "";
      return example ? `${rule} General example: ${example}` : rule;
    }),
    `Study structure: ${preset?.structure || ""}`.trim(),
  ].filter(Boolean);
}

function buildPitfallLine(chapter, key) {
  const detailed = String(chapter?.[`${key}Detail`] || "").trim();
  if (detailed) return detailed;
  return String(chapter?.[key] || "").trim();
}

function buildPitfallFixLine(chapter) {
  const detailedFix = String(chapter?.pitfallFix || "").trim();
  if (detailedFix) return detailedFix;
  return `Fix the mistake by checking the rule for ${chapter.name}.`;
}

function buildPitfallSlideLines(chapter) {
  const extraLines = Array.isArray(chapter?.pitfallExtraLines)
    ? chapter.pitfallExtraLines.map((line) => String(line || "").trim()).filter(Boolean)
    : [];

  return [
    buildPitfallLine(chapter, "pitfallA"),
    buildPitfallLine(chapter, "pitfallB"),
    ...extraLines,
    buildPitfallFixLine(chapter),
  ].filter(Boolean);
}

function buildStructureRouteLine(part, index, preset) {
  const customRouteLine = String(preset?.routeLines?.[index] || "").trim();
  if (customRouteLine) {
    const normalized = normalizeRouteLineText(customRouteLine);
    return isFriendlySlideStyle(preset?.style) ? compactFriendlyRouteLine(normalized) : normalized;
  }

  const cleanPart = String(part || "").trim();
  const topic = String(preset?.topic || "").trim();
  const notes = String(preset?.notes || "").trim();
  const chapter = preset?.chapters?.[index];
  const chapterFocus = String(chapter?.focus || "").trim();
  const chapterExample = String(chapter?.exampleA || "").trim();

  const pieces = [`Track ${index + 1}: ${cleanPart}`];
  if (chapterFocus) pieces.push(`Knowledge: ${chapterFocus}`);
  if (chapterExample) pieces.push(`Example: ${chapterExample}`);
  else if (topic) pieces.push(`Example: examples and practice stay within ${topic}.`);
  if (notes) pieces.push(`Note: ${notes}`);
  const normalized = normalizeRouteLineText(pieces.join("\n"));
  return isFriendlySlideStyle(preset?.style) ? compactFriendlyRouteLine(normalized) : normalized;
}

function buildChapterSlides(preset, chapter, chapterIndex) {
  const base = chapterIndex * 5 + 5;
  const tag = `${preset.id}-${String(base).padStart(2, "0")}`;
  const clip = preset.compactCopy ? { titleMax: 78, bulletMax: 132 } : null;
  const practiceSlideBullets =
    Array.isArray(chapter?.practiceColumns) && chapter.practiceColumns.length === 3
      ? chapter.practiceColumns
      : [
          buildPracticeTaskLine(chapter),
          buildPracticeGuideLine(chapter, preset),
          `Answer task: write the answer and explain your reasoning (${String(chapter.name).toLowerCase()}).`,
        ];
  return [
    createSlide(
      tag,
      `${chapter.name} - Concept`,
      [
        buildConceptLine(chapter),
        buildConceptSupportLine(chapter),
        chapter.rule,
        buildConceptExampleLine(chapter),
        `Implementation note: ${preset.notes}`,
      ],
      clip,
    ),
    createSlide(
      `${preset.id}-${String(base + 1).padStart(2, "0")}`,
      `${chapter.name} - Rules`,
      buildFormulaSummaryLines(chapter),
      clip,
    ),
    createSlide(
      `${preset.id}-${String(base + 2).padStart(2, "0")}`,
      `${chapter.name} - Examples`,
      [
        buildDetailedExampleLine(chapter),
        buildSecondExampleLine(chapter),
        buildDetailedExplanationLine(chapter),
        buildSelfCheckLine(chapter),
      ],
      clip,
    ),
    createSlide(
      `${preset.id}-${String(base + 3).padStart(2, "0")}`,
      `${chapter.name} - Common Pitfalls`,
      buildPitfallSlideLines(chapter),
      clip,
    ),
    createSlide(
      `${preset.id}-${String(base + 4).padStart(2, "0")}`,
      `${chapter.name} - Practice`,
      practiceSlideBullets,
      clip,
    ),
  ];
}

function buildDeckFromBlueprint(preset) {
  const structureParts = splitStructure(preset.structure);
  const chapterNames = preset.chapters.map((chapter) => chapter.name);
  const chapterRules = preset.chapters.slice(0, 3).map((chapter) => chapter.rule);
  const chapterExamples = preset.chapters.slice(0, 3).map((chapter) => chapter.exampleA);
  const coverTitle = preset.compactCopy ? shortTopicLabel(preset.topic) : `${preset.topic} - Overview`;
  const clip = preset.compactCopy ? { titleMax: 76, bulletMax: 128 } : null;
  const routeLines = Array.isArray(preset.routeLines) && preset.routeLines.length
    ? preset.routeLines.map((line) => {
        const normalized = normalizeRouteLineText(line);
        return isFriendlySlideStyle(preset?.style) ? compactFriendlyRouteLine(normalized) : normalized;
      })
    : [
        ...structureParts.map((part, index) => buildStructureRouteLine(part, index, preset)),
        preset.compactCopy
          ? "Each track includes examples and focused practice."
          : `Note: each track uses examples and practice aligned with ${preset.topic}.`,
      ];
  const slides = [
    createSlide(
      `${preset.id}-01`,
      coverTitle,
      preset.compactCopy
        ? buildCompactCoverBullets(preset)
        : [
            ...preset.chapters.slice(0, 3).map((chapter) => `${chapter.name}: ${chapter.focus}`),
            `Structure: ${preset.structure}`,
          ],
      clip,
    ),
    createSlide(
      `${preset.id}-02`,
      preset.compactCopy ? `${shortTopicLabel(preset.topic)} - Goals` : `${preset.topic} - Goals`,
      [
        `Main sections: ${chapterNames.slice(0, 3).join(", ")}.`,
        `Focus points: ${chapterRules.join(" | ")}.`,
        `Practice direction: ${preset.notes}`,
      ],
      clip,
    ),
    createSlide(
      `${preset.id}-03`,
      preset.compactCopy ? `${shortTopicLabel(preset.topic)} - Roadmap` : `${preset.topic} - Learning Roadmap`,
      [...routeLines],
      clip,
    ),
    createSlide(
      `${preset.id}-04`,
      preset.compactCopy ? `${shortTopicLabel(preset.topic)} - Memory Boost` : `${preset.topic} - Quick Memory Frame`,
      buildQuickMemoryBullets(preset, chapterRules, chapterExamples),
      clip,
    ),
  ];

  preset.chapters.forEach((chapter, chapterIndex) => {
    slides.push(...buildChapterSlides(preset, chapter, chapterIndex));
  });

  slides.push(
    createSlide(
      `${preset.id}-30`,
      "Summary",
      [
        `Review the main sections: ${chapterNames.join(", ")}.`,
        `Revisit the key examples: ${chapterExamples.join(" | ")}.`,
        `Keep after-class practice aligned with this structure: ${preset.structure}.`,
      ],
      preset.compactCopy ? { titleMax: 72, bulletMax: 130 } : null,
    ),
  );

  return slides;
}

const RAW_SLIDE_PRESETS = [
  {
    id: "slide-english-tenses",
    topic: "English Tenses",
    count: "10",
    structure: "Time signals -> Core forms -> Guided practice",
    style: "Professional (Multicolor)",
    notes: "Use short contrastive examples so learners can separate similar tenses quickly.",
    chapters: [
      {
        name: "Present Simple",
        focus: "Use it for habits, facts, and regular schedules.",
        rule: "Subject + base verb / verb-s; do or does in negatives and questions.",
        exampleA: "She reviews vocabulary every evening.",
        exampleB: "The train leaves at 7 a.m.",
        pitfallA: "Forgetting -s or -es with a third-person singular subject.",
        pitfallB: "Using the present continuous for a fixed schedule.",
        practiceA: "Complete 3 present simple sentences with the correct verb form.",
        practiceB: "Underline the time signals in each sentence.",
      },
      {
        name: "Present Continuous",
        focus: "Use it for actions happening now or near-future plans.",
        rule: "Subject + am/is/are + V-ing.",
        exampleA: "They are preparing for the speaking test now.",
        exampleB: "I am meeting my tutor this afternoon.",
        pitfallA: "Using stative verbs like know or like in the wrong context.",
        pitfallB: "Leaving out be before the -ing form.",
        practiceA: "Choose between the present simple and the present continuous.",
        practiceB: "Write 2 sentences with now and at the moment.",
      },
      {
        name: "Past Simple",
        focus: "Use it for completed actions at a clear past time.",
        rule: "Subject + V2/ed; use did in negatives and questions.",
        exampleA: "We visited the museum last week.",
        exampleB: "He did not submit the form yesterday.",
        pitfallA: "Using V2 after did.",
        pitfallB: "Confusing a finished past action with a duration continuing to the present.",
        practiceA: "Rewrite 3 sentences in the past simple.",
        practiceB: "Find the time markers in each sentence.",
      },
      {
        name: "Past Perfect",
        focus: "Use it for an action that happened before another past action.",
        rule: "Subject + had + V3/ed.",
        exampleA: "By the time we arrived, the lesson had started.",
        exampleB: "She had finished the task before the bell rang.",
        pitfallA: "Overusing the past perfect when there is only one past action.",
        pitfallB: "Confusing had + V3 with the past simple.",
        practiceA: "Put 2 past actions in the correct order.",
        practiceB: "Fill in had + V3 where it is needed.",
      },
      {
        name: "Future Perfect",
        focus: "Use it for actions completed before a future deadline.",
        rule: "Subject + will have + V3/ed.",
        exampleA: "By June, they will have completed the project.",
        exampleB: "By the end of this course, we will have reviewed all tenses.",
        pitfallA: "Leaving out have after will.",
        pitfallB: "Missing a by + future time marker.",
        practiceA: "Complete 3 future perfect sentences.",
        practiceB: "Write 1 sentence with by the end of.",
      },
    ],
  },
  {
    id: "slide-passive-voice",
    topic: "Passive Voice",
    count: "12",
    structure: "Basic shift -> Tense control -> Special passive forms",
    style: "Friendly (Warm)",
    notes: "Keep the focus on moving the object, choosing the correct be form, and using V3.",
    chapters: [
      {
        name: "Basic Passive Form",
        focus: "Move the object into subject position and choose the right be form.",
        rule: "Subject + be + past participle + optional by-agent.",
        exampleA: "They clean the room every day -> The room is cleaned every day.",
        exampleB: "She wrote the report last night -> The report was written last night.",
        pitfallA: "Leaving out be in the passive sentence.",
        pitfallB: "Using V2 instead of V3 after be.",
        practiceA: "Change 3 active sentences into passive ones.",
        practiceB: "Identify the object before rewriting the sentence.",
      },
      {
        name: "Passive Across Tenses",
        focus: "Change be according to the original tense before using V3.",
        rule: "Present simple: is/are + V3 | Past simple: was/were + V3 | Present perfect: has/have been + V3.",
        exampleA: "The letter has been sent.",
        exampleB: "The bridge was built in 2010.",
        pitfallA: "Changing the tense while rewriting the sentence.",
        pitfallB: "Mixing up been and being.",
        practiceA: "Choose the correct passive tense in 5 sentences.",
        practiceB: "Rewrite 4 sentences in different tenses.",
      },
      {
        name: "Modal Passive",
        focus: "Use modal + be + V3 for obligations, advice, and possibility.",
        rule: "Modal verb + be + V3/ed.",
        exampleA: "The form must be submitted today.",
        exampleB: "The problem can be solved with a different approach.",
        pitfallA: "Dropping be after the modal verb.",
        pitfallB: "Using been instead of be in a basic modal passive.",
        practiceA: "Complete 5 modal passive sentences.",
        practiceB: "Correct 4 structural errors in modal passive forms.",
      },
      {
        name: "Continuous Passive",
        focus: "Use being when the action is in progress.",
        rule: "am/is/are being + V3 or was/were being + V3.",
        exampleA: "The documents are being checked now.",
        exampleB: "The road was being repaired at 8 a.m.",
        pitfallA: "Omitting being in a continuous passive sentence.",
        pitfallB: "Choosing the wrong be form for the time marker.",
        practiceA: "Pick the correct continuous passive form.",
        practiceB: "Write 2 sentences with now and at that time.",
      },
      {
        name: "Have Something Done",
        focus: "Use it when someone arranges for another person to do a task.",
        rule: "have/get + object + V3/ed.",
        exampleA: "She had her hair cut.",
        exampleB: "We got the printer repaired by the technician.",
        pitfallA: "Confusing this pattern with a normal passive sentence.",
        pitfallB: "Putting the object in the wrong position.",
        practiceA: "Rewrite 3 sentences with have something done.",
        practiceB: "Explain the difference between arranged service and simple passive meaning.",
      },
    ],
  },
  {
    id: "slide-relative-clauses",
    topic: "Relative Clauses",
    count: "14",
    structure: "Relative pronouns -> Relative adverbs -> Reduced clauses",
    style: "Space Light",
    notes: "Keep examples short and contrast subject, object, possession, place, and time clearly.",
    chapters: [
      {
        name: "Who and Whom",
        focus: "Use who as a subject and whom as an object for people.",
        rule: "who + verb; whom + subject + verb.",
        exampleA: "The student who won the prize is Lan.",
        exampleB: "The man whom you met is my uncle.",
        pitfallA: "Using whom as a subject.",
        pitfallB: "Missing the object role in the clause.",
        practiceA: "Fill in who or whom in 5 sentences.",
        practiceB: "Label the grammatical function of the relative pronoun.",
      },
      {
        name: "Which and That",
        focus: "Use which for things and that mainly in defining clauses.",
        rule: "noun + which/that + clause.",
        exampleA: "The book which I bought is useful.",
        exampleB: "The answer that makes sense is here.",
        pitfallA: "Using that after a comma.",
        pitfallB: "Using which for people.",
        practiceA: "Choose which or that.",
        practiceB: "State when that is not allowed.",
      },
      {
        name: "Whose",
        focus: "Use whose to show possession for people or things.",
        rule: "whose + noun + clause.",
        exampleA: "The girl whose bag was lost is crying.",
        exampleB: "The house whose roof is red belongs to my aunt.",
        pitfallA: "Replacing whose with who.",
        pitfallB: "Forgetting the noun after whose.",
        practiceA: "Complete sentences with whose.",
        practiceB: "Combine 2 sentences that express possession.",
      },
      {
        name: "Where and When",
        focus: "Use where for places and when for time references.",
        rule: "where = in/at which; when = on/in which.",
        exampleA: "The village where I was born is peaceful.",
        exampleB: "The day when we met was rainy.",
        pitfallA: "Using where for a time noun.",
        pitfallB: "Using when for a place.",
        practiceA: "Choose where or when.",
        practiceB: "Explain the noun each relative adverb refers to.",
      },
      {
        name: "Reduced Relative Clauses",
        focus: "Choose V-ing, V3, or to V depending on meaning and structure.",
        rule: "Active meaning -> V-ing | Passive meaning -> V3 | Special noun phrase -> to V.",
        exampleA: "Students wanting extra practice can stay after class.",
        exampleB: "The documents submitted yesterday are on the desk.",
        pitfallA: "Using V-ing for a passive meaning.",
        pitfallB: "Reducing a clause when the subject does not match.",
        practiceA: "Reduce 4 full relative clauses.",
        practiceB: "Sort each example into active, passive, or infinitive reduction.",
      },
    ],
  },
  {
    id: "slide-word-formation",
    topic: "Word Formation",
    count: "16",
    structure: "Part-of-speech signals -> Prefixes and suffixes -> Gap-fill strategy",
    style: "Sea Life",
    notes: "Train students to read the grammar slot before choosing a derived form.",
    chapters: [
      {
        name: "Noun Signals",
        focus: "Nouns often follow articles, adjectives, and prepositions.",
        rule: "article + noun | adjective + noun | preposition + noun.",
        exampleA: "The explanation was clear.",
        exampleB: "They discussed the importance of education.",
        pitfallA: "Choosing an adjective where a noun is required.",
        pitfallB: "Ignoring the word before the blank.",
        practiceA: "Identify 4 positions that require a noun.",
        practiceB: "Supply the correct noun form.",
      },
      {
        name: "Adjective Signals",
        focus: "Adjectives modify nouns or follow linking verbs.",
        rule: "be/seem/become + adjective | adjective + noun.",
        exampleA: "The method is effective.",
        exampleB: "This is a useful strategy.",
        pitfallA: "Using an adverb after a linking verb.",
        pitfallB: "Confusing adjectives with nouns.",
        practiceA: "Choose the correct adjective form.",
        practiceB: "Correct 3 word-form mistakes.",
      },
      {
        name: "Adverb Signals",
        focus: "Adverbs modify verbs, adjectives, or full clauses.",
        rule: "verb + adverb | adverb + adjective.",
        exampleA: "She answered confidently.",
        exampleB: "The task was extremely difficult.",
        pitfallA: "Using an adjective to modify a verb.",
        pitfallB: "Forgetting the -ly ending when needed.",
        practiceA: "Fill in the correct adverb form.",
        practiceB: "Distinguish between adjective and adverb roles.",
      },
      {
        name: "Prefixes",
        focus: "Prefixes often change the meaning of the base word.",
        rule: "un-, in-, im-, dis-, and re- create negative or repeated meaning.",
        exampleA: "possible -> impossible",
        exampleB: "appear -> disappear",
        pitfallA: "Attaching the wrong prefix to a base word.",
        pitfallB: "Missing the negative meaning in context.",
        practiceA: "Choose the correct prefix.",
        practiceB: "Build 4 antonyms with prefixes.",
      },
      {
        name: "Suffixes",
        focus: "Suffixes help you identify the correct part of speech.",
        rule: "-tion/-ment for nouns | -ful/-ive for adjectives | -ly for adverbs.",
        exampleA: "inform -> information",
        exampleB: "careful -> carefully",
        pitfallA: "Spelling the word incorrectly after adding a suffix.",
        pitfallB: "Choosing the right meaning but the wrong part of speech.",
        practiceA: "Complete a short word-family table.",
        practiceB: "Do a mini word-formation quiz.",
      },
    ],
  },
  {
    id: "slide-modal-verbs",
    topic: "Modal Verbs",
    count: "18",
    structure: "Present meaning -> Past deduction -> Passive patterns",
    style: "Minimal (Academic)",
    notes: "Highlight the meaning difference between advice, obligation, deduction, and probability.",
    chapters: [
      {
        name: "Can and Could",
        focus: "Use them for ability, permission, and polite requests.",
        rule: "can/could + bare infinitive.",
        exampleA: "She can solve the problem quickly.",
        exampleB: "Could you explain this rule again?",
        pitfallA: "Adding to after a modal verb.",
        pitfallB: "Using can instead of a deduction modal.",
        practiceA: "Choose can or could in 5 short contexts.",
        practiceB: "Write 1 sentence for ability and 1 for a polite request.",
      },
      {
        name: "Must and Have to",
        focus: "Use must for strong obligation or deduction and have to for external rules.",
        rule: "must + V | have/has to + V | must not = prohibition | do not have to = no necessity.",
        exampleA: "You must wear a helmet.",
        exampleB: "She has to submit the form today.",
        pitfallA: "Confusing must not with do not have to.",
        pitfallB: "Using have to for deduction.",
        practiceA: "Sort 6 sentences by meaning: obligation, deduction, prohibition, or no necessity.",
        practiceB: "Rewrite 2 sentences with must and have to.",
      },
      {
        name: "Should and Ought to",
        focus: "Use them for advice, expectations, and mild criticism.",
        rule: "should + V | ought to + V.",
        exampleA: "You should review your notes before the test.",
        exampleB: "Students ought to ask questions when they are confused.",
        pitfallA: "Writing should to + verb.",
        pitfallB: "Using should for a strict prohibition.",
        practiceA: "Give advice for 3 study situations.",
        practiceB: "Correct 4 sentences containing should or ought to.",
      },
      {
        name: "Modal Perfect",
        focus: "Use modal + have + V3 for past deduction, regret, or unreal possibility.",
        rule: "must/should/could/may/might + have + V3.",
        exampleA: "He must have forgotten the meeting.",
        exampleB: "You should have checked the answer first.",
        pitfallA: "Writing should had or must had.",
        pitfallB: "Using must have when the speaker is not sure.",
        practiceA: "Choose the right modal perfect form in 4 contexts.",
        practiceB: "Write 1 regret sentence and 1 deduction sentence.",
      },
      {
        name: "Modal Passive",
        focus: "Combine modal verbs with passive structures for actions done by others.",
        rule: "modal + be + V3 | modal + have been + V3 for past passive meaning.",
        exampleA: "The task should be completed today.",
        exampleB: "The bridge should have been repaired last year.",
        pitfallA: "Forgetting be after the modal verb.",
        pitfallB: "Using V-ing instead of V3 in a modal passive form.",
        practiceA: "Change 4 active modal sentences into passive ones.",
        practiceB: "Fix 3 common modal passive errors.",
      },
    ],
  },
];

const EXTRA_SLIDE_TOPIC_LIST = [
  "Present perfect and present perfect continuous",
  "Wishes and hypothetical structures",
  "Noun clauses",
  "Time and condition adverb clauses",
  "Conjunctions and linking expressions",
  "Inversion in English",
  "Gerunds and infinitives",
  "Study-related phrasal verbs",
  "Prepositions and Collocations",
  "Articles and determiners",
  "Pronouns and substitution words",
  "Question tags",
  "Indirect questions and responses",
  "Word stress for exam items",
  "Pronunciation of -ed and -s endings",
  "Confusing vowel sounds",
  "Common communication functions",
  "Sentence transformation",
  "Grammar error correction",
  "Reading for main ideas",
  "Reading for inference",
  "Synonyms and antonyms in context",
  "Cloze passage completion",
  "Paraphrase skills in reading",
  "Opinion paragraph writing",
  "Cause and effect writing",
  "Advantages and disadvantages writing",
  "Describing charts and data",
  "Vocabulary: Education",
  "Vocabulary: Environment",
  "Vocabulary: Technology",
  "Vocabulary: Health",
  "Vocabulary: Careers",
  "Vocabulary: Culture and festivals",
  "Vocabulary: Travel",
  "Vocabulary: Urbanisation",
  "Mixed grammar review",
  "Grammar test strategies",
  "Reading test strategies",
  "Final 50-question review",
];

const EXTRA_SLIDE_STRUCTURE_OPTIONS = [
  "Core idea -> Key signals -> Context practice",
  "Knowledge base -> Essential rules -> Applied exercises",
  "Item recognition -> Fast response pattern -> Self-check",
  "Compact theory -> Model examples -> Targeted practice",
  "Topic overview -> Error checklist -> Exam-style drills",
];

const EXTRA_SLIDE_NOTES_OPTIONS = [
  "Keep examples short and close to common exam contexts.",
  "Start with recognition tasks before moving to higher-application items.",
  "Give each section a quick checklist for self-correction.",
  "End each track with one self-made sentence for long-term recall.",
  "Focus on the mistakes Grade 12 learners make most often in multiple-choice tasks.",
];

const EXTRA_SLIDE_STYLE_OPTIONS = [
  "Professional (Multicolor)",
  "Minimal (Academic)",
  "Friendly (Warm)",
  "Space Light",
  "Space Dark",
  "Sea Life",
  "Comic",
];

const EXTRA_SLIDE_COUNT_OPTIONS = ["10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30"];

const AUTO_CHAPTER_TEMPLATES = [
  {
    name: "Core knowledge",
    focusStem: "Understand the definition and purpose of this language point",
    ruleStem: "Identify the range, function, and meaning of this language point",
    practiceStem: "Summarise the definition and role of the target point",
  },
  {
    name: "Recognition signals",
    focusStem: "Notice the key clues inside the sentence",
    ruleStem: "Match the blank position with sentence structure and nearby context",
    practiceStem: "Build a fast recognition table for common question types",
  },
  {
    name: "Essential patterns",
    focusStem: "Lock in the core formula and sentence pattern",
    ruleStem: "Apply the correct structure order in transformation and answer-choice tasks",
    practiceStem: "Rewrite sample sentences to deepen memory and self-check",
  },
  {
    name: "Avoid common errors",
    focusStem: "Recognise and avoid the mistakes learners make most often",
    ruleStem: "Recheck the rule and the sentence meaning before locking in an answer",
    practiceStem: "Correct errors step by step and explain the fix",
  },
  {
    name: "Applied practice",
    focusStem: "Build exam skill through near-authentic question types",
    ruleStem: "Combine item recognition with meaning checks before selecting an answer",
    practiceStem: "Create new sentences on the same topic and test them against the rule",
  },
  {
    name: "Exam execution",
    focusStem: "Use fast and accurate strategies in exam-style items",
    ruleStem: "Read the prompt carefully, identify the task type, then apply the right rule",
    practiceStem: "Do 3 quick exam-style items and score your own performance",
  },
];

function buildExtraSlidePresetId(topic, index) {
  const topicSlug = normalizeText(topic).replace(/\s+/g, "-");
  return `slide-extra-${String(index + 1).padStart(2, "0")}-${topicSlug || "topic"}`;
}

function buildAutoChaptersByTopic(topic) {
  const topicText = String(topic || "").trim();
  const shortL = shortTopicLabel(topicText);
  return AUTO_CHAPTER_TEMPLATES.map((template, index) => ({
    name: template.name,
    focus: `${template.focusStem} (${shortL}).`,
    rule: `${template.ruleStem} Apply it to the selected topic.`,
    exampleA: `Example ${index + 1}: choose the correct answer in context.`,
    exampleB: `Example ${index + 2}: rewrite a short sentence to check understanding.`,
    pitfallA: `Mistake ${index + 1}: answering by instinct and ignoring the clue.`,
    pitfallB: `Mistake ${index + 2}: reading too quickly and missing the full meaning.`,
    practiceA: `Task ${index + 1}: ${template.practiceStem} (3 items).`,
    practiceB: `Task ${index + 2}: explain why the answer is correct.`,
    practiceColumns: buildAutoPracticeColumns(topicText, template, index),
  }));
}

/**
 * For auto-generated extra presets, pick exactly one slide per chapter to avoid
 * visual duplicates in Sea Life and other themes that truncate long chapter titles.
 * Overview slides 01-03 are always included; one "Khái niệm" per chapter; then Tổng kết.
 * @param {number} chapterCount
 * @returns {number[]}
 */
function buildExtraPresetDefaultIndexes(chapterCount) {
  const overview = [1, 2, 3];
  const chapterFirst = Array.from({ length: chapterCount }, (_, i) => 5 + i * 5);
  const totalSlides = 4 + chapterCount * 5 + 1;
  return [...overview, ...chapterFirst, totalSlides];
}

function buildExtraSlidePreset(topic, index) {
  const chapterCount = AUTO_CHAPTER_TEMPLATES.length;
  return {
    id: buildExtraSlidePresetId(topic, index),
    topic,
    count: "10",
    structure: EXTRA_SLIDE_STRUCTURE_OPTIONS[index % EXTRA_SLIDE_STRUCTURE_OPTIONS.length],
    style: EXTRA_SLIDE_STYLE_OPTIONS[index % EXTRA_SLIDE_STYLE_OPTIONS.length],
    notes: EXTRA_SLIDE_NOTES_OPTIONS[index % EXTRA_SLIDE_NOTES_OPTIONS.length],
    chapters: buildAutoChaptersByTopic(topic),
    customDefaultIndexes: buildExtraPresetDefaultIndexes(chapterCount),
    /** Bìa theme đa sắc (1.thptqg): title/bullet ngắn, tránh tràn. */
    compactCopy: true,
  };
}

const EXTRA_SLIDE_PRESETS = EXTRA_SLIDE_TOPIC_LIST.map((topic, index) => buildExtraSlidePreset(topic, index));
const ALL_RAW_SLIDE_PRESETS = [...RAW_SLIDE_PRESETS, ...EXTRA_SLIDE_PRESETS];

export const DIRECT_SLIDE_PRESETS = ALL_RAW_SLIDE_PRESETS.map((preset) => {
  const slides = buildDeckFromBlueprint(preset);
  const defaultSlideIndexes = preset.customDefaultIndexes
    ? preset.customDefaultIndexes.filter((idx) => idx >= 1 && idx <= slides.length)
    : buildDefaultSlideIndexes(preset.count, slides.length);
  return {
    ...preset,
    slides,
    defaultSlideIndexes,
    get defaultSlides() {
      return pickSlidesByIndexes(this.slides, this.defaultSlideIndexes);
    },
  };
});

export const DIRECT_SLIDE_AUTOFILL_SAMPLES = DIRECT_SLIDE_PRESETS.map((preset) => ({
  id: preset.id,
  t: preset.topic,
  c: preset.count,
  s: preset.structure,
  y: preset.style,
  n: preset.notes,
}));

export function findDirectSlidePreset(meta) {
  const presetId = normalizeText(meta?.presetId);
  const topic = normalizeText(meta?.topic);
  const structure = normalizeText(meta?.structure);
  const style = normalizeText(meta?.slideTemplate || meta?.style);

  return (
    DIRECT_SLIDE_PRESETS.find((preset) => normalizeText(preset.id) === presetId)
    || DIRECT_SLIDE_PRESETS.find((preset) => (
      normalizeText(preset.topic) === topic
      && (!structure || normalizeText(preset.structure) === structure)
      && (!style || normalizeText(preset.style) === style)
    ))
    || DIRECT_SLIDE_PRESETS.find((preset) => (
      normalizeText(preset.topic) === topic
      && (!structure || normalizeText(preset.structure) === structure)
    ))
    || null
  );
}

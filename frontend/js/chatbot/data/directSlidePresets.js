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

/** Tiêu đề ngắn cho bìa — bớt lặp "Từ vựng chủ đề …". */
function shortTopicLabel(topic) {
  const t = String(topic || "").trim();
  if (!t) return "Chủ đề";
  const m = t.match(/^Từ vựng chủ đề\s+(.+)$/iu);
  if (m) return `Từ vựng: ${m[1].trim()}`;
  return clampPlainLine(t, 44);
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
  return normalizeText(style).includes("than thien");
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
  return sentenceA ? `Ví dụ 1: ${sentenceA}` : "";
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
  return sentenceB ? `Ví dụ 2: ${sentenceB}` : "";
}

function buildDetailedExplanationLine(chapter) {
  const rule = trimTrailingSentencePunctuation(chapter?.rule);
  return rule ? `Ghi nhớ: ${rule}` : "";
}

function buildPracticeTaskLine(chapter) {
  const detailedPractice = String(chapter?.detailedPractice || "").trim();
  if (detailedPractice) return detailedPractice;
  const practiceA = String(chapter?.practiceA || "").trim();
  return practiceA ? `Bài luyện tập: ${practiceA}` : "";
}

function buildSelfCheckLine(chapter) {
  const practiceA = String(chapter?.practiceA || "").trim();
  return practiceA ? `Tự kiểm tra: ${practiceA}` : "";
}

function buildPracticeGuideLine(chapter, preset) {
  const pitfallA = String(chapter?.pitfallA || "").trim();
  const notes = String(preset?.notes || "").trim();
  if (pitfallA && notes) {
    return `Lưu ý khi làm bài: tránh lỗi "${pitfallA.toLowerCase()}"; ${notes.toLowerCase()}`;
  }
  return pitfallA || notes || "";
}

function buildConceptLine(chapter) {
  const name = String(chapter?.name || "").trim();
  const focus = String(chapter?.focus || "").trim();
  if (focus) return `Khái niệm: ${focus}`;
  if (name) return `Khái niệm: ${name} là một điểm ngữ pháp cần nhận diện đúng trong ngữ cảnh câu.`;
  return "Khái niệm: xác định đúng chức năng ngữ pháp trước khi áp dụng công thức.";
}

function buildConceptSupportLine(chapter) {
  const name = String(chapter?.name || "").trim();
  const rule = String(chapter?.rule || "").trim();
  if (name && rule) return `Dấu hiệu nhận diện: với ${name.toLowerCase()}, em cần nhớ mẫu ${rule}`;
  if (rule) return `Dấu hiệu nhận diện: ${rule}`;
  return "Dấu hiệu nhận diện: quan sát vai trò của từ/cụm trong câu trước khi rút gọn hoặc chọn cấu trúc.";
}

function buildConceptExampleLine(chapter) {
  const exampleA = String(chapter?.exampleA || "").trim();
  const exampleB = String(chapter?.exampleB || "").trim();
  if (exampleA && exampleB) return `Ví dụ nhanh: ${exampleA} ${exampleB}`;
  if (exampleA) return `Ví dụ nhanh: ${exampleA}`;
  if (exampleB) return `Ví dụ nhanh: ${exampleB}`;
  return "Ví dụ nhanh: thử đặt cấu trúc vào một câu ngắn để kiểm tra xem nghĩa và vai trò ngữ pháp có khớp không.";
}

function buildConceptTakeawayLine(chapter, preset) {
  const practiceA = String(chapter?.practiceA || "").trim();
  const notes = String(preset?.notes || "").trim();
  if (practiceA && notes) return `Gợi ý học nhanh: ${practiceA} ${notes}`;
  if (practiceA) return `Gợi ý học nhanh: ${practiceA}`;
  if (notes) return `Gợi ý học nhanh: ${notes}`;
  return "Gợi ý học nhanh: đọc khái niệm, đối chiếu công thức, rồi tự đặt một câu mẫu để ghi nhớ lâu hơn.";
}

function buildFormulaColumnBlock(column) {
  const heading = String(column?.heading || "").trim();
  const example = String(column?.example || "").trim();
  return [heading, example ? `Ví dụ: ${example}` : ""].filter(Boolean).join(": ") || heading;
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
    rule ? `${name}: ${rule}` : (name || "Công thức cốt lõi"),
    exampleA ? `Ví dụ: ${exampleA}` : "",
    pitfallA ? `Tránh: ${pitfallA}` : "",
  ].filter(Boolean);
}

function buildQuickMemoryBullets(preset, chapterRules, chapterExamples) {
  const chapterBullets = (preset?.chapters || [])
    .slice(0, 3)
    .map((chapter) => {
      const name = String(chapter?.name || "").trim();
      const focus = String(chapter?.focus || "").trim();
      const exampleA = String(chapter?.exampleA || "").trim();
      if (name && focus && exampleA) return `${name}: ${focus} Ví dụ tổng quát: ${exampleA}`;
      if (name && focus) return `${name}: ${focus}`;
      if (name && exampleA) return `${name}: Ví dụ tổng quát: ${exampleA}`;
      return focus || exampleA || "";
    })
    .filter(Boolean);

  if (chapterBullets.length) return chapterBullets;

  return [
    ...chapterRules.map((rule, index) => {
      const example = chapterExamples[index] || chapterExamples[0] || "";
      return example ? `${rule} Ví dụ tổng quát: ${example}` : rule;
    }),
    `Cấu trúc học nhanh: ${preset?.structure || ""}`.trim(),
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
  return `Sửa lỗi bằng cách đối chiếu lại công thức của ${chapter.name}.`;
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
  else if (topic) pieces.push(`Example: Ví dụ và bài tập đều bám đúng phạm vi ${topic}.`);
  if (notes) pieces.push(`Note: ${notes}`);
  const normalized = normalizeRouteLineText(pieces.join("\n"));
  return isFriendlySlideStyle(preset?.style) ? compactFriendlyRouteLine(normalized) : normalized;
}

function buildChapterSlides(preset, chapter, chapterIndex) {
  const base = chapterIndex * 5 + 5;
  const tag = `${preset.id}-${String(base).padStart(2, "0")}`;
  const clip = preset.compactCopy ? { titleMax: 78, bulletMax: 132 } : null;
  return [
    createSlide(
      tag,
      `${chapter.name} - Khái niệm`,
      [
        buildConceptLine(chapter),
        buildConceptSupportLine(chapter),
        chapter.rule,
        buildConceptExampleLine(chapter),
        `Ghi chú triển khai: ${preset.notes}`,
      ],
      clip,
    ),
    createSlide(
      `${preset.id}-${String(base + 1).padStart(2, "0")}`,
      `${chapter.name} - Công thức`,
      buildFormulaSummaryLines(chapter),
      clip,
    ),
    createSlide(
      `${preset.id}-${String(base + 2).padStart(2, "0")}`,
      `${chapter.name} - Ví dụ`,
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
      `${chapter.name} - Lỗi thường gặp`,
      buildPitfallSlideLines(chapter),
      clip,
    ),
    createSlide(
      `${preset.id}-${String(base + 4).padStart(2, "0")}`,
      `${chapter.name} - Luyện tập`,
      [
        buildPracticeTaskLine(chapter),
        buildPracticeGuideLine(chapter, preset),
        `Yêu cầu: viết đáp án và nêu lý do (mảng ${String(chapter.name).toLowerCase()}).`,
      ],
      clip,
    ),
  ];
}

function buildDeckFromBlueprint(preset) {
  const structureParts = splitStructure(preset.structure);
  const chapterNames = preset.chapters.map((chapter) => chapter.name);
  const chapterRules = preset.chapters.slice(0, 3).map((chapter) => chapter.rule);
  const chapterExamples = preset.chapters.slice(0, 3).map((chapter) => chapter.exampleA);
  const coverTitle = preset.compactCopy ? `${shortTopicLabel(preset.topic)} — Tổng quan` : `${preset.topic} - Tổng quan`;
  const clip = preset.compactCopy ? { titleMax: 76, bulletMax: 128 } : null;
  const routeLines = Array.isArray(preset.routeLines) && preset.routeLines.length
    ? preset.routeLines.map((line) => {
        const normalized = normalizeRouteLineText(line);
        return isFriendlySlideStyle(preset?.style) ? compactFriendlyRouteLine(normalized) : normalized;
      })
    : [
        ...structureParts.map((part, index) => buildStructureRouteLine(part, index, preset)),
        preset.compactCopy
          ? `Mỗi track có ví dụ và bài tập bám chủ đề đã chọn.`
          : `Note: Mỗi Track Đều Dùng Ví Dụ Và Bài Tập Đúng Phạm Vi ${preset.topic}.`,
      ];
  const slides = [
    createSlide(
      `${preset.id}-01`,
      coverTitle,
      [
        ...preset.chapters.slice(0, 3).map((chapter) => `${chapter.name}: ${chapter.focus}`),
        `Cấu trúc: ${preset.structure}`,
      ],
      clip,
    ),
    createSlide(
      `${preset.id}-02`,
      preset.compactCopy ? `${shortTopicLabel(preset.topic)} — Mục tiêu` : `${preset.topic} - Mục tiêu`,
      [
        `Phần chính: ${chapterNames.slice(0, 3).join(", ")}.`,
        `Trọng tâm: ${chapterRules.join(" | ")}.`,
        `Luyện: ${preset.notes}`,
      ],
      clip,
    ),
    createSlide(
      `${preset.id}-03`,
      preset.compactCopy ? `${shortTopicLabel(preset.topic)} — Lộ trình` : `${preset.topic} - Lộ trình kiến thức`,
      [...routeLines],
      clip,
    ),
    createSlide(
      `${preset.id}-04`,
      preset.compactCopy ? `${shortTopicLabel(preset.topic)} — Ghi nhớ nhanh` : `${preset.topic} - Khung ghi nhớ nhanh`,
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
      "Tổng kết",
      [
        `Ôn lại các phần chính: ${chapterNames.join(", ")}.`,
        `Nhắc lại công thức và ví dụ then chốt: ${chapterExamples.join(" | ")}.`,
        `Bài tập sau giờ học vẫn bám đúng cấu trúc: ${preset.structure}.`,
      ],
      preset.compactCopy ? { titleMax: 72, bulletMax: 130 } : null,
    ),
  );

  return slides;
}

const RAW_SLIDE_PRESETS = [
  {
    id: "slide-english-tenses",
    topic: "Các thì trong tiếng Anh",
    count: "10",
    structure: "Dấu hiệu nhận biết -> Công thức -> Bài tập vận dụng",
    style: "Chuyên nghiệp (đa sắc)",
    notes: "Dùng bảng so sánh thì để học sinh dễ phân biệt.",
    chapters: [
      {
        name: "Hiện tại đơn",
        focus: "Dùng cho thói quen, sự thật hiển nhiên và lịch trình cố định.",
        rule: "S + V(s/es); dùng do/does trong phủ định và nghi vấn.",
        exampleA: "She reviews vocabulary every evening.",
        exampleB: "The train leaves at 7 a.m.",
        pitfallA: "Quên thêm -s/-es với chủ ngữ số ít.",
        pitfallB: "Dùng hiện tại tiếp diễn cho lịch trình cố định.",
        practiceA: "Điền dạng đúng của động từ trong 3 câu hiện tại đơn.",
        practiceB: "Gạch chân dấu hiệu nhận biết trong từng câu.",
      },
      {
        name: "Hiện tại tiếp diễn",
        focus: "Dùng cho hành động đang diễn ra hoặc kế hoạch gần.",
        rule: "S + am/is/are + V-ing.",
        exampleA: "They are preparing for the speaking test now.",
        exampleB: "I am meeting my tutor this afternoon.",
        pitfallA: "Dùng với động từ trạng thái như know, like trong ngữ cảnh không phù hợp.",
        pitfallB: "Thiếu be trước V-ing.",
        practiceA: "Chọn present simple hoặc present continuous.",
        practiceB: "Viết 2 câu có now và at the moment.",
      },
      {
        name: "Quá khứ đơn",
        focus: "Dùng cho hành động đã kết thúc tại một thời điểm quá khứ.",
        rule: "S + V2/ed; dùng did trong phủ định và nghi vấn.",
        exampleA: "We visited the museum last week.",
        exampleB: "He did not submit the form yesterday.",
        pitfallA: "Dùng V2 sau did.",
        pitfallB: "Nhầm mốc quá khứ với khoảng thời gian kéo dài đến hiện tại.",
        practiceA: "Chuyển 3 câu sang quá khứ đơn.",
        practiceB: "Tìm time markers trong câu.",
      },
      {
        name: "Quá khứ hoàn thành",
        focus: "Dùng cho hành động xảy ra trước một hành động quá khứ khác.",
        rule: "S + had + V3/ed.",
        exampleA: "By the time we arrived, the lesson had started.",
        exampleB: "She had finished the task before the bell rang.",
        pitfallA: "Lạm dụng past perfect khi chỉ có một hành động quá khứ.",
        pitfallB: "Nhầm had + V3 với quá khứ đơn.",
        practiceA: "Sắp xếp hai hành động quá khứ theo đúng thứ tự.",
        practiceB: "Điền had + V3 vào câu phù hợp.",
      },
      {
        name: "Tương lai hoàn thành",
        focus: "Dùng cho hành động sẽ hoàn tất trước một mốc tương lai.",
        rule: "S + will have + V3/ed.",
        exampleA: "By June, they will have completed the project.",
        exampleB: "By the end of this course, we will have reviewed all tenses.",
        pitfallA: "Bỏ have sau will.",
        pitfallB: "Không nhận ra mốc by + future time.",
        practiceA: "Hoàn thành 3 câu với future perfect.",
        practiceB: "Viết một câu có by the end of.",
      },
    ],
  },
  {
    id: "slide-subject-verb-agreement",
    topic: "Sự hòa hợp chủ vị",
    count: "12",
    structure: "Chủ ngữ số ít/số nhiều -> Trường hợp đặc biệt -> Sửa lỗi sai",
    style: "Tối giản (Học thuật)",
    notes: "Tập trung vào lỗi subject-verb agreement trong câu trắc nghiệm.",
    chapters: [
      {
        name: "Chủ ngữ số ít và số nhiều",
        focus: "Động từ phải hòa hợp với chủ ngữ thật của câu.",
        rule: "Singular subject + singular verb; plural subject + plural verb.",
        exampleA: "The student needs more practice.",
        exampleB: "The students need more practice.",
        pitfallA: "Chia động từ theo danh từ gần nhất trong cụm giới từ.",
        pitfallB: "Không xác định đúng chủ ngữ chính.",
        practiceA: "Gạch chân chủ ngữ chính trong 5 câu.",
        practiceB: "Chọn is/are hoặc has/have đúng.",
      },
      {
        name: "Each, every, either, neither",
        focus: "Các từ này thường kéo động từ về số ít.",
        rule: "Each/every/either/neither + singular verb.",
        exampleA: "Each student has a login account.",
        exampleB: "Every teacher is ready for the meeting.",
        pitfallA: "Nhìn danh từ số nhiều sau of rồi chia plural.",
        pitfallB: "Quên every + singular noun.",
        practiceA: "Sửa lỗi động từ sau each/every.",
        practiceB: "Viết 2 câu có neither và either.",
      },
      {
        name: "The number và a number",
        focus: "Hai cụm này có cách chia động từ khác nhau.",
        rule: "The number of + plural noun + singular verb; a number of + plural noun + plural verb.",
        exampleA: "The number of applicants is rising.",
        exampleB: "A number of students are absent.",
        pitfallA: "Nhầm the number với a number.",
        pitfallB: "Bỏ qua danh từ chính number.",
        practiceA: "Chọn động từ đúng cho 4 câu.",
        practiceB: "Giải thích khác biệt giữa hai mẫu.",
      },
      {
        name: "Neither...nor và either...or",
        focus: "Động từ hòa hợp với chủ ngữ gần nó hơn.",
        rule: "Neither A nor B / Either A or B: verb agrees with B.",
        exampleA: "Neither the students nor the teacher is ready.",
        exampleB: "Either the teacher or the students are responsible.",
        pitfallA: "Chia theo thành phần đầu tiên.",
        pitfallB: "Không để ý chủ ngữ gần động từ.",
        practiceA: "Hoàn thành câu với neither...nor.",
        practiceB: "Sửa lỗi trong 3 câu phối hợp.",
      },
      {
        name: "Danh từ đặc biệt",
        focus: "Một số danh từ nhìn như số nhiều nhưng chia số ít hoặc ngược lại.",
        rule: "Physics/news/mathematics thường dùng singular verb.",
        exampleA: "Physics is my favourite subject.",
        exampleB: "The news was surprising.",
        pitfallA: "Thấy -s rồi chia plural.",
        pitfallB: "Không xét nghĩa của danh từ tập hợp.",
        practiceA: "Phân loại danh từ đặc biệt.",
        practiceB: "Làm 5 câu error identification.",
      },
    ],
  },
  {
    id: "slide-passive-voice",
    topic: "Câu bị động",
    count: "14",
    structure: "Bị động cơ bản -> Bị động đặc biệt -> Bài tập viết lại câu",
    style: "Vui tươi (Thân thiện)",
    notes: "Chỉ luyện câu bị động và các biến thể bị động.",
    routeLines: [
      "Track 1: Passive Basics And Tense Changes\nKnowledge: Tập trung vào cách đưa tân ngữ lên làm chủ ngữ mới, chọn đúng dạng be theo thì của câu gốc, rồi đổi động từ chính về V3 hoặc PII để câu bị động vẫn đúng nghĩa.\nExample: They clean the room every day -> The room is cleaned every day. The letter has been sent là mẫu giúp nhận ra hiện tại hoàn thành bị động rất nhanh.\nNote: Không được quên be, không giữ nguyên động từ ở dạng V1 hoặc V2, và luôn kiểm tra lại xem thì của câu bị động đã bám đúng câu gốc chưa.",
      "Track 2: Special Passive Forms\nKnowledge: Tập trung vào modal passive, bị động tiếp diễn, và cấu trúc have or get something done để xử lý các dạng biến thể thường gặp trong bài viết lại câu và bài nhận diện lỗi sai.\nExample: The form must be submitted today. The documents are being checked now. She had her hair cut là mẫu tiêu biểu cho dạng nhờ người khác làm việc cho mình.\nNote: Cần phân biệt rõ be, being, been trong từng cấu trúc, đồng thời tránh dùng sai vị trí của not hoặc bỏ mất thành phần bắt buộc trong cụm passive đặc biệt.",
    ],
    chapters: [
      {
        name: "Bị động cơ bản",
        focus: "Đưa tân ngữ của câu chủ động lên làm chủ ngữ câu bị động, chọn dạng be phù hợp với thì câu gốc, rồi đổi động từ chính về V3/ed.",
        rule: "S + be (am/is/are/was/were) + V3/ed + (by agent — có thể bỏ nếu agent không quan trọng).",
        exampleA: "They clean the room every day → The room is cleaned every day.",
        exampleB: "She wrote the report last night → The report was written last night.",
        detailedExample: "Ví dụ phân tích: Câu chủ động 'The teacher explains the rule' có tân ngữ 'the rule' → tân ngữ lên làm chủ ngữ mới: 'The rule is explained by the teacher.' Chú ý: (1) be đổi theo thì — hiện tại đơn dùng is/am/are, (2) động từ explain → explained (V3), (3) agent 'by the teacher' có thể bỏ nếu không cần thiết. Câu 'The bridge was built in 2010' không có agent vì không cần biết ai xây.",
        pitfallA: "Thiếu be trong câu bị động: viết *The room cleaned* thay vì *The room is cleaned*.",
        pitfallB: "Dùng V2 thay vì V3: viết *The report was wrote* thay vì *was written*.",
        pitfallADetail: "Be là thành phần bắt buộc trong mọi câu bị động — không có be thì câu không phải bị động. Lỗi hay gặp: 'The window broken' (thiếu was/were), 'The task finished' (thiếu has been hoặc was). Mỗi khi chuyển câu sang bị động, kiểm tra ngay: có be chưa, be có đúng thì chưa?",
        pitfallBDetail: "V3 (past participle) khác với V2 (past simple): write → wrote (V2) / written (V3); make → made (V2) / made (V3 trùng nhau); break → broke (V2) / broken (V3). Sau be trong passive voice LUÔN dùng V3, không bao giờ dùng V2. Học sinh hay nhầm vì V2 quen thuộc hơn khi chia thì quá khứ.",
        pitfallFix: "Công thức 2 bước kiểm tra: (1) Câu có be không? — nếu không thì sai. (2) Động từ chính có ở dạng V3 không? — nếu đang là V1/V2 thì sai. Cả hai đúng mới là câu bị động hoàn chỉnh.",
        practiceA: "Chuyển 3 câu chủ động sang bị động cơ bản, giữ nguyên thì của câu gốc.",
        practiceB: "Xác định tân ngữ trong 4 câu chủ động và giải thích tại sao đây là tân ngữ chứ không phải chủ ngữ.",
        detailedPractice: "Bài luyện tập: 1. 'The students submit the assignment every week.' → chuyển sang bị động hiện tại đơn. 2. Sửa lỗi: 'The letter was wrote by the secretary.' 3. Giải thích: câu 'The car was repaired.' có cần thêm 'by someone' không, và khi nào thì cần giữ lại agent?",
      },
      {
        name: "Bị động theo thì",
        focus: "Be trong câu bị động phải đổi theo thì của câu gốc — xác định đúng thì trước, sau đó chọn dạng be tương ứng.",
        rule: "Present simple: is/am/are + V3 | Past simple: was/were + V3 | Present perfect: has/have been + V3 | Future: will be + V3 | Modal: modal + be + V3.",
        exampleA: "The letter has been sent. (present perfect passive)",
        exampleB: "The bridge was built in 2010. (past simple passive)",
        detailedExample: "Ví dụ theo từng thì: Hiện tại đơn: 'English is taught at this school.' Quá khứ đơn: 'The road was repaired last month.' Hiện tại hoàn thành: 'Three books have been published this year.' Tương lai đơn: 'The results will be announced tomorrow.' Mỗi câu đều giữ đúng dạng be theo thì — đây là điểm mấu chốt để câu bị động đúng thì.",
        pitfallA: "Không giữ đúng thì: chuyển câu present perfect sang bị động nhưng lại dùng was/were thay vì has/have been.",
        pitfallB: "Nhầm been với being: viết *The letter is been sent* thay vì *has been sent*, hoặc *The task was being done* khi đây chỉ là past simple passive.",
        pitfallADetail: "Mỗi thì chủ động có đúng một dạng bị động tương ứng — không thể chuyển thì khi đổi sang bị động. 'They have finished the project' → 'The project has been finished' (không phải *was finished*). Học sinh hay nhầm vì quá khứ đơn và hiện tại hoàn thành đều có V3, nhưng be dùng khác nhau hoàn toàn: was/were vs has/have been.",
        pitfallBDetail: "Been dùng trong perfect passive (has been + V3); being dùng trong continuous passive (is being + V3). Nhầm hai cái này dẫn đến câu sai thì và sai nghĩa: *The project is been finished* không đúng cấu trúc; đúng là *has been finished* (hoàn thành) hoặc *is being finished* (đang hoàn thành).",
        pitfallFix: "Bảng nhớ nhanh: present simple → is/are + V3; past simple → was/were + V3; present perfect → has/have been + V3; future → will be + V3; continuous → is/are being + V3. Nhìn câu gốc, xác định thì, tra bảng, chọn be.",
        practiceA: "Chọn dạng be đúng theo thì cho 5 câu bị động.",
        practiceB: "Viết lại 4 câu ở 4 thì khác nhau (present simple, past simple, present perfect, future simple).",
        detailedPractice: "Bài luyện tập: 1. 'Scientists discovered a new planet last year.' → chuyển sang past simple passive. 2. Sửa lỗi thì: 'The report is been submitted yesterday.' 3. Chọn dạng đúng: 'The project (finish/has been finished/was being finished) three days ago.' — giải thích lý do chọn.",
      },
      {
        name: "Bị động với modal verbs",
        focus: "Câu bị động với modal verbs dùng cấu trúc modal + be + V3 — be không đổi theo thì vì modal đã mang thông tin về thời gian và mức độ.",
        rule: "modal (must/should/can/may/might/will/would) + be + V3/ed.",
        exampleA: "The form must be submitted today. (obligation)",
        exampleB: "The problem can be solved with a different approach.",
        detailedExample: "Ví dụ theo từng modal: Must be + V3: 'The rules must be followed.' Should be + V3: 'The essay should be proofread before submission.' Can be + V3: 'This mistake can be avoided easily.' May be + V3: 'The meeting may be postponed.' Will be + V3: 'The results will be announced next week.' Tất cả đều dùng be (nguyên mẫu) sau modal — không đổi thành is/was/been.",
        pitfallA: "Viết modal + V3 trực tiếp mà bỏ be: viết *The form must submitted* thay vì *must be submitted*.",
        pitfallB: "Dùng been sau modal trong câu bị động thường: viết *The task should been done* thay vì *should be done*.",
        pitfallADetail: "Modal passive BẮT BUỘC có be giữa modal và V3: modal + be + V3. Be không thể bỏ vì đây là dấu hiệu bị động. Viết *The document must submitted* là sai hoàn toàn về cấu trúc. Cách nhớ: modal passive = modal + be + V3, ba thành phần đều cần thiết.",
        pitfallBDetail: "been chỉ xuất hiện trong perfect passive: modal + have been + V3 (ví dụ: *should have been done* — tiếc nuối quá khứ). Trong câu modal passive thông thường (hiện tại/tương lai), dùng be, không phải been: *must be done*, *can be fixed*, *will be announced*. Nhầm be và been là một trong những lỗi phổ biến nhất trong bài kiểm tra.",
        pitfallFix: "Công thức: modal passive thường = modal + be + V3; modal perfect passive = modal + have been + V3. Câu nào cần nói về quá khứ thì mới thêm have been; còn lại luôn dùng be.",
        practiceA: "Hoàn thành 5 câu với should/must/can/may/will be + V3.",
        practiceB: "Sửa lỗi trong 4 câu modal passive có lỗi cấu trúc.",
        detailedPractice: "Bài luyện tập: 1. Chuyển sang modal passive: 'Someone must check the documents before printing.' 2. Sửa lỗi: 'This rule should been applied from the beginning.' 3. Phân biệt: *The fee must be paid* vs *The fee must have been paid* — câu nào nói về hiện tại, câu nào về quá khứ?",
      },
      {
        name: "Bị động tiếp diễn",
        focus: "Diễn tả hành động đang được thực hiện.",
        rule: "am/is/are being + V3 hoặc was/were being + V3.",
        exampleA: "The documents are being checked now.",
        exampleB: "The road was being repaired at 8 a.m.",
        pitfallA: "Bỏ being.",
        pitfallB: "Dùng being sai thì.",
        pitfallADetail: "Lỗi thường gặp nhất là viết *The documents are checked now* hoặc *The road was repaired at 8 a.m.* dù câu đang nhấn vào hành động đang diễn ra. Khi đã có dấu hiệu như now, at the moment, at 8 a.m., while..., học sinh phải giữ đủ cụm *be + being + V3* chứ không được bỏ *being*.",
        pitfallBDetail: "Nhiều bạn nhớ có *being* nhưng lại lắp sai trợ động từ thời: viết *is being repaired yesterday* hoặc *was being checked now*. Cần xác định rõ mốc thời gian trước: hiện tại dùng *am/is/are being + V3*, quá khứ tiếp diễn bị động dùng *was/were being + V3*.",
        pitfallFix: "Cách tự kiểm tra nhanh: tìm dấu hiệu thời gian trước, chọn đúng dạng *be*, sau đó kiểm tra xem câu có đang mang nghĩa bị động và tiếp diễn không. Nếu thiếu một trong ba mắt xích *be - being - V3* thì câu vẫn chưa đúng.",
        practiceA: "Chọn present continuous passive.",
        practiceB: "Viết 2 câu có now và at that time.",
      },
      {
        name: "Have something done",
        focus: "Diễn tả việc nhờ hoặc thuê người khác làm cho mình — chủ ngữ không tự làm mà sắp xếp/trả tiền cho người khác làm.",
        rule: "have/get + object + V3/ed (object là vật/việc được làm, không phải người làm).",
        exampleA: "She had her hair cut. (nhờ thợ cắt, không tự cắt)",
        exampleB: "We got the printer repaired by the technician.",
        detailedExample: "Ví dụ phân tích: 'She had her hair cut' — she là chủ ngữ, had là have (quá khứ), her hair là object, cut là V3. Nghĩa: cô ấy nhờ ai đó cắt tóc cho mình. So sánh với bị động thông thường: 'Her hair was cut' — câu bị động thông thường không nhấn vào việc nhờ người. 'I am going to have my phone fixed' — tôi sẽ đem điện thoại đi sửa (nhờ người sửa). 'They got their house painted last summer' — họ thuê người sơn nhà.",
        pitfallA: "Nhầm với bị động thông thường: viết *My car was repaired* khi muốn nói *I had my car repaired* — hai câu khác nhau về ý nghĩa.",
        pitfallB: "Đặt sai object hoặc bỏ object: viết *She had cut her hair* (dạng perfect, nghĩa khác) thay vì *She had her hair cut*.",
        pitfallADetail: "Have something done nhấn vào việc nhờ người — chủ ngữ chủ động sắp xếp cho việc đó xảy ra. Bị động thông thường (*My car was repaired*) chỉ nói việc xảy ra, không nhấn vào ai sắp xếp. Trong bài kiểm tra, ngữ cảnh 'nhờ thợ, thuê người' → dùng have/get something done, không dùng passive đơn thuần.",
        pitfallBDetail: "Trật tự từ trong have something done là BẮT BUỘC: have/get + OBJECT + V3. Không được đặt V3 trước object: *She had cut her hair* = she herself đã cắt tóc (present perfect, nghĩa hoàn toàn khác). *I got repaired my bike* là sai trật tự — đúng là *I got my bike repaired*. Object phải đứng ngay sau have/get, V3 đứng sau object.",
        pitfallFix: "Cách tự kiểm tra: sau have/get có phải là object (danh từ/cụm danh từ chỉ vật/việc) không? Tiếp theo có phải là V3 không? Nếu thứ tự là have + V3 + object thì sai — đổi lại thành have + object + V3.",
        practiceA: "Biến đổi 3 câu sang cấu trúc have something done theo ngữ cảnh nhờ người làm.",
        practiceB: "Phân biệt: 'She had her nails done' vs 'She had done her nails' — nghĩa khác nhau như thế nào?",
        detailedPractice: "Bài luyện tập: 1. Viết lại dùng have something done: 'A mechanic repaired my car yesterday.' → 'I ________ yesterday.' 2. Sửa lỗi trật tự từ: 'He got repaired his laptop at the shop.' 3. Phân tích: 'They are having their office renovated' — ai đang làm việc, ai là chủ ngữ thực hiện, và tại sao đây không phải câu bị động thông thường?",
      },
    ],
  },
  {
    id: "slide-relative-clauses",
    topic: "Mệnh đề quan hệ",
    count: "16",
    structure: "Đại từ quan hệ -> Mệnh đề xác định/không xác định -> Bài tập chọn đáp án",
    style: "Vũ trụ sáng (Trẻ trung)",
    notes: "Chỉ học who, whom, which, whose, where, when, that.",
    chapters: [
      {
        name: "Who và whom",
        focus: "Who làm chủ ngữ chỉ người; whom làm tân ngữ chỉ người.",
        rule: "who + verb; whom + subject + verb.",
        exampleA: "The student who won the prize is Lan.",
        exampleB: "The man whom you met is my uncle.",
        pitfallA: "Dùng whom làm chủ ngữ.",
        pitfallB: "Không nhận ra vị trí tân ngữ.",
        practiceA: "Điền who hoặc whom vào 5 câu.",
        practiceB: "Xác định chức năng của đại từ quan hệ.",
      },
      {
        name: "Which và that",
        focus: "Which cho vật; that cho mệnh đề xác định.",
        rule: "noun + which/that + clause.",
        exampleA: "The book which I bought is useful.",
        exampleB: "The answer that makes sense is here.",
        pitfallA: "Không dùng that sau dấu phẩy.",
        pitfallB: "Không dùng which cho người.",
        practiceA: "Chọn which hoặc that.",
        practiceB: "Nhắc lại: that không đứng sau dấu phẩy.",
      },
      {
        name: "Whose",
        focus: "Whose diễn tả sở hữu cho người hoặc vật.",
        rule: "whose + noun + clause.",
        exampleA: "The girl whose bag was lost is crying.",
        exampleB: "The house whose roof is red belongs to my aunt.",
        pitfallA: "Dùng who thay whose.",
        pitfallB: "Quên danh từ ngay sau whose.",
        practiceA: "Hoàn thành câu với whose.",
        practiceB: "Kết hợp 2 câu có quan hệ sở hữu.",
      },
      {
        name: "Where và when",
        focus: "Where thay cho nơi chốn; when thay cho thời gian.",
        rule: "where = in/at which; when = on/in which.",
        exampleA: "The village where I was born is peaceful.",
        exampleB: "The day when we met was rainy.",
        pitfallA: "Dùng where cho danh từ chỉ thời gian.",
        pitfallB: "Dùng when cho địa điểm.",
        practiceA: "Chọn where hoặc when.",
        practiceB: "Viết 2 câu có place và time.",
      },
      {
        name: "Defining và non-defining",
        focus: "Dấu phẩy quyết định loại mệnh đề và lựa chọn đại từ.",
        rule: "Non-defining clause dùng dấu phẩy và không dùng that.",
        exampleA: "My brother, who lives in Hue, is a teacher.",
        exampleB: "The laptop, which I bought yesterday, is fast.",
        pitfallA: "Dùng that sau dấu phẩy.",
        pitfallB: "Bỏ dấu phẩy trong mệnh đề bổ sung thông tin.",
        practiceA: "Thêm dấu phẩy đúng vị trí.",
        practiceB: "Chọn đại từ quan hệ phù hợp.",
      },
    ],
  },
  {
    id: "slide-reduced-relative-clauses",
    topic: "Rút gọn mệnh đề quan hệ",
    count: "18",
    structure: "Rút gọn V-ing -> Rút gọn V3 -> Rút gọn to V",
    style: "Vũ trụ tối (Huyền bí)",
    notes: "Chỉ luyện reduced relative clauses bằng V-ing, V3 và to V.",
    chapters: [
      {
        name: "Rút gọn bằng V-ing",
        focus: "Dùng khi mệnh đề quan hệ mang nghĩa chủ động.",
        rule: "who/which/that + be + V-ing -> V-ing.",
        exampleA: "The boy who is standing there -> The boy standing there.",
        exampleB: "Students who want extra practice -> Students wanting extra practice.",
        pitfallA: "Dùng V-ing cho nghĩa bị động.",
        pitfallB: "Rút gọn khi chủ ngữ không trùng.",
        practiceA: "Rút gọn 4 câu chủ động.",
        practiceB: "Gạch chân danh từ được bổ nghĩa.",
      },
      {
        name: "Rút gọn bằng V3",
        focus: "Dùng khi mệnh đề quan hệ mang nghĩa bị động.",
        rule: "who/which/that + be + V3 -> V3.",
        exampleA: "The documents which were submitted yesterday -> The documents submitted yesterday.",
        exampleB: "The book that was written by Nam -> The book written by Nam.",
        pitfallA: "Dùng V-ing thay V3.",
        pitfallB: "Bỏ thông tin agent quan trọng.",
        practiceA: "Rút gọn 4 câu bị động.",
        practiceB: "Phân biệt active và passive meaning.",
      },
      {
        name: "Rút gọn bằng to V",
        focus: "Dùng với the first, the last, the only và superlative.",
        rule: "relative clause -> to V after special noun phrases.",
        exampleA: "He was the first person who arrived -> He was the first person to arrive.",
        exampleB: "She is the only student who can solve it -> She is the only student to solve it.",
        pitfallA: "Dùng to V cho mọi mệnh đề.",
        pitfallB: "Không nhận ra dấu hiệu the first/the only.",
        practiceA: "Chọn dạng rút gọn to V đúng.",
        practiceB: "Viết 2 câu với the first và the only.",
      },
      {
        name: "Mệnh đề có cụm giới từ",
        focus: "Một số cụm sau rút gọn vẫn cần giữ giới từ hoặc cụm bổ nghĩa.",
        rule: "Keep necessary prepositional phrases after reduced clause.",
        exampleA: "The girl sitting by the window is my sister.",
        exampleB: "The ideas presented in the report were practical.",
        pitfallA: "Cắt mất thông tin nơi chốn/thời gian.",
        pitfallB: "Đưa cụm giới từ sai vị trí.",
        practiceA: "Rút gọn và giữ cụm bổ nghĩa.",
        practiceB: "Sửa lỗi vị trí phrase.",
      },
      {
        name: "Phân biệt ba dạng rút gọn",
        focus: "Chọn V-ing, V3 hoặc to V theo nghĩa và dấu hiệu.",
        rule: "Active -> V-ing; passive -> V3; special noun phrase -> to V.",
        exampleA: "The team selected for the final round is ready.",
        exampleB: "The only candidate to pass the interview was Minh.",
        pitfallA: "Chọn theo thói quen mà không xét nghĩa.",
        pitfallB: "Không kiểm tra danh từ đứng trước.",
        practiceA: "Bảng phân loại 9 ví dụ.",
        practiceB: "Bài kiểm tra nhanh chỉ về reduced relative clauses.",
      },
    ],
  },
  {
    id: "slide-word-formation",
    topic: "Word Formation",
    count: "20",
    structure: "Dấu hiệu từ loại -> Tiền tố/hậu tố -> Bài tập điền từ",
    style: "Biển cả",
    notes: "Dạy mẹo chọn đáp án theo từ loại và hậu tố.",
    chapters: [
      {
        name: "Dấu hiệu danh từ",
        focus: "Danh từ thường xuất hiện sau article, adjective hoặc preposition.",
        rule: "a/an/the + noun; adjective + noun; preposition + noun.",
        exampleA: "The explanation was clear.",
        exampleB: "They discussed the importance of education.",
        detailedExample:
          "Ví dụ: Trong câu 'They discussed the importance of education in rural areas', từ 'importance' phải là danh từ vì nó đứng sau mạo từ 'the' và đứng trước cụm giới từ 'of education'. Tương tự, trong câu 'Her explanation was clear and easy to follow', từ 'explanation' cũng là danh từ vì nó đứng sau tính từ sở hữu 'her'.",
        pitfallA: "Chọn tính từ vào vị trí danh từ.",
        pitfallB: "Không xét từ đứng trước chỗ trống.",
        practiceA: "Xác định vị trí cần danh từ.",
        practiceB: "Điền noun form đúng.",
        detailedPractice:
          "Bài luyện tập: Complete the sentence 'The teacher gave a very clear _______ of the new grammar rule. (explain)'. Học sinh phải chọn noun form đúng và giải thích vì sao sau 'a very clear' cần một danh từ.",
      },
      {
        name: "Dấu hiệu tính từ",
        focus: "Tính từ bổ nghĩa danh từ hoặc đứng sau linking verbs.",
        rule: "be/seem/become + adjective; adjective + noun.",
        exampleA: "The method is effective.",
        exampleB: "This is a useful strategy.",
        detailedExample:
          "Ví dụ: Trong câu 'The method is effective enough for weak students', từ 'effective' là tính từ vì nó đứng sau động từ nối 'is'. Trong câu 'This is a useful strategy for vocabulary revision', từ 'useful' cũng là tính từ vì nó bổ nghĩa trực tiếp cho danh từ 'strategy'.",
        pitfallA: "Dùng trạng từ sau linking verb.",
        pitfallB: "Nhầm adjective với noun.",
        practiceA: "Chọn adjective form.",
        practiceB: "Sửa lỗi word form trong câu.",
        detailedPractice:
          "Bài luyện tập: Complete the sentence 'Although the plan sounds ________, it is not easy to apply in a real exam. (use)'. Học sinh phải chọn adjective form đúng, sau đó nêu dấu hiệu giúp nhận ra chỗ trống cần tính từ.",
      },
      {
        name: "Dấu hiệu trạng từ",
        focus: "Trạng từ bổ nghĩa động từ, tính từ hoặc cả câu.",
        rule: "verb + adverb; adverb + adjective.",
        exampleA: "She answered confidently.",
        exampleB: "The task was extremely difficult.",
        detailedExample:
          "Ví dụ: Trong câu 'She answered the interview questions confidently and clearly', hai từ 'confidently' và 'clearly' là trạng từ vì chúng bổ nghĩa cho động từ 'answered', cho biết cô ấy trả lời như thế nào. Trong câu 'The task was extremely difficult for most students', từ 'extremely' là trạng từ vì nó bổ nghĩa cho tính từ 'difficult', chứ không bổ nghĩa cho danh từ.",
        pitfallA: "Dùng adjective để bổ nghĩa động từ.",
        pitfallB: "Quên hậu tố -ly khi cần.",
        practiceA: "Điền adverb form.",
        practiceB: "Phân biệt adjective và adverb.",
        detailedPractice:
          "Bài luyện tập: Complete the sentence 'The candidate spoke ________ during the presentation, so everyone could understand the main ideas. (confident)'. Học sinh phải điền adverb form đúng và chỉ ra động từ nào đang được bổ nghĩa.",
      },
      {
        name: "Tiền tố",
        focus: "Tiền tố thường đổi nghĩa của từ gốc.",
        rule: "un-, in-, im-, dis-, re- tạo nghĩa phủ định hoặc lặp lại.",
        exampleA: "possible -> impossible.",
        exampleB: "appear -> disappear.",
        pitfallA: "Gắn sai tiền tố với từ gốc.",
        pitfallB: "Không nhận ra sắc thái phủ định.",
        practiceA: "Chọn prefix đúng.",
        practiceB: "Tạo từ trái nghĩa bằng prefix.",
      },
      {
        name: "Hậu tố",
        focus: "Hậu tố giúp nhận diện từ loại trong bài điền từ.",
        rule: "-tion/-ment cho noun; -ful/-ive cho adjective; -ly cho adverb.",
        exampleA: "inform -> information.",
        exampleB: "careful -> carefully.",
        detailedExample:
          "Ví dụ: Từ gốc 'inform' có thể đổi thành danh từ 'information' trong câu 'The information in this article is reliable and up to date'. Từ tính từ 'careful' có thể đổi thành trạng từ 'carefully' trong câu 'Students should read the instructions carefully before choosing an answer', vì vị trí đó cần một từ bổ nghĩa cho động từ 'read'.",
        pitfallA: "Sai chính tả khi thêm hậu tố.",
        pitfallB: "Chọn đúng nghĩa nhưng sai từ loại.",
        practiceA: "Hoàn thành bảng word family.",
        practiceB: "Mini test word formation.",
        detailedPractice:
          "Bài luyện tập: Complete the sentence 'Before submitting the essay, read the question ________ to avoid careless mistakes. (careful)'. Học sinh phải đổi từ gốc sang đúng hậu tố và giải thích vì sao vị trí đó cần trạng từ.",
      },
    ],
  },
  {
    id: "slide-reported-speech",
    topic: "Câu tường thuật",
    count: "22",
    structure: "Lùi thì -> Đổi đại từ/trạng từ -> Câu hỏi và mệnh lệnh",
    style: "Comic",
    notes: "Chỉ luyện reported speech theo form viết lại câu.",
    routeLines: [
      "Track 1: Backshift Rules\nKnowledge: Tập trung vào việc lùi thì khi chuyển câu trực tiếp sang câu tường thuật, đặc biệt với các mẫu present sang past, will sang would, và can sang could trong câu kể thông thường.\nExample: \"I am tired\" -> He said he was tired. \"I will call you later\" -> She said she would call me later để học sinh thấy rõ sự thay đổi của động từ chính.\nNote: Chỉ lùi thì khi động từ tường thuật đứng ở quá khứ; nếu nội dung vẫn là sự thật hiển nhiên hoặc tình huống vẫn còn đúng, có thể giữ nguyên thì thay vì lùi máy móc.",
      "Track 2: Reported Questions And Commands\nKnowledge: Tập trung vào cách đổi câu hỏi về trật tự câu khẳng định, dùng if hoặc whether cho yes/no questions, và dùng tell, ask, order, remind + object + to V cho câu mệnh lệnh.\nExample: \"Do you like English?\" -> He asked if I liked English. \"Open the door\" -> She told me to open the door là hai mẫu rất hay xuất hiện trong phần viết lại câu.\nNote: Không giữ đảo trợ động từ trong câu hỏi tường thuật, không dùng that-clause cho câu mệnh lệnh, và phải đặt not đúng vị trí trong mẫu told somebody not to V.",
    ],
    chapters: [
      {
        name: "Lùi thì",
        focus: "Động từ trong câu trực tiếp thường lùi một thì khi tường thuật.",
        rule: "present -> past; will -> would; can -> could.",
        exampleA: "\"I am tired\" -> He said he was tired.",
        exampleB: "\"I will call\" -> She said she would call.",
        formulaColumns: [
          {
            heading: "Present -> Past",
            explanation:
              "Khi câu trực tiếp dùng thì hiện tại, em thường lùi về thì quá khứ tương ứng nếu động từ tường thuật đứng ở quá khứ.",
            example: "\"I am tired\" -> He said he was tired.",
            note:
              "Áp dụng tốt với present simple và present continuous, nhưng không lùi máy móc nếu nội dung vẫn là sự thật hiển nhiên.",
          },
          {
            heading: "Will -> Would",
            explanation:
              "Khi câu trực tiếp dùng will để nói ý định, lời hứa hoặc dự đoán, em thường đổi will thành would trong câu tường thuật.",
            example: "\"I will call\" -> She said she would call.",
            note:
              "Giữ nguyên phần nghĩa phía sau will, chỉ đổi trợ động từ để câu reported speech vẫn đúng mạch và đúng thì.",
          },
          {
            heading: "Can -> Could",
            explanation:
              "Khi câu trực tiếp dùng can để chỉ khả năng hoặc sự cho phép, em thường đổi can thành could khi chuyển sang câu tường thuật.",
            example: "\"I can swim\" -> He said he could swim.",
            note:
              "Luôn đọc ngữ cảnh trước để phân biệt can mang nghĩa ability hay permission, rồi mới đổi sang could cho chính xác.",
          },
        ],
        pitfallA: "Giữ nguyên thì không phù hợp.",
        pitfallB: "Lùi thì sai với modal verbs.",
        practiceA: "Lùi thì 5 câu trực tiếp.",
        practiceB: "Điền reported verb đúng.",
      },
      {
        name: "Đổi đại từ",
        focus: "Đại từ phải đổi theo người nói và người nghe.",
        rule: "I/my/we/our đổi theo ngữ cảnh tường thuật.",
        exampleA: "\"I lost my book\" -> She said she had lost her book.",
        exampleB: "\"We need our notes\" -> They said they needed their notes.",
        pitfallA: "Đổi đại từ máy móc.",
        pitfallB: "Không xét người đang tường thuật.",
        practiceA: "Đổi đại từ trong 4 câu.",
        practiceB: "Giải thích người nói/người nghe.",
      },
      {
        name: "Đổi trạng từ thời gian và nơi chốn",
        focus:
          "Khi người kể đã đổi mốc nhìn, em thường đổi here thành there, this place thành that place, và cân nhắc come thành go để câu tường thuật tự nhiên hơn.",
        rule:
          "đổi now thành then, today thành that day, tonight thành that night, tomorrow thành the next day, yesterday thành the day before khi mốc thời gian đã lùi về quá khứ",
        exampleA: "\"I am leaving tomorrow\" -> He said he was leaving the next day.",
        exampleB: "\"I live here\" -> She said she lived there.",
        pitfallA: "Giữ tomorrow khi ngữ cảnh đã đổi.",
        pitfallB: "Đổi trạng từ dù ngữ cảnh không yêu cầu.",
        practiceA: "Match direct adverbs with reported adverbs.",
        practiceB: "Viết lại câu có here/now/today.",
      },
      {
        name: "Câu hỏi tường thuật",
        focus: "Câu hỏi đổi về trật tự câu khẳng định.",
        rule: "Yes/No question -> if/whether; Wh-question giữ wh-word.",
        exampleA: "\"Do you like English?\" -> He asked if I liked English.",
        exampleB: "\"Where do you live?\" -> She asked where I lived.",
        pitfallA: "Giữ đảo trợ động từ trong câu tường thuật.",
        pitfallB: "Quên if/whether.",
        practiceA: "Viết lại 5 câu hỏi tường thuật.",
        practiceB: "Sửa lỗi word order.",
        detailedPractice:
          "Bài luyện tập: Câu 1: \"Do you like English?\" -> He asked if...; Câu 2: \"Where do you live?\" -> She asked where...; Câu 3: \"Can you help me?\" -> She asked whether...; Câu 4: \"What are you doing?\" -> He asked what...; Câu 5: \"Did you finish homework?\" -> The teacher asked if....",
      },
      {
        name: "Câu mệnh lệnh tường thuật",
        focus: "Dùng tell/ask/order/remind + object + to V hoặc not to V.",
        rule: "Please V -> asked/told somebody to V; Don't V -> told somebody not to V.",
        exampleA: "\"Open the door\" -> She told me to open the door.",
        exampleB: "\"Don't be late\" -> He told us not to be late.",
        pitfallA: "Dùng that-clause cho mệnh lệnh.",
        pitfallB: "Đặt not sai vị trí.",
        pitfallExtraLines: [
          "Quên tân ngữ sau tell, ask, remind hoặc warn nên câu thiếu người nhận mệnh lệnh.",
          "Giữ nguyên động từ gốc thay vì chuyển sang to V hoặc not to V trong câu tường thuật.",
          "Với please, cần ưu tiên asked hoặc told thay vì bê nguyên please vào reported speech.",
        ],
        pitfallFix:
          "Cách soát nhanh: xác định người nhận lời nói trước, rồi kiểm tra mẫu verb + object + to V hoặc verb + object + not to V; nếu câu chưa có object hoặc còn that-clause thì cần sửa lại.",
        practiceA: "Chuyển 4 mệnh lệnh sang reported speech.",
        practiceB: "Tạo câu với remind và warn.",
      },
    ],
  },
  {
    id: "slide-comparisons",
    topic: "Câu so sánh",
    count: "24",
    structure: "So sánh bằng -> So sánh hơn/nhất -> So sánh kép",
    style: "Chuyên nghiệp (đa sắc)",
    notes: "Dùng ví dụ ngắn và bài tập viết lại câu.",
    chapters: [
      {
        name: "So sánh bằng",
        focus: "Dùng as...as và not as/so...as.",
        rule: "as + adjective/adverb + as.",
        exampleA: "This test is as difficult as the previous one.",
        exampleB: "She does not speak as fluently as her sister.",
        pitfallA: "Dùng than trong so sánh bằng.",
        pitfallB: "Thiếu as ở một vế.",
        practiceA: "Hoàn thành 4 câu so sánh bằng.",
        practiceB: "Viết lại câu với not as...as.",
      },
      {
        name: "So sánh hơn",
        focus: "Dùng -er hoặc more theo độ dài tính từ.",
        rule: "comparative + than.",
        exampleA: "This route is shorter than the old one.",
        exampleB: "The new method is more effective.",
        pitfallA: "Dùng more easier.",
        pitfallB: "Bỏ than khi có đối tượng so sánh.",
        practiceA: "Chọn dạng comparative đúng.",
        practiceB: "Sửa 3 lỗi so sánh hơn.",
      },
      {
        name: "So sánh nhất",
        focus: "Dùng the + superlative trong một nhóm.",
        rule: "the + adj-est / the most + adjective.",
        exampleA: "Lan is the most careful student in the class.",
        exampleB: "This is the easiest question.",
        pitfallA: "Thiếu the.",
        pitfallB: "Không xác định phạm vi so sánh.",
        practiceA: "Đổi câu comparative sang superlative.",
        practiceB: "Viết 2 câu có in/of group.",
      },
      {
        name: "So sánh kép",
        focus: "Dùng the more..., the more... để diễn tả quan hệ tăng tiến.",
        rule: "The + comparative, the + comparative.",
        exampleA: "The more you practise, the better you become.",
        exampleB: "The earlier we start, the sooner we finish.",
        pitfallA: "Quên the ở một vế.",
        pitfallB: "Dùng tính từ nguyên mẫu thay comparative.",
        practiceA: "Nối hai vế so sánh kép.",
        practiceB: "Viết lại 3 câu bằng double comparison.",
      },
      {
        name: "Viết lại câu so sánh",
        focus: "Biến đổi giữa no one, not as...as, comparative và superlative.",
        rule: "No one + comparative -> superlative.",
        exampleA: "No one is taller than Nam -> Nam is the tallest.",
        exampleB: "This book is not as interesting as that one -> That book is more interesting.",
        pitfallA: "Đổi sai chiều nghĩa.",
        pitfallB: "Giữ nguyên tính từ không phù hợp.",
        practiceA: "Làm 5 câu sentence transformation.",
        practiceB: "Giải thích logic so sánh trong từng câu.",
      },
    ],
  },
  {
    id: "slide-conditionals",
    topic: "Câu điều kiện",
    count: "26",
    structure: "Loại 1 -> Loại 2 -> Loại 3 -> Đảo ngữ",
    style: "Tối giản (Học thuật)",
    notes: "Nhấn mạnh công thức và chuyển đổi câu điều kiện.",
    chapters: [
      {
        name: "Câu điều kiện loại 1",
        focus: "Diễn tả điều kiện có thể xảy ra ở hiện tại hoặc tương lai.",
        rule: "If + present simple, will/can/may + V.",
        exampleA: "If it rains, we will stay at home.",
        exampleB: "If you study hard, you can pass.",
        pitfallA: "Dùng will trong mệnh đề if.",
        pitfallB: "Nhầm với giả định loại 2.",
        practiceA: "Điền dạng đúng trong 4 câu loại 1.",
        practiceB: "Viết 2 câu điều kiện thực tế.",
      },
      {
        name: "Câu điều kiện loại 2",
        focus: "Diễn tả điều kiện trái với hiện tại.",
        rule: "If + past simple, would/could + V.",
        exampleA: "If I had more time, I would join the club.",
        exampleB: "If she were here, she could help us.",
        pitfallA: "Dùng present simple trong mệnh đề if.",
        pitfallB: "Quên would ở mệnh đề chính.",
        practiceA: "Chuyển tình huống hiện tại sang loại 2.",
        practiceB: "Hoàn thành 4 câu giả định.",
      },
      {
        name: "Câu điều kiện loại 3",
        focus: "Diễn tả điều kiện trái với quá khứ.",
        rule: "If + past perfect, would have + V3.",
        exampleA: "If he had revised, he would have passed.",
        exampleB: "If they had left earlier, they would have arrived on time.",
        pitfallA: "Thiếu have trong would have V3.",
        pitfallB: "Dùng V2 thay vì V3.",
        practiceA: "Viết lại câu nguyên nhân-kết quả quá khứ.",
        practiceB: "Sửa lỗi trong câu loại 3.",
      },
      {
        name: "Câu điều kiện hỗn hợp",
        focus: "Kết nối nguyên nhân quá khứ với kết quả hiện tại.",
        rule: "If + past perfect, would + V now.",
        exampleA: "If she had slept earlier, she would not be tired now.",
        exampleB: "If I had taken that course, I would know more now.",
        pitfallA: "Không xác định hai mốc thời gian.",
        pitfallB: "Dùng would have cho kết quả hiện tại.",
        practiceA: "Phân tích mốc thời gian trong 3 câu.",
        practiceB: "Viết 2 câu mixed conditional.",
      },
      {
        name: "Đảo ngữ câu điều kiện",
        focus: "Bỏ if và đảo should/were/had lên đầu câu.",
        rule: "Should + S + V; Were + S + to V; Had + S + V3.",
        exampleA: "Had I known the answer, I would have told you.",
        exampleB: "Were he here, he would solve the problem.",
        pitfallA: "Giữ if sau khi đảo.",
        pitfallB: "Đảo sai trợ động từ.",
        practiceA: "Đổi 5 câu if sang inversion.",
        practiceB: "Chọn dạng đảo ngữ đúng.",
      },
    ],
  },
  {
    id: "slide-modal-verbs",
    topic: "Modal Verbs",
    count: "30",
    structure: "Modal hiện tại -> Modal perfect -> Modal passive",
    style: "Vui tươi (Thân thiện)",
    notes: "Phân biệt must have V3, should have V3 và may/might have V3 theo ngữ cảnh câu.",
    routeLines: [
      "Track 1: Modal Verbs In The Present\nKnowledge: Tập trung vào cách dùng can, could, must, have to, should và ought to trong câu hiện tại — phân biệt rõ ability, obligation, advice và permission để chọn đúng modal theo ngữ cảnh mà không nhầm lẫn giữa các loại.\nExample: You must wear a helmet (obligation) và You should review your notes (advice) là hai mẫu giúp phân biệt mức độ bắt buộc và lời khuyên; Could you explain this rule? là cách xin phép lịch sự hơn Can you.\nNote: Tuyệt đối không thêm to ngay sau modal, không viết must to go hay should to study; luôn xác định modal đang mang nghĩa gì trước khi đặt vào câu để tránh chọn nhầm giữa must not và do not have to.",
      "Track 2: Modal Perfect And Modal Passive\nKnowledge: Tập trung vào cấu trúc modal + have + V3 để nói về quá khứ và modal + be + V3 để nói về điều được/nên thực hiện — hai dạng này thường xuất hiện cùng nhau trong bài suy luận và lỗi sai.\nExample: He must have forgotten the meeting là suy luận quá khứ chắc chắn; You should have checked là tiếc nuối quá khứ; The task should be completed today là modal passive chuẩn với be + V3.\nNote: Không viết must had V3 hay should been V3; luôn kiểm tra xem câu đang nói về quá khứ hay hiện tại để chọn đúng giữa must have V3 và must be V3 cho câu passive.",
    ],
    chapters: [
      {
        name: "Can, could và ability",
        focus: "Can/could diễn tả khả năng, năng lực hoặc sự cho phép tùy ngữ cảnh — can dùng hiện tại, could dùng quá khứ hoặc yêu cầu lịch sự.",
        rule: "can/could + bare infinitive (không có to); could lịch sự hơn can trong câu đề nghị.",
        exampleA: "She can solve the problem quickly because she practises every day.",
        exampleB: "Could you explain this rule again? It is more polite than Can you.",
        detailedExample: "Ví dụ phân tích: Câu 'She can solve the problem quickly' dùng can để nói về khả năng hiện tại của cô ấy. Câu 'Could you explain this rule again?' dùng could để xin phép hoặc yêu cầu một cách lịch sự hơn — không phải vì đây là quá khứ mà vì could làm giảm tông câu yêu cầu. Khi muốn nói về khả năng trong quá khứ, ta dùng could + V: 'When I was young, I could run very fast.'",
        pitfallA: "Thêm to sau modal: viết *she can to solve* thay vì she can solve.",
        pitfallB: "Nhầm ability với deduction: viết *she can be tired* (suy luận) trong khi đúng phải là *she must be tired*.",
        pitfallADetail: "Lỗi phổ biến nhất là chèn to giữa modal và động từ chính: *You can to go now*, *She could to explain it*. Modal verbs (can, could, must, should, may, might, will, would) luôn đi kèm bare infinitive — tức là động từ nguyên mẫu không có to. Chỉ có ought to là ngoại lệ duy nhất trong nhóm semi-modal.",
        pitfallBDetail: "Nhiều học sinh viết *She can be the winner* để diễn tả suy luận, nhưng đây là lỗi về chức năng của modal: can không dùng để suy luận về hiện tại. Dùng must be cho suy luận chắc chắn, may be / might be cho suy luận không chắc, và can be chỉ xuất hiện trong câu phủ định hoặc câu hỏi như *Can she really be that tired?*",
        pitfallFix: "Cách tự kiểm tra: sau modal không bao giờ có to (trừ ought to); trước khi chọn can, hỏi xem câu đang nói về khả năng hay suy luận — nếu suy luận dùng must/may/might thay vì can.",
        practiceA: "Chọn can hoặc could phù hợp cho từng câu theo ngữ cảnh hiện tại, quá khứ hoặc yêu cầu lịch sự.",
        practiceB: "Viết 2 câu: một câu dùng can nói về khả năng và một câu dùng could để đề nghị lịch sự.",
        detailedPractice: "Bài luyện tập: Câu 1: 'When she was five, she ________ (can/could) already read fluently.' Câu 2: '________ (Can/Could) you help me carry this box?' — chọn dạng lịch sự hơn. Câu 3: Phân tích câu 'He can swim across the river' và giải thích vì sao không thêm to sau can.",
      },
      {
        name: "Must và have to",
        focus: "Must diễn tả bắt buộc từ người nói hoặc suy luận chắc chắn; have to thiên về yêu cầu khách quan, quy định bên ngoài không phụ thuộc ý kiến người nói.",
        rule: "must + V (nội tâm/suy luận); have/has to + V (quy định ngoại cảnh); must not = cấm; do not have to = không cần thiết.",
        exampleA: "You must wear a helmet. (quy định bạo lực cá nhân hoặc suy luận: He must be tired.)",
        exampleB: "She has to submit the form today because the deadline is set by the school.",
        detailedExample: "Ví dụ phân tích: 'You must study harder' — người nói (giáo viên, cha mẹ) đang áp đặt ý muốn của mình. 'You have to show your ID at the gate' — quy định bảo vệ, không phải ý kiến cá nhân. 'He must be exhausted after the marathon' — must dùng để suy luận chắc chắn ở hiện tại, không phải obligation. Phân biệt must not (cấm tuyệt đối: You must not use your phone during the exam) và do not have to (không bắt buộc: You do not have to wear a tie).",
        pitfallA: "Nhầm must not với do not have to: viết *You must not bring a dictionary* khi muốn nói không cần mang (thực ra là không bị cấm).",
        pitfallB: "Không phân biệt obligation và deduction: dùng must để nói về quy định bên ngoài thay vì have to, hoặc dùng have to để suy luận thay vì must.",
        pitfallADetail: "Must not mang nghĩa cấm hoàn toàn: *You must not cheat in the exam* = nghiêm cấm gian lận. Do not have to mang nghĩa không bắt buộc, tùy chọn: *You do not have to attend the extra class* = không bắt buộc dự, nếu muốn thì đến. Nhầm hai cái này dẫn đến nghĩa ngược hoàn toàn — đây là bẫy rất phổ biến trong đề THPT.",
        pitfallBDetail: "Must để diễn tả suy luận hiện tại chắc chắn: *She must be at home now* (đèn sáng, xe còn đó). Have to không dùng cho suy luận — không viết *She has to be tired* mang nghĩa suy luận. Ngược lại, khi nói về quy định trường học, công ty thì dùng have to tự nhiên hơn must vì đó là quy định khách quan, không phải ý muốn chủ quan của người nói.",
        pitfallFix: "Cách phân biệt nhanh: must = ý tôi muốn bạn làm hoặc tôi tin chắc điều đó đúng; have to = quy định không phụ thuộc tôi; must not = tôi cấm; do not have to = tôi không bắt buộc bạn.",
        practiceA: "Phân loại 6 câu: câu nào dùng must (obligation/deduction), câu nào dùng have to (external rule), câu nào dùng must not, câu nào dùng do not have to.",
        practiceB: "Viết lại câu: 'It is compulsory to wear uniform at school' dùng have to và 'I am certain she is the winner' dùng must.",
        detailedPractice: "Bài luyện tập: 1. 'You ________ (must not/do not have to) park here — it is a fire exit.' 2. 'Students ________ (must/have to) submit homework by Friday according to school policy.' 3. Phân tích câu 'The lights are on; someone must be home' và giải thích chức năng của must trong câu này.",
      },
      {
        name: "Should và ought to",
        focus: "Should và ought to đều đưa lời khuyên hoặc diễn tả kỳ vọng — should phổ biến hơn trong văn nói; ought to mang tính trang trọng hơn nhưng dùng ít hơn trong tiếng Anh hiện đại.",
        rule: "should/ought to + V (lời khuyên, kỳ vọng); should not + V (không nên).",
        exampleA: "You should review your notes before the test to avoid forgetting key rules.",
        exampleB: "Students ought to ask questions when they are confused instead of guessing.",
        detailedExample: "Ví dụ phân tích: 'You should eat more vegetables' — lời khuyên nhẹ nhàng, không bắt buộc. 'You ought to apologise' — khuyên nhưng có hàm ý trách móc về mặt đạo đức. So sánh với must: 'You must submit the form' (obligation) vs 'You should submit the form' (suggestion). Should còn dùng trong câu điều kiện: 'Should you need help, call me' = cấu trúc đảo ngữ câu điều kiện loại 1 trang trọng.",
        pitfallA: "Thêm to sau should: viết *you should to study* thay vì you should study.",
        pitfallB: "Nhầm lời khuyên với bắt buộc mạnh: dùng should khi tình huống cần must, ví dụ *You should not cheat* khi muốn nói cấm tuyệt đối.",
        pitfallADetail: "Should là modal verb nên không bao giờ có to sau nó: *She should to practise more* là sai. Ought to là ngoại lệ — ought PHẢI có to: *She ought practise* là sai, đúng là *She ought to practise*. Đây là điểm dễ nhầm khi học sinh học ought to rồi áp dụng nhầm to cho should.",
        pitfallBDetail: "Should không đủ mạnh để diễn tả cấm đoán nghiêm túc. *You should not cheat* nghĩa là tôi không khuyên bạn gian lận — nghe còn nhẹ nhàng. Trong ngữ cảnh kiểm tra nghiêm túc, dùng *must not* hoặc *are not allowed to*. Ngược lại, dùng must khi muốn khuyên rất mạnh: *You really must see a doctor* nghe cấp bách hơn *You should see a doctor*.",
        pitfallFix: "Quy tắc nhớ nhanh: should = tôi nghĩ đây là ý hay cho bạn; must = tôi cần bạn làm điều này; should not = không nên; must not = không được phép. Và never thêm to sau should.",
        practiceA: "Viết lời khuyên cho 3 tình huống: bạn hay quên từ vựng, bạn mắc lỗi ngữ pháp, bạn sợ nói tiếng Anh — dùng should hoặc ought to.",
        practiceB: "Sửa lỗi trong 4 câu có should: tìm câu dùng sai should/must, câu thêm to sai, câu nhầm should not với must not.",
        detailedPractice: "Bài luyện tập: 1. Sửa lỗi: 'You should to submit the assignment before Friday.' 2. Chọn should hoặc must: 'Students ________ not use phones during class — it is strictly forbidden.' 3. Viết lại dùng ought to: 'I think you need to apologise to her.'",
      },
      {
        name: "Modal perfect",
        focus: "Modal perfect (modal + have + V3) diễn tả suy luận về quá khứ, tiếc nuối về điều không làm, hoặc khả năng đã xảy ra — must/can't have V3 cho suy luận; should/could have V3 cho tiếc nuối.",
        rule: "must have V3 (suy luận chắc chắn quá khứ); should have V3 (tiếc nuối/chỉ trích quá khứ); could have V3 (khả năng đã có nhưng không làm); may/might have V3 (suy luận không chắc quá khứ).",
        exampleA: "He must have forgotten the meeting — his phone was off all morning.",
        exampleB: "You should have checked the answer before submitting the test.",
        detailedExample: "Ví dụ phân tích: 'She must have left early' — tôi suy luận chắc chắn rằng cô ấy đã đi sớm (xe đã không còn). 'You should have told me earlier' — tiếc nuối hoặc chỉ trích nhẹ vì bạn đã không làm điều đó trong quá khứ. 'He could have passed if he had studied harder' — anh ấy có khả năng đỗ nhưng đã không làm được. 'They might have missed the bus' — có thể họ đã lỡ xe, nhưng tôi không chắc.",
        pitfallA: "Viết must had V3 hoặc should had V3 thay vì must have V3, should have V3.",
        pitfallB: "Dùng must have V3 khi ngữ cảnh cần may/might have V3 (không chắc, chỉ là có thể).",
        pitfallADetail: "Sau modal (must, should, could, may, might) LUÔN dùng have + V3, không bao giờ dùng had: *He must had forgotten* là sai hoàn toàn. Lỗi này xảy ra khi học sinh nhớ 'quá khứ = had' rồi áp vào modal perfect. Nhưng modal perfect đã có have cố định, không thay đổi theo thì: must have forgotten, should have told, could have passed.",
        pitfallBDetail: "Must have V3 chỉ dùng khi người nói TIN CHẮC: 'The lights are off — they must have gone to bed.' Nếu chỉ đoán thôi, dùng may/might have: 'I am not sure — they might have gone out.' Dùng nhầm must have cho tình huống không chắc làm câu nghe quá tự tin so với thực tế.",
        pitfallFix: "Bảng nhớ nhanh: must have V3 = chắc chắn đã; can't have V3 = không thể đã; should have V3 = đáng lẽ phải; could have V3 = có thể đã nhưng không; may/might have V3 = có thể đã (không chắc). Không dùng had sau bất kỳ modal nào trong nhóm này.",
        practiceA: "Phân biệt must have và should have: với 4 tình huống, chọn đúng modal perfect và giải thích lý do.",
        practiceB: "Hoàn thành 5 câu modal perfect với must, should, could, may, might — mỗi loại một câu.",
        detailedPractice: "Bài luyện tập: 1. 'She did not come to class. She ________ (must/might) have been sick.' — chọn cái nào nếu bạn chắc chắn, cái nào nếu bạn không chắc. 2. Sửa lỗi: 'You should had told me the truth from the beginning.' 3. Viết câu tiếc nuối: bạn không ôn bài trước kỳ thi — dùng should have V3.",
      },
      {
        name: "Modal passive",
        focus: "Modal passive kết hợp modal verb với bị động — dùng khi muốn nói điều gì nên/cần/có thể được thực hiện mà không cần nêu người thực hiện.",
        rule: "modal + be + V3/ed (hiện tại/tương lai); modal + have been + V3 (quá khứ); không bao giờ dùng V-ing hoặc been V-ing sau modal trong cấu trúc passive.",
        exampleA: "The task should be completed today. (ai đó phải hoàn thành — không cần nêu tên)",
        exampleB: "The result may be announced tomorrow by the committee.",
        detailedExample: "Ví dụ phân tích: 'This form must be submitted before Friday' — modal passive hiện tại, nhấn vào việc form phải được nộp chứ không cần biết ai nộp. 'The bridge should have been repaired last year' — modal perfect passive, tiếc nuối về việc cầu đáng lẽ đã được sửa. 'The documents may be reviewed again' — may be V3 diễn tả khả năng thụ động. So sánh: active *They should complete the task* vs passive *The task should be completed* — cả hai đúng nhưng nhấn vào đối tượng khác nhau.",
        pitfallA: "Quên be: viết *the task should completed* thay vì should be completed.",
        pitfallB: "Dùng V-ing sau be: viết *the task should be completing* thay vì should be completed.",
        pitfallADetail: "Cấu trúc modal passive BẮT BUỘC có be giữa modal và V3: modal + be + V3. Bỏ be là lỗi cấu trúc nghiêm trọng: *The form must submitted* là sai. Học sinh hay bỏ be vì nghĩ modal đã đủ để tạo bị động, nhưng không phải — be là thành phần không thể thiếu trong passive voice.",
        pitfallBDetail: "Sau modal + be, động từ phải ở dạng V3 (past participle), không phải V-ing: *The report should be writing* là sai, đúng là *The report should be written*. V-ing dùng trong continuous passive (is/are being + V3), không phải modal passive. Nhầm hai dạng này dẫn đến câu sai nghĩa và cấu trúc.",
        pitfallFix: "Công thức kiểm tra: modal + be + V3. Ba thành phần này không thể thiếu một cái nào. Nếu câu passive có thêm have (quá khứ): modal + have been + V3 — vẫn giữ be, chỉ thêm have vào trước.",
        practiceA: "Chuyển 4 câu chủ động có modal sang modal passive: should, must, can, may.",
        practiceB: "Chọn modal passive phù hợp nhất cho từng ngữ cảnh: obligation, advice, possibility, prohibition.",
        detailedPractice: "Bài luyện tập: 1. Chuyển sang passive: 'Someone must repair the roof before the rainy season.' 2. Sửa lỗi: 'The essay should be writing in formal English.' 3. Viết câu dùng modal perfect passive: đáng lẽ cuộc họp đã phải được thông báo sớm hơn — dùng should have been + V3.",
      },
    ],
  },
];

const EXTRA_SLIDE_TOPIC_LIST = [
  "Hiện tại hoàn thành và hiện tại hoàn thành tiếp diễn",
  "Câu ước và giả định",
  "Mệnh đề danh ngữ",
  "Mệnh đề trạng ngữ chỉ thời gian và điều kiện",
  "Liên từ và cụm nối ý",
  "Cấu trúc đảo ngữ trong tiếng Anh",
  "Gerund và Infinitive",
  "Cụm động từ theo chủ đề học tập",
  "Prepositions and Collocations",
  "Mạo từ và từ hạn định",
  "Đại từ và từ thay thế",
  "Câu hỏi đuôi",
  "Cấu trúc hỏi đáp gián tiếp",
  "Word Stress trong đề THPT",
  "Phát âm đuôi -ed và -s/-es",
  "Nguyên âm dễ nhầm lẫn",
  "Chức năng giao tiếp thường gặp",
  "Viết lại câu đồng nghĩa",
  "Sửa lỗi sai ngữ pháp",
  "Kỹ năng đọc tìm ý chính",
  "Kỹ năng đọc suy luận",
  "Kỹ năng đọc từ đồng nghĩa trái nghĩa",
  "Kỹ năng điền từ vào đoạn văn",
  "Kỹ năng paraphrase trong reading",
  "Viết đoạn văn opinion",
  "Viết đoạn cause and effect",
  "Viết đoạn advantages and disadvantages",
  "Mô tả biểu đồ và số liệu",
  "Từ vựng chủ đề Giáo dục",
  "Từ vựng chủ đề Môi trường",
  "Từ vựng chủ đề Công nghệ",
  "Từ vựng chủ đề Sức khỏe",
  "Từ vựng chủ đề Nghề nghiệp",
  "Từ vựng chủ đề Văn hóa và lễ hội",
  "Từ vựng chủ đề Du lịch",
  "Từ vựng chủ đề Đô thị hóa",
  "Mixed Grammar Review cho THPTQG",
  "Chiến lược làm bài ngữ pháp",
  "Chiến lược làm bài đọc hiểu",
  "Tổng ôn 50 câu then chốt trước kỳ thi",
];

const EXTRA_SLIDE_STRUCTURE_OPTIONS = [
  "Khái niệm cốt lõi -> Dấu hiệu nhận diện -> Luyện tập theo ngữ cảnh",
  "Nền tảng kiến thức -> Công thức trọng tâm -> Bài tập vận dụng",
  "Nhận diện dạng bài -> Mẫu trả lời nhanh -> Tự kiểm tra đáp án",
  "Lý thuyết tinh gọn -> Ví dụ điển hình -> Luyện đề mục tiêu",
  "Tổng quan chủ đề -> Checklist lỗi sai -> Bài tập thực chiến",
];

const EXTRA_SLIDE_NOTES_OPTIONS = [
  "Giữ ví dụ ngắn gọn, bám sát ngữ cảnh thường xuất hiện trong đề THPT.",
  "Ưu tiên bài tập nhận diện nhanh rồi mới chuyển sang câu vận dụng.",
  "Mỗi phần đều có checklist để học sinh tự soát lỗi trước khi nộp bài.",
  "Kết thúc mỗi track bằng một câu tự tạo để ghi nhớ cấu trúc lâu hơn.",
  "Tập trung vào các lỗi sai học sinh lớp 12 thường gặp khi làm trắc nghiệm.",
];

const EXTRA_SLIDE_STYLE_OPTIONS = [
  "Chuyên nghiệp (đa sắc)",
  "Tối giản (Học thuật)",
  "Vui tươi (Thân thiện)",
  "Vũ trụ sáng (Trẻ trung)",
  "Vũ trụ tối (Huyền bí)",
  "Biển cả",
  "Comic",
];

const EXTRA_SLIDE_COUNT_OPTIONS = ["10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30"];

const AUTO_CHAPTER_TEMPLATES = [
  {
    name: "Kiến thức cơ bản",
    focusStem: "Hiểu rõ định nghĩa và bản chất của điểm kiến thức",
    ruleStem: "Xác định đúng phạm vi, chức năng ngữ pháp và ngữ nghĩa của điểm kiến thức này",
    practiceStem: "Tóm tắt lại định nghĩa và vai trò của điểm kiến thức",
  },
  {
    name: "Dấu hiệu nhận diện",
    focusStem: "Nhận ra tín hiệu từ khóa trong câu",
    ruleStem: "Đối chiếu vị trí từ cần điền với cấu trúc câu và ngữ cảnh xung quanh",
    practiceStem: "Lập bảng nhận diện nhanh theo từng dạng câu hỏi thường gặp",
  },
  {
    name: "Cấu trúc trọng tâm",
    focusStem: "Chốt công thức và mẫu câu cốt lõi",
    ruleStem: "Áp dụng đúng trật tự cấu trúc trong từng dạng bài viết lại câu và chọn đáp án",
    practiceStem: "Viết lại câu theo mẫu để ghi nhớ sâu hơn và tự kiểm tra",
  },
  {
    name: "Tránh lỗi phổ biến",
    focusStem: "Nhận diện và tránh các lỗi sai học sinh hay mắc nhất",
    ruleStem: "Soát lại công thức và logic nghĩa trước khi chốt đáp án cuối cùng",
    practiceStem: "Sửa lỗi từng bước, giải thích lý do sai và cách sửa đúng",
  },
  {
    name: "Luyện tập vận dụng",
    focusStem: "Rèn kỹ năng làm bài qua câu hỏi gần đề thi thực tế",
    ruleStem: "Kết hợp nhận diện dạng câu và kiểm tra ngữ cảnh nghĩa trước khi chọn đáp án",
    practiceStem: "Tự tạo thêm câu mới cùng chủ điểm rồi kiểm tra lại theo công thức đã học",
  },
  {
    name: "Vận dụng trong đề thi",
    focusStem: "Chiến lược làm bài nhanh và chính xác trong đề THPTQG",
    ruleStem: "Đọc kỹ đầu bài, xác định dạng câu hỏi rồi áp dụng đúng công thức đã học",
    practiceStem: "Làm nhanh 3 câu kiểu đề thi rồi tự chấm điểm và rút kinh nghiệm",
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
    rule: `${template.ruleStem} Áp dụng cho chủ đề đã chọn.`,
    exampleA: `Ví dụ ${index + 1}: Chọn đáp án đúng trong ngữ cảnh.`,
    exampleB: `Ví dụ ${index + 2}: Viết lại một câu ngắn kiểm tra hiểu bài.`,
    pitfallA: `Lỗi ${index + 1}: Chọn theo cảm tính, bỏ qua dấu hiệu trong đề.`,
    pitfallB: `Lỗi ${index + 2}: Đọc vội, không nắm nghĩa tổng thể đoạn.`,
    practiceA: `Bài ${index + 1}: ${template.practiceStem} (3 câu).`,
    practiceB: `Bài ${index + 2}: Giải thích vì sao đáp án đúng.`,
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

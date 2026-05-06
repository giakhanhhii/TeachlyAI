function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createSlide(id, title, bullets) {
  return {
    id,
    title,
    bullets: bullets.map((item) => String(item || "").trim()).filter(Boolean),
  };
}

function splitStructure(structure) {
  return String(structure || "")
    .split("->")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDefaultSlideIndexes(count) {
  const want = Math.max(10, Math.min(30, Number(count) || 10));
  if (want >= 30) return Array.from({ length: 30 }, (_, index) => index + 1);
  const picked = new Set([1, 2, 3, 30]);
  for (let i = 1; picked.size < want && i <= 28; i += 1) {
    const index = 3 + Math.round((i * 26) / Math.max(1, want - 3));
    picked.add(Math.max(4, Math.min(29, index)));
  }
  return Array.from(picked).sort((a, b) => a - b).slice(0, want);
}

function pickSlidesByIndexes(slides, indexes) {
  const picked = indexes.map((index) => slides[index - 1]).filter(Boolean);
  return picked.length ? picked : slides.slice();
}

function buildDetailedExampleLine(chapter) {
  const detailedExample = String(chapter?.detailedExample || "").trim();
  if (detailedExample) return detailedExample;
  const sentenceA = String(chapter?.exampleA || "").trim();
  if (sentenceA) return `Ví dụ A: ${sentenceA}`;
  const sentenceB = String(chapter?.exampleB || "").trim();
  if (sentenceB) return `Ví dụ A: ${sentenceB}`;
  return "";
}

function buildSecondExampleLine(chapter) {
  const sentenceB = String(chapter?.exampleB || "").trim();
  if (sentenceB) return `Ví dụ B: ${sentenceB}`;
  const name = String(chapter?.name || "").toLowerCase().trim();
  if (name) return `Ví dụ B: học sinh cần đối chiếu thêm với mẫu ${name}.`;
  return "";
}

function buildDetailedExplanationLine(chapter) {
  const focus = String(chapter?.focus || "").trim();
  const rule = String(chapter?.rule || "").trim();
  if (focus && rule) {
    return `Phân tích: ${focus} Quy tắc cần áp dụng là ${rule}`;
  }
  return focus || rule || "";
}

function buildPracticeTaskLine(chapter) {
  const detailedPractice = String(chapter?.detailedPractice || "").trim();
  if (detailedPractice) return detailedPractice;
  const practiceA = String(chapter?.practiceA || "").trim();
  const practiceB = String(chapter?.practiceB || "").trim();
  if (practiceA && practiceB) {
    return `Bài luyện tập: ${practiceA} Sau đó, ${practiceB.toLowerCase()}.`;
  }
  return practiceA || practiceB || "";
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

function buildFormulaSummaryLines(chapter) {
  const name = String(chapter?.name || "").trim();
  const focus = String(chapter?.focus || "").trim();
  const rule = String(chapter?.rule || "").trim();
  const exampleA = String(chapter?.exampleA || "").trim();
  const exampleB = String(chapter?.exampleB || "").trim();
  const practiceA = String(chapter?.practiceA || "").trim();
  const practiceB = String(chapter?.practiceB || "").trim();
  const pitfallA = String(chapter?.pitfallA || "").trim();
  const pitfallB = String(chapter?.pitfallB || "").trim();

  const lineA = name && rule
    ? `${name}: ${rule}`
    : rule || name;

  const lineB = focus
    ? `Phân biệt nhanh: ${focus}`
    : "";

  const lineC = exampleA && exampleB
    ? `Ví dụ tổng quát: ${exampleA} ${exampleB}`
    : exampleA
      ? `Ví dụ tổng quát: ${exampleA}`
      : exampleB
        ? `Ví dụ tổng quát: ${exampleB}`
        : "";

  const lineD = practiceA
    ? `Gợi ý vận dụng: ${practiceA}`
    : focus
      ? `Gợi ý vận dụng: áp dụng đúng cấu trúc này vào câu hỏi cùng chủ điểm.`
      : "";

  const lineE = exampleB
    ? `Ví dụ bổ sung: ${exampleB}`
    : practiceB
      ? `Bước luyện nhanh: ${practiceB}`
      : "";

  const lineF = practiceA && practiceB
    ? `Luyện theo bước: ${practiceA} Sau đó, ${practiceB.toLowerCase()}.`
    : practiceB
      ? `Luyện theo bước: ${practiceB}`
      : "";

  const lineG = pitfallA && pitfallB
    ? `Lưu ý tránh lỗi: ${pitfallA} Đồng thời, ${pitfallB.toLowerCase()}.`
    : pitfallA
      ? `Lưu ý tránh lỗi: ${pitfallA}`
      : pitfallB
        ? `Lưu ý tránh lỗi: ${pitfallB}`
        : "";

  return [lineA, lineB, lineC, lineD, lineE, lineF, lineG].filter(Boolean);
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

function buildStructureRouteLine(part, index, preset) {
  const cleanPart = String(part || "").trim();
  const topic = String(preset?.topic || "").trim();
  const notes = String(preset?.notes || "").trim();
  const chapter = preset?.chapters?.[index];
  const chapterFocus = String(chapter?.focus || "").trim();
  const chapterExample = String(chapter?.exampleA || "").trim();

  const pieces = [`Mạch ${index + 1}: ${cleanPart}`];
  if (chapterFocus) pieces.push(`trọng tâm là ${chapterFocus}`);
  if (chapterExample) pieces.push(`ví dụ neo nhớ ${chapterExample}`);
  else if (topic) pieces.push(`ví dụ và bài tập đều bám đúng phạm vi ${topic}`);
  if (notes) pieces.push(`lưu ý ${notes}`);
  return pieces.join(", ");
}

function buildChapterSlides(preset, chapter, chapterIndex) {
  const base = chapterIndex * 5 + 5;
  const tag = `${preset.id}-${String(base).padStart(2, "0")}`;
  return [
    createSlide(tag, `${chapter.name} - Khái niệm`, [
      buildConceptLine(chapter),
      buildConceptSupportLine(chapter),
      chapter.rule,
      buildConceptExampleLine(chapter),
      `Ghi chú triển khai: ${preset.notes}`,
    ]),
    createSlide(
      `${preset.id}-${String(base + 1).padStart(2, "0")}`,
      `${chapter.name} - Công thức`,
      buildFormulaSummaryLines(chapter),
    ),
    createSlide(`${preset.id}-${String(base + 2).padStart(2, "0")}`, `${chapter.name} - Ví dụ`, [
      buildDetailedExampleLine(chapter),
      buildSecondExampleLine(chapter),
      buildDetailedExplanationLine(chapter),
      `Yêu cầu: giải thích vì sao các từ/cấu trúc trên đúng với ${chapter.name.toLowerCase()}.`,
    ]),
    createSlide(`${preset.id}-${String(base + 3).padStart(2, "0")}`, `${chapter.name} - Lỗi thường gặp`, [
      buildPitfallLine(chapter, "pitfallA"),
      buildPitfallLine(chapter, "pitfallB"),
      buildPitfallFixLine(chapter),
    ]),
    createSlide(`${preset.id}-${String(base + 4).padStart(2, "0")}`, `${chapter.name} - Luyện tập`, [
      buildPracticeTaskLine(chapter),
      buildPracticeGuideLine(chapter, preset),
      `Yêu cầu thực hiện: viết đáp án đầy đủ và nêu lý do chọn dạng đúng của ${chapter.name.toLowerCase()}.`,
    ]),
  ];
}

function buildDeckFromBlueprint(preset) {
  const structureParts = splitStructure(preset.structure);
  const chapterNames = preset.chapters.map((chapter) => chapter.name);
  const chapterRules = preset.chapters.slice(0, 3).map((chapter) => chapter.rule);
  const chapterExamples = preset.chapters.slice(0, 3).map((chapter) => chapter.exampleA);
  const slides = [
    createSlide(`${preset.id}-01`, `${preset.topic} - Tổng quan`, [
      ...preset.chapters.slice(0, 3).map((chapter) => `${chapter.name}: ${chapter.focus}`),
      `Cấu trúc bài học: ${preset.structure}`,
    ]),
    createSlide(`${preset.id}-02`, `${preset.topic} - Mục tiêu`, [
      `Nhận diện đúng các phần: ${chapterNames.slice(0, 3).join(", ")}.`,
      `Thuộc công thức trọng tâm: ${chapterRules.join(" | ")}.`,
      `Luyện theo yêu cầu: ${preset.notes}`,
    ]),
    createSlide(`${preset.id}-03`, `${preset.topic} - Lộ trình kiến thức`, [
      ...structureParts.map((part, index) => buildStructureRouteLine(part, index, preset)),
      `Ghi nhớ chung: mỗi mạch đều dùng ví dụ và bài tập đúng phạm vi ${preset.topic}`,
    ]),
    createSlide(`${preset.id}-04`, `${preset.topic} - Khung ghi nhớ nhanh`, buildQuickMemoryBullets(preset, chapterRules, chapterExamples)),
  ];

  preset.chapters.forEach((chapter, chapterIndex) => {
    slides.push(...buildChapterSlides(preset, chapter, chapterIndex));
  });

  slides.push(createSlide(`${preset.id}-30`, "Tổng kết", [
    `Ôn lại các phần chính: ${chapterNames.join(", ")}.`,
    `Nhắc lại công thức và ví dụ then chốt: ${chapterExamples.join(" | ")}.`,
    `Bài tập sau giờ học vẫn bám đúng cấu trúc: ${preset.structure}.`,
  ]));

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
    chapters: [
      {
        name: "Bị động cơ bản",
        focus: "Đưa tân ngữ của câu chủ động lên làm chủ ngữ câu bị động.",
        rule: "S + be + V3/ed + by agent.",
        exampleA: "They clean the room every day -> The room is cleaned every day.",
        exampleB: "She wrote the report -> The report was written.",
        pitfallA: "Thiếu be trong câu bị động.",
        pitfallB: "Dùng V2 thay vì V3.",
        practiceA: "Chuyển 3 câu sang bị động cơ bản.",
        practiceB: "Xác định tân ngữ trong câu chủ động.",
      },
      {
        name: "Bị động theo thì",
        focus: "Động từ be thay đổi theo thì của câu gốc.",
        rule: "Present: is/am/are + V3; Past: was/were + V3; Perfect: has/have been + V3.",
        exampleA: "The letter has been sent.",
        exampleB: "The bridge was built in 2010.",
        pitfallA: "Không giữ đúng thì.",
        pitfallB: "Nhầm been với being.",
        practiceA: "Chọn dạng be đúng theo thì.",
        practiceB: "Viết lại 4 câu ở 4 thì khác nhau.",
      },
      {
        name: "Bị động với modal verbs",
        focus: "Modal verbs dùng chung một mẫu bị động.",
        rule: "modal + be + V3/ed.",
        exampleA: "The form must be submitted today.",
        exampleB: "The problem can be solved easily.",
        pitfallA: "Viết modal + V3 trực tiếp.",
        pitfallB: "Dùng been sau modal trong câu thường.",
        practiceA: "Hoàn thành câu với should/must/can be + V3.",
        practiceB: "Sửa lỗi modal passive.",
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
        focus: "Diễn tả việc nhờ hoặc để người khác làm cho mình.",
        rule: "have/get + object + V3/ed.",
        exampleA: "She had her hair cut.",
        exampleB: "We got the printer repaired.",
        pitfallA: "Nhầm với bị động thông thường.",
        pitfallB: "Đặt sai object.",
        practiceA: "Biến đổi 3 câu với have something done.",
        practiceB: "Phân biệt have somebody do và have something done.",
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
        focus: "Which dùng cho vật; that dùng trong mệnh đề xác định.",
        rule: "which/that + clause for things.",
        exampleA: "The book which I bought is useful.",
        exampleB: "This is the only answer that makes sense.",
        pitfallA: "Dùng that trong mệnh đề có dấu phẩy.",
        pitfallB: "Dùng which cho người trong câu thông thường.",
        practiceA: "Chọn which hoặc that.",
        practiceB: "Giải thích vì sao that không dùng sau dấu phẩy.",
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
    chapters: [
      {
        name: "Lùi thì",
        focus: "Động từ trong câu trực tiếp thường lùi một thì khi tường thuật.",
        rule: "present -> past; will -> would; can -> could.",
        exampleA: "\"I am tired\" -> He said he was tired.",
        exampleB: "\"I will call\" -> She said she would call.",
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
        focus: "Here, now, today, tomorrow thường đổi trong câu tường thuật.",
        rule: "now -> then; today -> that day; tomorrow -> the next day.",
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
        practiceA: "Viết lại 5 câu hỏi.",
        practiceB: "Sửa lỗi word order.",
      },
      {
        name: "Câu mệnh lệnh tường thuật",
        focus: "Dùng tell/ask/order/remind + object + to V hoặc not to V.",
        rule: "Please V -> asked/told somebody to V; Don't V -> told somebody not to V.",
        exampleA: "\"Open the door\" -> She told me to open the door.",
        exampleB: "\"Don't be late\" -> He told us not to be late.",
        pitfallA: "Dùng that-clause cho mệnh lệnh.",
        pitfallB: "Đặt not sai vị trí.",
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
    notes: "Phân biệt must have V3, should have V3 và may/might have V3.",
    chapters: [
      {
        name: "Can, could và ability",
        focus: "Can/could diễn tả khả năng, năng lực hoặc sự cho phép.",
        rule: "can/could + bare infinitive.",
        exampleA: "She can solve the problem quickly.",
        exampleB: "Could you explain this rule again?",
        pitfallA: "Dùng to sau modal.",
        pitfallB: "Nhầm ability với deduction.",
        practiceA: "Chọn can hoặc could theo ngữ cảnh.",
        practiceB: "Viết 2 câu xin phép lịch sự.",
      },
      {
        name: "Must và have to",
        focus: "Must diễn tả bắt buộc hoặc suy luận mạnh; have to thiên về yêu cầu khách quan.",
        rule: "must + V; have/has to + V.",
        exampleA: "You must wear a helmet.",
        exampleB: "She has to submit the form today.",
        pitfallA: "Nhầm must not với do not have to.",
        pitfallB: "Không phân biệt obligation và deduction.",
        practiceA: "Phân loại obligation và deduction.",
        practiceB: "Chọn must hoặc have to.",
      },
      {
        name: "Should và ought to",
        focus: "Dùng để đưa lời khuyên hoặc kỳ vọng.",
        rule: "should/ought to + V.",
        exampleA: "You should review your notes.",
        exampleB: "Students ought to ask questions.",
        pitfallA: "Dùng should to V.",
        pitfallB: "Nhầm lời khuyên với bắt buộc mạnh.",
        practiceA: "Viết lời khuyên cho 3 tình huống.",
        practiceB: "Sửa lỗi trong câu có should.",
      },
      {
        name: "Modal perfect",
        focus: "Diễn tả suy luận, tiếc nuối hoặc khả năng trong quá khứ.",
        rule: "modal + have + V3.",
        exampleA: "He must have forgotten the meeting.",
        exampleB: "You should have checked the answer.",
        pitfallA: "Viết must had V3.",
        pitfallB: "Không bám thời gian quá khứ.",
        practiceA: "Phân biệt must have và should have.",
        practiceB: "Hoàn thành 5 câu modal perfect.",
      },
      {
        name: "Modal passive",
        focus: "Dùng modal để nói điều nên/cần/có thể được thực hiện.",
        rule: "modal + be + V3.",
        exampleA: "The task should be completed today.",
        exampleB: "The result may be announced tomorrow.",
        pitfallA: "Quên be.",
        pitfallB: "Dùng V-ing sau be.",
        practiceA: "Chuyển 4 câu sang modal passive.",
        practiceB: "Chọn modal passive phù hợp.",
      },
    ],
  },
];

export const DIRECT_SLIDE_PRESETS = RAW_SLIDE_PRESETS.map((preset) => {
  const slides = buildDeckFromBlueprint(preset);
  const defaultSlideIndexes = buildDefaultSlideIndexes(preset.count);
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
    || null
  );
}

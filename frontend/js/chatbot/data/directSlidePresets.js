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
    bullets: Array.isArray(bullets) ? bullets.map((item) => String(item || "").trim()).filter(Boolean) : [],
  };
}

function splitStructure(structure) {
  return String(structure || "")
    .split("->")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDefaultSlideIndexes(count) {
  const want = Math.max(1, Math.min(30, Number(count) || 10));
  if (want >= 30) return Array.from({ length: 30 }, (_, index) => index + 1);
  if (want === 1) return [1];
  const picked = new Set([1, 30]);
  for (let i = 1; i < want - 1; i += 1) {
    const index = 1 + Math.round((i * 28) / Math.max(1, want - 1));
    picked.add(Math.max(2, Math.min(29, index)));
  }
  return Array.from(picked).sort((a, b) => a - b).slice(0, want);
}

function pickSlidesByIndexes(slides, indexes) {
  const picked = (indexes || [])
    .map((index) => slides[index - 1])
    .filter(Boolean);
  return picked.length ? picked : slides.slice();
}

function buildDeckFromBlueprint(preset) {
  const slides = [];
  const structureParts = splitStructure(preset.structure);
  const chapterNames = preset.chapters.map((chapter) => chapter.name);

  slides.push(createSlide(`${preset.id}-01`, preset.topic, [
    `Mẫu triển khai: ${preset.style}.`,
    `Cấu trúc định hướng: ${preset.structure}.`,
    `Trọng tâm bài dạy: ${preset.notes}.`,
  ]));

  slides.push(createSlide(`${preset.id}-02`, "Mục tiêu bài học", [
    `Nắm được ${chapterNames.slice(0, 2).join(" và ")}.`,
    `Vận dụng chính xác các điểm trọng tâm của chuyên đề ${preset.topic}.`,
    "Tự tin xử lý bài tập nhận biết, thông hiểu và vận dụng theo form THPTQG.",
  ]));

  slides.push(createSlide(`${preset.id}-03`, "Lộ trình triển khai", [
    ...structureParts.map((part, index) => `Bước ${index + 1}: ${part}.`),
    `Mỗi phần đều bám sát ghi chú: ${preset.notes}.`,
  ]));

  slides.push(createSlide(`${preset.id}-04`, "Khởi động nhanh", [
    `Gợi mở chủ đề bằng câu hỏi ngắn về ${preset.topic}.`,
    "Kích hoạt kiến thức nền trước khi vào từng phần chi tiết.",
    "Chuẩn bị cho nhịp bài: lý thuyết ngắn, ví dụ rõ, luyện tập chốt ý.",
  ]));

  preset.chapters.forEach((chapter, chapterIndex) => {
    const base = chapterIndex * 5 + 5;
    slides.push(createSlide(`${preset.id}-${String(base).padStart(2, "0")}`, `${chapter.name} - Kiến thức trọng tâm`, chapter.keyPoints));
    slides.push(createSlide(`${preset.id}-${String(base + 1).padStart(2, "0")}`, `${chapter.name} - Công thức / mẫu triển khai`, chapter.formulas));
    slides.push(createSlide(`${preset.id}-${String(base + 2).padStart(2, "0")}`, `${chapter.name} - Ví dụ minh họa`, chapter.examples));
    slides.push(createSlide(`${preset.id}-${String(base + 3).padStart(2, "0")}`, `${chapter.name} - Lỗi dễ gặp`, chapter.pitfalls));
    slides.push(createSlide(`${preset.id}-${String(base + 4).padStart(2, "0")}`, `${chapter.name} - Luyện tập nhanh`, chapter.practice));
  });

  slides.push(createSlide(`${preset.id}-30`, "Tổng kết và dặn dò", [
    `Nhắc lại các ý chính của ${preset.topic}.`,
    `Yêu cầu học sinh tự hệ thống lại theo sơ đồ: ${preset.structure}.`,
    `Gợi ý tự luyện tiếp dựa trên ghi chú: ${preset.notes}.`,
  ]));

  return slides;
}

const RAW_SLIDE_PRESETS = [
  {
    id: "slide-tenses-subject-verb-agreement",
    topic: "Thì của động từ & Sự hòa hợp chủ vị (Full)",
    count: "12",
    structure: "Quy tắc 12 thì -> Hòa hợp chủ vị -> Lưu ý đặc biệt",
    style: "Chuyên nghiệp (đa sắc)",
    notes: "Dùng bảng so sánh để học sinh dễ nắm bắt.",
    chapters: [
      {
        name: "Hiện tại và thói quen",
        keyPoints: ["Phân biệt present simple và present continuous.", "Nhận diện trạng từ tần suất và dấu hiệu thời điểm.", "Xác định khi nào dùng động từ trạng thái."],
        formulas: ["Present simple: S + V(s/es).", "Present continuous: S + am/is/are + V-ing.", "Bảng đối chiếu signal words: every day, now, at the moment."],
        examples: ["She studies English every night.", "She is studying for the mock test now.", "The train leaves at 7:30 every morning."],
        pitfalls: ["Dùng hiện tại tiếp diễn cho động từ trạng thái như know, like.", "Quên thêm -s/-es với chủ ngữ số ít.", "Nhầm lịch trình cố định với hành động đang diễn ra."],
        practice: ["Chọn thì đúng cho 3 câu có signal words.", "Biến đổi một câu từ thói quen sang hành động đang diễn ra.", "Nêu lý do chọn thì trong từng ví dụ."],
      },
      {
        name: "Quá khứ và mốc thời gian",
        keyPoints: ["Quá khứ đơn dùng cho hành động đã kết thúc.", "Quá khứ tiếp diễn dùng cho nền đang diễn ra.", "Quá khứ hoàn thành cho hành động xảy ra trước một mốc quá khứ."],
        formulas: ["Past simple: S + V2/ed.", "Past continuous: S + was/were + V-ing.", "Past perfect: S + had + V3/ed."],
        examples: ["When I arrived, they were discussing the answer.", "By the time the bell rang, we had finished the task.", "He missed the bus because he woke up late."],
        pitfalls: ["Lạm dụng past perfect khi không có hai mốc quá khứ.", "Nhầm giữa when và while.", "Bỏ trợ động từ was/were trong past continuous."],
        practice: ["Điền đúng thì cho 4 câu có when/while/by the time.", "Sắp xếp hai hành động quá khứ theo đúng thứ tự.", "Giải thích vì sao cần dùng past perfect."],
      },
      {
        name: "Tương lai và dự đoán",
        keyPoints: ["Tương lai đơn cho quyết định tức thời và dự đoán.", "Be going to cho kế hoạch hoặc dấu hiệu rõ ràng.", "Future continuous và future perfect trong bài nâng cao."],
        formulas: ["Will + V.", "Be going to + V.", "Will be + V-ing / Will have + V3."],
        examples: ["I think she will pass the exam.", "Look at those clouds. It is going to rain.", "By June, they will have completed the project."],
        pitfalls: ["Nhầm will với be going to trong câu có bằng chứng hiện tại.", "Không nhận ra mốc by + future time.", "Dùng present simple thay cho future perfect."],
        practice: ["Chọn đáp án đúng cho 3 câu dự đoán.", "Viết lại câu dùng be going to.", "Đặt 1 câu với future perfect theo ngữ cảnh THPTQG."],
      },
      {
        name: "Sự hòa hợp chủ vị",
        keyPoints: ["Động từ chia theo chủ ngữ thực, không chia theo cụm giới từ chen giữa.", "Neither...nor / either...or chia theo chủ ngữ gần động từ.", "Danh từ tập hợp, số lượng, phân số cần xét nghĩa."],
        formulas: ["The number of + plural noun + singular verb.", "A number of + plural noun + plural verb.", "Each / every / either / neither + singular verb."],
        examples: ["The number of candidates is rising.", "A number of students are absent today.", "Neither the teachers nor the principal is available."],
        pitfalls: ["Nhìn danh từ gần nhất nhưng không đúng quy tắc.", "Nhầm the number với a number.", "Quên rằng news, physics thường đi với động từ số ít."],
        practice: ["Sửa lỗi sai trong 4 câu subject-verb agreement.", "Tìm động từ đúng theo từng cấu trúc đặc biệt.", "Giải thích quy tắc cho mỗi đáp án."],
      },
      {
        name: "Lưu ý đặc biệt và bảng tổng hợp",
        keyPoints: ["Kết hợp thì với wish, if only, conditionals.", "Nhận diện dấu hiệu của câu đảo ngữ cơ bản liên quan đến thì.", "Tổng hợp thành bảng so sánh để học sinh ghi nhớ nhanh."],
        formulas: ["Wish + past simple / past perfect.", "If + past perfect, would have + V3.", "Not until / hardly / no sooner trong câu đảo ngữ."],
        examples: ["I wish I knew the answer.", "If she had revised more, she would have passed.", "Hardly had he sat down when the phone rang."],
        pitfalls: ["Trộn lẫn wish hiện tại và wish quá khứ.", "Sai thì ở mệnh đề chính của câu điều kiện.", "Bỏ trợ động từ trong đảo ngữ."],
        practice: ["Hoàn thành bảng tổng hợp các thì.", "Viết 2 câu điều kiện và 1 câu wish.", "Chốt mẹo phân biệt nhanh qua tín hiệu thời gian."],
      },
    ],
  },
  {
    id: "slide-passive-voice",
    topic: "Câu bị động (Passive Voice) - Các dạng đặc biệt",
    count: "10",
    structure: "Bị động kép -> Have something done -> It is said that...",
    style: "Tối giản (Học thuật)",
    notes: "Tập trung vào các câu hỏi thường xuất hiện trong đề thi.",
    chapters: [
      {
        name: "Bị động cơ bản theo thì",
        keyPoints: ["Ôn công thức be + V3/ed ở các thì thường gặp.", "Nhấn mạnh sự thay đổi của động từ be theo thì.", "Xác định tân ngữ để đưa lên làm chủ ngữ."],
        formulas: ["Present simple passive: am/is/are + V3.", "Past simple passive: was/were + V3.", "Present perfect passive: has/have been + V3."],
        examples: ["English is spoken in many countries.", "The lesson was explained clearly.", "The report has been submitted."],
        pitfalls: ["Thiếu động từ be.", "Dùng V2 thay vì V3.", "Không đổi đại từ tân ngữ sang chủ ngữ phù hợp."],
        practice: ["Chuyển 3 câu chủ động sang bị động.", "Xác định thì của câu bị động.", "Nêu bước biến đổi chuẩn."],
      },
      {
        name: "Bị động với động từ khuyết thiếu",
        keyPoints: ["Modal verbs kết hợp bị động dưới dạng modal + be + V3.", "Áp dụng cho should, must, can, may, might.", "Đây là dạng xuất hiện đều trong câu đồng nghĩa THPTQG."],
        formulas: ["should be + V3.", "must be + V3.", "can be + V3."],
        examples: ["The work must be finished today.", "Students should be encouraged to ask questions.", "The problem can be solved in another way."],
        pitfalls: ["Viết modal + V3 trực tiếp.", "Nhầm be với been.", "Bỏ mất tân ngữ logic của câu."],
        practice: ["Chọn dạng đúng của modal passive.", "Viết lại 2 câu nghĩa tương đương.", "Sửa lỗi sai trong 3 ví dụ."],
      },
      {
        name: "Bị động kép và tường thuật bị động",
        keyPoints: ["Dạng is said / is believed / is expected thường dùng trong đề.", "Dùng to V hoặc to have V3 tùy thời điểm hành động.", "Liên hệ trực tiếp với sentence transformation."],
        formulas: ["S + is said to V.", "S + is believed to have V3.", "It is thought that + clause."],
        examples: ["He is believed to be honest.", "The bridge is said to have collapsed in the storm.", "It is expected that prices will rise."],
        pitfalls: ["Chọn sai to V và to have V3.", "Không đổi chủ ngữ phù hợp.", "Dùng was said to have + present action."],
        practice: ["Viết lại 3 câu using passive reporting.", "So sánh clause form và infinitive form.", "Chỉ ra khi nào phải dùng to have V3."],
      },
      {
        name: "Have something done",
        keyPoints: ["Cấu trúc nhờ ai làm gì có sắc thái causative.", "Khác biệt giữa have somebody do và have something done.", "Thường dùng trong câu đồng nghĩa nâng cao."],
        formulas: ["have + object + V3.", "get + object + V3.", "have somebody + V (active causative)."],
        examples: ["She had her hair cut yesterday.", "We got the printer repaired.", "He had the staff prepare the room."],
        pitfalls: ["Nhầm have something done với bị động thông thường.", "Viết sai vị trí tân ngữ.", "Không phân biệt active causative và passive causative."],
        practice: ["Biến đổi 3 câu using have/get something done.", "Phân biệt hai cấu trúc qua ví dụ.", "Hoàn thành câu đồng nghĩa."],
      },
      {
        name: "Tổng hợp dạng thi và mẹo làm bài",
        keyPoints: ["Nhận diện tín hiệu khi đề yêu cầu đổi chủ động sang bị động.", "Ưu tiên xác định thì rồi mới đổi cấu trúc.", "Lập checklist 3 bước để tránh mất điểm."],
        formulas: ["B1: xác định O.", "B2: xác định thì của động từ.", "B3: đổi sang be + V3 và điều chỉnh by-agent nếu cần."],
        examples: ["People think that she is talented -> She is thought to be talented.", "They will announce the result tomorrow -> The result will be announced tomorrow.", "You should send the form today -> The form should be sent today."],
        pitfalls: ["Quên chia be theo thì.", "Nhầm V3 với V-ing.", "Giữ nguyên đại từ của câu gốc."],
        practice: ["Mini quiz 5 câu cuối tiết.", "Tự tạo 2 câu chủ động và đổi sang bị động.", "Ghi lại bảng lỗi cá nhân để ôn ở nhà."],
      },
    ],
  },
  {
    id: "slide-relative-clauses",
    topic: "Mệnh đề quan hệ & Rút gọn mệnh đề quan hệ",
    count: "15",
    structure: "Đại từ quan hệ -> Rút gọn bằng Ving/V3 -> Lưu ý That",
    style: "Vui tươi (Thân thiện)",
    notes: "Thêm nhiều bài tập vận dụng ngay sau mỗi phần lý thuyết.",
    chapters: [
      {
        name: "Đại từ quan hệ cơ bản",
        keyPoints: ["Who, whom, which, whose, where, when theo chức năng.", "Phân biệt người, vật, nơi chốn, thời gian.", "Nhấn mạnh vai trò chủ ngữ và tân ngữ."],
        formulas: ["who = subject for people.", "whom = object for people.", "which = subject/object for things."],
        examples: ["The man who lives next door is a pilot.", "The book which I borrowed is useful.", "The student whom you met is my cousin."],
        pitfalls: ["Dùng who cho vật.", "Không nhận ra khi relative pronoun làm tân ngữ.", "Quên whose cho quan hệ sở hữu."],
        practice: ["Điền who/which/whom vào 4 câu.", "Chỉ ra chức năng của đại từ quan hệ.", "Tạo 1 câu cho mỗi loại."],
      },
      {
        name: "Whose, where, when và that",
        keyPoints: ["Whose cho sở hữu, where cho nơi chốn, when cho thời gian.", "That dùng trong mệnh đề xác định và một số trường hợp đặc biệt.", "So sánh that với which/who trong đề thi."],
        formulas: ["the girl whose bag...", "the place where...", "the day when..."],
        examples: ["The house where I grew up has been sold.", "The day when we met was unforgettable.", "This is the only book that I need."],
        pitfalls: ["Dùng which thay cho whose.", "Dùng where cho người.", "Dùng that sau dấu phẩy trong non-defining clause."],
        practice: ["Hoàn thành 5 câu với whose/where/when/that.", "Chọn đáp án đúng trong câu trắc nghiệm.", "Giải thích vì sao that không dùng được ở một số câu."],
      },
      {
        name: "Mệnh đề xác định và không xác định",
        keyPoints: ["Defining clause không có dấu phẩy.", "Non-defining clause có dấu phẩy và thêm thông tin.", "Dấu phẩy ảnh hưởng trực tiếp đến việc chọn which/who/that."],
        formulas: ["The students who work hard...", "My mother, who is a doctor, ...", "This car, which I bought last year, ..."],
        examples: ["The teacher who teaches us maths is strict.", "Mr Brown, who lives nearby, is a lawyer.", "The app, which was updated yesterday, runs faster now."],
        pitfalls: ["Thêm that vào mệnh đề không xác định.", "Bỏ dấu phẩy sai vị trí.", "Hiểu sai nghĩa khi bỏ mệnh đề không xác định."],
        practice: ["Thêm/bỏ dấu phẩy đúng chỗ.", "So sánh nghĩa của hai câu gần giống nhau.", "Chuyển câu defining thành non-defining khi phù hợp."],
      },
      {
        name: "Rút gọn bằng V-ing, V3 và to V",
        keyPoints: ["Rút gọn chủ động bằng V-ing.", "Rút gọn bị động bằng V3.", "To V thường dùng với the first, the only, the last."],
        formulas: ["Students waiting outside...", "Documents submitted yesterday...", "The first student to answer..."],
        examples: ["The girl sitting by the window is my sister.", "The books written by this author are famous.", "He was the only person to notice the mistake."],
        pitfalls: ["Rút gọn sai khi chủ ngữ không trùng nhau.", "Dùng V-ing thay vì V3 trong câu bị động.", "Lạm dụng to V."],
        practice: ["Rút gọn 4 mệnh đề quan hệ.", "Tìm dạng rút gọn đúng trong câu trắc nghiệm.", "Sửa lỗi sai ở 3 ví dụ."],
      },
      {
        name: "Vận dụng theo form THPTQG",
        keyPoints: ["Dạng điền từ, kết hợp câu và phát hiện lỗi đều có thể xuất hiện.", "Cần nhìn chức năng của chỗ trống trước khi chọn đáp án.", "Luyện tập theo bước: xác định antecedent -> chức năng -> loại mệnh đề."],
        formulas: ["antecedent + relative marker + clause.", "comma -> non-defining.", "reduced clause when omitted subject/verb be."],
        examples: ["The village where my grandparents live is peaceful.", "The athlete chosen for the team is absent.", "This is the reason why she left early."],
        pitfalls: ["Chọn đáp án theo nghĩa mà bỏ qua chức năng.", "Không kiểm tra dấu phẩy.", "Không nhận ra reduced relative clause."],
        practice: ["Mini test 6 câu cuối bài.", "Kết hợp hai câu bằng mệnh đề quan hệ.", "Tự viết bảng mẹo nhận diện nhanh."],
      },
    ],
  },
  {
    id: "slide-endangered-species",
    topic: "Unit 6: Endangered Species (Vocabulary)",
    count: "12",
    structure: "Key terms -> Context examples -> Practice",
    style: "Vũ trụ sáng (Trẻ trung)",
    notes: "Sử dụng hình ảnh các loài động vật quý hiếm.",
    chapters: [
      {
        name: "Từ vựng cốt lõi về loài nguy cấp",
        keyPoints: ["Nhóm từ: endangered, extinct, habitat, biodiversity.", "Phân biệt endangered và extinct.", "Liên hệ chủ đề môi trường trong đề đọc hiểu."],
        formulas: ["endangered species = loài có nguy cơ tuyệt chủng.", "extinct = đã tuyệt chủng.", "habitat loss = mất môi trường sống."],
        examples: ["Many species become endangered because of habitat loss.", "Some animals are extinct in the wild.", "Biodiversity plays a key role in ecosystem balance."],
        pitfalls: ["Nhầm endangered với dangerous.", "Dùng extinct cho loài còn tồn tại.", "Không để ý collocation habitat destruction."],
        practice: ["Match word with meaning.", "Choose the correct word in context.", "Đặt 2 câu về động vật quý hiếm."],
      },
      {
        name: "Nguyên nhân đe dọa động vật",
        keyPoints: ["Poaching, deforestation, pollution, climate change.", "Mỗi nguyên nhân đi với collocation khác nhau.", "Làm rõ quan hệ cause - effect."],
        formulas: ["illegal hunting = poaching.", "loss of forest = deforestation.", "marine pollution affects sea life."],
        examples: ["Poaching has reduced tiger populations.", "Deforestation destroys natural habitats.", "Plastic waste threatens marine animals."],
        pitfalls: ["Nhầm poacher với hunter trung tính.", "Không phân biệt pollution và pollutant.", "Bỏ qua dạng danh từ/động từ."],
        practice: ["Fill in the blanks with correct cause words.", "Classify causes into human and natural factors.", "Tóm tắt một nguyên nhân bằng tiếng Anh."],
      },
      {
        name: "Biện pháp bảo tồn",
        keyPoints: ["Conservation programmes, wildlife reserves, breeding programmes.", "Các động từ hay dùng: protect, preserve, restore.", "Nối từ vựng với giải pháp cụ thể."],
        formulas: ["protect species from illegal trade.", "preserve natural habitats.", "raise awareness among local communities."],
        examples: ["Wildlife reserves help preserve rare animals.", "Campaigns raise public awareness about conservation.", "Breeding programmes support population recovery."],
        pitfalls: ["Dùng reserve như động từ trong ngữ cảnh sai.", "Nhầm preserve với prevent.", "Không gắn đúng solution với problem."],
        practice: ["Chọn giải pháp phù hợp với từng vấn đề.", "Viết 3 câu dùng protect/preserve/raise awareness.", "Discuss a local conservation idea."],
      },
      {
        name: "Context examples trong reading",
        keyPoints: ["Đoán nghĩa từ mới qua ngữ cảnh chủ đề môi trường.", "Nhận diện câu main idea và supporting detail.", "Liên kết từ vựng vào bài đọc THPTQG."],
        formulas: ["main idea often appears in the first sentence.", "supporting details explain causes, effects, or solutions.", "context clue = synonym / example / contrast."],
        examples: ["The species is on the brink of extinction.", "Protected areas provide a safe habitat.", "Conservationists work closely with local communities."],
        pitfalls: ["Dịch từng từ thay vì hiểu cụm.", "Bỏ qua từ nối chỉ quan hệ logic.", "Nhầm main idea với ví dụ minh họa."],
        practice: ["Đọc đoạn ngắn và chọn main idea.", "Đoán nghĩa 4 từ qua context.", "Tìm 2 supporting details trong một đoạn."],
      },
      {
        name: "Ôn tập và luyện dùng từ",
        keyPoints: ["Hệ thống hóa word family và collocations.", "Kết nối vocabulary với speaking/writing ngắn.", "Tạo nền cho bài quiz và flashcard."],
        formulas: ["conserve -> conservation -> conservationist.", "pollute -> pollution -> polluted.", "extinct / endangered / vulnerable."],
        examples: ["Conservationists are working to save the species.", "The river is heavily polluted by waste.", "Many animals remain vulnerable to human activity."],
        pitfalls: ["Chọn sai từ loại khi làm bài điền từ.", "Dùng collocation không tự nhiên.", "Quên phát âm các từ học thuật dài."],
        practice: ["Word form chart.", "Sentence completion game.", "Exit ticket: 5 từ + 1 ví dụ cho mỗi từ."],
      },
    ],
  },
  {
    id: "slide-word-formation",
    topic: "Word Formation: Word roots, Prefixes & Suffixes",
    count: "10",
    structure: "Noun/Verb/Adj signals -> Common suffixes -> Exercises",
    style: "Vũ trụ tối (Huyền bí)",
    notes: "Dạy mẹo chọn đáp án theo hậu tố từ.",
    chapters: [
      {
        name: "Tín hiệu nhận biết từ loại",
        keyPoints: ["Xác định noun, verb, adjective, adverb từ vị trí trong câu.", "Dùng article, preposition, linking verb làm tín hiệu.", "Là bước đầu tiên trước khi chọn hậu tố."],
        formulas: ["after an article -> noun likely.", "after be/seem/become -> adjective likely.", "after a verb -> adverb may appear."],
        examples: ["Her explanation was very clear.", "The manager spoke confidently.", "They need more information."],
        pitfalls: ["Chọn từ theo nghĩa mà bỏ qua vị trí.", "Nhầm adjective với adverb.", "Không kiểm tra từ đứng trước và sau chỗ trống."],
        practice: ["Classify missing word types in 5 sentences.", "Highlight context clues.", "Explain why one word type is needed."],
      },
      {
        name: "Common prefixes",
        keyPoints: ["un-, im-, in-, dis-, re- xuất hiện nhiều.", "Prefix thay đổi nghĩa chứ thường không đổi từ loại.", "Dạng dễ gặp trong từ đồng nghĩa/trái nghĩa."],
        formulas: ["possible -> impossible.", "appear -> disappear.", "use -> reuse."],
        examples: ["This answer is inaccurate.", "They decided to reuse old materials.", "The result was unexpected."],
        pitfalls: ["Gắn sai prefix vào gốc từ.", "Không nhận ra negative prefix phù hợp.", "Nhầm re- với dis- trong ngữ cảnh."],
        practice: ["Complete words with suitable prefixes.", "Choose the opposite meaning.", "Create 3 new words from one root."],
      },
      {
        name: "Common suffixes",
        keyPoints: ["-tion, -ment, -ness, -ity cho danh từ.", "-ful, -less, -ous, -ive cho tính từ.", "-ize, -en cho động từ và -ly cho trạng từ."],
        formulas: ["inform -> information.", "care -> careful / careless.", "modern -> modernize."],
        examples: ["Her performance showed real improvement.", "The instructions were extremely useful.", "They modernized the system last year."],
        pitfalls: ["Nhớ nghĩa nhưng sai chính tả hậu tố.", "Không đổi phụ âm/nguyên âm ở gốc từ.", "Lẫn lộn -tion và -sion."],
        practice: ["Fill word family table.", "Choose correct suffix in 5 items.", "Correct misspelled derived words."],
      },
      {
        name: "Word roots và họ từ",
        keyPoints: ["Tạo nhóm từ quanh một root để học bền hơn.", "Kết nối root với noun/verb/adj/adv.", "Rất hữu ích khi suy luận đáp án trong đề."],
        formulas: ["educate -> education -> educational -> educationally.", "protect -> protection -> protective.", "create -> creation -> creative -> creatively."],
        examples: ["The campaign was highly effective.", "Creativity is valued in modern workplaces.", "They need protective equipment."],
        pitfalls: ["Không nhận ra cùng một root dưới nhiều hình thức.", "Nhầm adjective với noun abstract.", "Chọn word family nhưng lệch sắc thái nghĩa."],
        practice: ["Build word family chains.", "Sort words by part of speech.", "Use 4 related words in a mini paragraph."],
      },
      {
        name: "Mẹo làm bài Word Formation",
        keyPoints: ["Đọc cả câu trước khi chọn đáp án.", "Xác định từ loại trước, nghĩa sau, chính tả cuối cùng.", "Ưu tiên kiểm tra collocation và register."],
        formulas: ["Step 1: detect position.", "Step 2: pick part of speech.", "Step 3: verify meaning and spelling."],
        examples: ["The manager gave a brief explanation.", "This proposal is financially unrealistic.", "Their decision was made independently."],
        pitfalls: ["Làm ngược thứ tự: nghĩa trước, từ loại sau.", "Bỏ qua chính tả của đáp án gần đúng.", "Không kiểm tra từ sau chỗ trống."],
        practice: ["Mini quiz 6 câu Word Formation.", "Think-aloud with one difficult item.", "Personal checklist before choosing an answer."],
      },
    ],
  },
  {
    id: "slide-reported-speech-gerund-infinitive",
    topic: "Reported Speech with Gerund & Infinitive",
    count: "12",
    structure: "Reporting verbs list -> Structure -> Example",
    style: "Biển cả",
    notes: "Dạng bài: 'He advised me to...', 'He denied Ving...'",
    chapters: [
      {
        name: "Tổng quan reporting verbs",
        keyPoints: ["Không phải mọi reporting verb đều đi với that-clause.", "Nhiều động từ đi với to V hoặc V-ing.", "Cần học theo nhóm để tránh nhầm."],
        formulas: ["advise / encourage / remind + O + to V.", "deny / admit / suggest + V-ing.", "insist on + V-ing / that-clause."],
        examples: ["He advised me to revise more.", "She denied taking the money.", "They suggested staying at home."],
        pitfalls: ["Thêm object vào deny/suggest sai chỗ.", "Nhầm to V với V-ing.", "Quên đổi đại từ khi tường thuật."],
        practice: ["Nhóm các reporting verbs theo cấu trúc.", "Điền to V hoặc V-ing.", "Nêu 1 ví dụ cho mỗi nhóm."],
      },
      {
        name: "Reporting verbs + to infinitive",
        keyPoints: ["Nhóm advise, ask, invite, remind, warn rất phổ biến.", "Cần có object trước to V trong hầu hết trường hợp.", "Dùng nhiều trong câu đồng nghĩa THPTQG."],
        formulas: ["advise somebody to do something.", "warn somebody not to do something.", "invite somebody to do something."],
        examples: ["The teacher reminded us to submit the task.", "He warned me not to touch the wire.", "She invited me to join the club."],
        pitfalls: ["Bỏ object trong advise/remind/warn.", "Đặt not sai vị trí.", "Dùng bare infinitive."],
        practice: ["Rewrite direct speech into infinitive form.", "Correct 3 common mistakes.", "Transform a command into reported speech."],
      },
      {
        name: "Reporting verbs + gerund",
        keyPoints: ["Admit, deny, suggest, recommend thường theo sau bởi V-ing.", "Không cần object trong nhiều cấu trúc chuẩn.", "Tập trung vào dạng đề thi hay gặp."],
        formulas: ["deny V-ing.", "admit V-ing.", "suggest V-ing / suggest that + clause."],
        examples: ["He admitted copying the answer.", "They denied breaking the window.", "She recommended revising in groups."],
        pitfalls: ["Viết deny to do.", "Cho object trực tiếp sau suggest trong cấu trúc sai.", "Quên lùi thì nếu dùng clause."],
        practice: ["Choose correct reporting pattern.", "Rewrite using V-ing.", "Explain why one option is incorrect."],
      },
      {
        name: "So sánh with clause forms",
        keyPoints: ["Một số động từ có thể theo sau bởi V-ing hoặc that-clause.", "Cần so sánh mức độ trang trọng và nghĩa.", "Giúp học sinh biến đổi câu linh hoạt hơn."],
        formulas: ["suggest V-ing = suggest that + S + should + V.", "insist on V-ing / insist that...", "accuse somebody of V-ing."],
        examples: ["Mai suggested going earlier.", "Mai suggested that we should go earlier.", "They accused him of cheating."],
        pitfalls: ["Dùng suggest somebody to do.", "Nhầm accuse of với accuse for.", "Không nhận ra hai cấu trúc tương đương."],
        practice: ["Biến đổi một câu thành hai dạng.", "So sánh nghĩa hai cấu trúc.", "Chọn đáp án phù hợp theo context."],
      },
      {
        name: "Luyện đề chuyên sâu",
        keyPoints: ["Ưu tiên nhận diện verb cue trong đề.", "Sau đó kiểm tra object, phủ định và time shift.", "Mục tiêu là làm nhanh dạng sentence transformation."],
        formulas: ["verb cue -> structure -> pronoun/time change.", "remind/warn/advise + O + to/not to V.", "deny/admit/suggest + V-ing."],
        examples: ["\"Don't be late,\" she said -> She warned him not to be late.", "\"Let's review again\" -> He suggested reviewing again.", "\"You should apply\" -> She advised me to apply."],
        pitfalls: ["Đúng verb nhưng sai structure.", "Sai đại từ khi đổi người nói/nghe.", "Đặt trạng từ thời gian không đúng."],
        practice: ["Mini test 5 câu biến đổi.", "Peer correction activity.", "Tạo mind map reporting verbs."],
      },
    ],
  },
  {
    id: "slide-comparisons",
    topic: "Comparisons: Equative, Comparative & Superlative",
    count: "8",
    structure: "Cấu trúc so sánh -> So sánh kép -> Phân biệt",
    style: "Comic",
    notes: "Lấy ví dụ hài hước về các học sinh trong lớp.",
    chapters: [
      {
        name: "So sánh bằng",
        keyPoints: ["as...as và not as/so...as.", "Áp dụng cho adjective và adverb.", "Phù hợp để mở đầu vì dễ quan sát bằng ví dụ lớp học."],
        formulas: ["as + adj/adv + as.", "not as/so + adj/adv + as."],
        examples: ["Lan is as careful as Mai.", "This task is not as easy as it looks.", "Nam runs as fast as his brother."],
        pitfalls: ["Dùng than trong so sánh bằng.", "Nhầm vị trí của as.", "Quên đổi adjective sang adverb khi cần."],
        practice: ["Complete 4 equative comparison sentences.", "Rewrite one sentence with not as...as.", "Create a funny class example."],
      },
      {
        name: "So sánh hơn",
        keyPoints: ["Short adjectives + -er; long adjectives + more.", "So sánh hơn với trạng từ và các từ đặc biệt.", "Kết hợp than clause đúng chuẩn."],
        formulas: ["adj-er + than.", "more + adj + than.", "better / worse / farther."],
        examples: ["This quiz is harder than the previous one.", "She speaks more confidently now.", "Math is better organised this term."],
        pitfalls: ["Dùng more easier.", "Bỏ than.", "Nhầm farther/further trong context."],
        practice: ["Choose comparative form.", "Correct 3 malformed comparisons.", "Write 2 sentences about study habits."],
      },
      {
        name: "So sánh nhất",
        keyPoints: ["the + adj-est / the most + adj.", "Nhận diện nhóm đối tượng để dùng superlative.", "Liên hệ trực tiếp với câu đồng nghĩa."],
        formulas: ["the tallest student.", "the most interesting topic.", "one of the most + plural noun."],
        examples: ["Linh is the most creative member of the team.", "This is the easiest section of the test.", "He is one of the most active volunteers."],
        pitfalls: ["Thiếu the.", "Dùng comparative thay vì superlative.", "Không chỉ rõ phạm vi so sánh."],
        practice: ["Convert 4 comparative sentences into superlative meaning.", "Pick superlative from multiple choices.", "Explain scope of comparison."],
      },
      {
        name: "So sánh kép và tăng tiến",
        keyPoints: ["The more..., the more... là dạng rất quen thuộc trong đề.", "Less...less và comparative and comparative cũng nên nắm.", "Áp dụng vào câu viết lại."],
        formulas: ["The more you practise, the better you become.", "more and more + adj.", "less and less + adj."],
        examples: ["The earlier we start, the sooner we finish.", "Students are becoming more and more independent.", "The less sugar you eat, the healthier you are."],
        pitfalls: ["Quên the ở đầu cả hai mệnh đề.", "Trộn trật tự hai clause.", "Dùng adjective gốc thay vì comparative."],
        practice: ["Match halves of double comparisons.", "Rewrite 3 sentences with the more..., the more....", "Create one study-related example."],
      },
      {
        name: "Phân biệt và vận dụng THPTQG",
        keyPoints: ["Nhận biết từ khóa của từng kiểu so sánh.", "Biết đổi giữa comparative, superlative và equative.", "Dùng ví dụ vui để tăng khả năng ghi nhớ."],
        formulas: ["no one / nothing + comparative -> superlative.", "not as...as -> comparative opposite.", "such/so often pair with comparison rewrites."],
        examples: ["No one in the class is more patient than Lan.", "This route is shorter than the old one.", "The more comic examples we use, the easier the rule feels."],
        pitfalls: ["Sai logic khi đổi nghĩa.", "Giữ nguyên vế so sánh không tương đương.", "Bỏ qua trạng từ trong câu gốc."],
        practice: ["Mini game: choose the equivalent sentence.", "Chốt bảng phân biệt 4 dạng.", "Exit ticket with 3 transformation items."],
      },
    ],
  },
  {
    id: "slide-conditionals",
    topic: "Conditionals: Type 1, 2, 3 & Mixed",
    count: "14",
    structure: "Công thức -> Đảo ngữ -> Mixed type -> Unless",
    style: "Chuyên nghiệp (đa sắc)",
    notes: "Nhấn mạnh vào Đảo ngữ câu điều kiện.",
    chapters: [
      {
        name: "Conditionals type 1",
        keyPoints: ["Điều kiện có thể xảy ra ở hiện tại/tương lai.", "Mệnh đề if dùng present simple, mệnh đề chính dùng will/can/may.", "Đề thi thường hỏi nhận diện thì."],
        formulas: ["If + present simple, will + V.", "If + present simple, can + V.", "Unless = if...not in many contexts."],
        examples: ["If you revise carefully, you will avoid simple mistakes.", "If it rains, we will study indoors.", "If she practises more, she can improve quickly."],
        pitfalls: ["Dùng will ở mệnh đề if.", "Nhầm type 1 với lời khuyên should.", "Không nhận ra khả năng thực tế."],
        practice: ["Fill the correct tense in 4 sentences.", "Transform unless to if not.", "Classify real future situations."],
      },
      {
        name: "Conditionals type 2",
        keyPoints: ["Điều kiện trái với hiện tại.", "Mệnh đề if dùng past simple, mệnh đề chính dùng would/could/might.", "Hay dùng với wish và lời khuyên gián tiếp."],
        formulas: ["If + past simple, would + V.", "If I were you, ...", "could/might + V for possibility."],
        examples: ["If I had more time, I would join the club.", "If she were taller, she could reach the shelf.", "If I were you, I would review the notes again."],
        pitfalls: ["Dùng was thay vì were trong cấu trúc học thuật.", "Trộn với type 1.", "Không nhận ra tình huống giả định."],
        practice: ["Rewrite 3 wishes into type 2 conditionals.", "Choose correct form for hypothetical situations.", "Complete advice sentences."],
      },
      {
        name: "Conditionals type 3",
        keyPoints: ["Điều kiện trái với quá khứ.", "Mệnh đề if dùng past perfect, mệnh đề chính dùng would have + V3.", "Rất hay xuất hiện trong câu đồng nghĩa và lỗi sai."],
        formulas: ["If + had + V3, would have + V3.", "could have + V3 / might have + V3.", "If only / wish + past perfect."],
        examples: ["If he had studied harder, he would have passed.", "If they had left earlier, they might have caught the train.", "I wish I had listened more carefully."],
        pitfalls: ["Thiếu have trong mệnh đề chính.", "Dùng V2 thay cho V3.", "Nhầm type 3 với type 2."],
        practice: ["Convert cause-result past sentences into type 3.", "Correct wrong verb forms.", "Explain the unreal past meaning."],
      },
      {
        name: "Mixed conditionals and inversion",
        keyPoints: ["Mixed type nối quá khứ với hiện tại hoặc ngược lại.", "Đảo ngữ với should, were, had giúp viết lại câu nâng cao.", "Là phần khó cần trình bày thật rõ."],
        formulas: ["If + past perfect, would + V now.", "Had + S + V3, ...", "Were + S + to V, ..." ],
        examples: ["If she had gone to bed earlier, she wouldn't be tired now.", "Had I known the truth, I would have acted differently.", "Were he here, he would help us."],
        pitfalls: ["Không xác định đúng mốc thời gian của hai vế.", "Đảo ngữ nhưng quên bỏ if.", "Nhầm had + V3 với past perfect ở vị trí khác."],
        practice: ["Rewrite 4 if-clauses into inversion.", "Identify time reference in mixed conditionals.", "Create one example of each inversion type."],
      },
      {
        name: "Unless và biến đổi câu điều kiện",
        keyPoints: ["Unless tương đương if...not trong nhiều trường hợp.", "Không dùng unless với câu đã phủ định.", "Tổng hợp các bước đổi qua lại giữa các dạng."],
        formulas: ["Unless + present simple, will + V.", "Unless = if ... not.", "Conditionals can be rewritten using without / but for / otherwise."],
        examples: ["Unless you leave now, you will miss the bus.", "If you do not revise, you will forget the rules.", "But for his support, we would have failed."],
        pitfalls: ["Double negative with unless.", "Đổi nghĩa sai khi thay unless bằng if not.", "Không nhận ra cấu trúc but for."],
        practice: ["Rewrite 5 sentences with unless.", "Change conditionals into equivalent forms.", "Final quick quiz with mixed items."],
      },
    ],
  },
  {
    id: "slide-socializing",
    topic: "Unit 3: Ways of Socializing (Grade 12)",
    count: "10",
    structure: "Verbal/Non-verbal -> Formal/Informal -> Vocabulary",
    style: "Vui tươi (Thân thiện)",
    notes: "Tập trung vào các collocations về giao tiếp.",
    chapters: [
      {
        name: "Verbal communication",
        keyPoints: ["Greeting, apologising, thanking, making requests.", "Nhận diện chức năng giao tiếp trong hội thoại.", "Liên hệ với speaking và multiple choice response."],
        formulas: ["make a polite request.", "give a clear response.", "use suitable register."],
        examples: ["Could you help me with this task?", "Thank you for your support.", "I really appreciate your advice."],
        pitfalls: ["Chọn câu trả lời không đúng chức năng.", "Dùng ngôn ngữ quá thân mật trong ngữ cảnh trang trọng.", "Bỏ qua intonation clues."],
        practice: ["Match utterance with function.", "Complete short dialogues.", "Role-play a polite request."],
      },
      {
        name: "Non-verbal communication",
        keyPoints: ["Eye contact, gestures, facial expressions, posture.", "Ý nghĩa văn hóa của non-verbal signals.", "Từ vựng thường gặp trong reading."],
        formulas: ["maintain eye contact.", "show approval with a nod.", "avoid offensive gestures."],
        examples: ["A smile can make communication friendlier.", "Crossed arms may signal discomfort.", "Nodding often shows understanding."],
        pitfalls: ["Áp nghĩa tuyệt đối cho mọi cử chỉ.", "Không gắn với ngữ cảnh văn hóa.", "Nhầm gesture và posture."],
        practice: ["Describe 4 gestures in English.", "Infer meaning from a short scene.", "Sort positive and negative body language."],
      },
      {
        name: "Formal and informal contexts",
        keyPoints: ["Trang trọng trong email, interview, school ceremony.", "Thân mật trong bạn bè và hoạt động nhóm.", "Phân biệt register qua từ vựng và cấu trúc câu."],
        formulas: ["formal: Would you mind...?", "informal: Can you...?", "closing expressions vary by context."],
        examples: ["I am writing to inquire about...", "Thanks a lot for your help!", "It was a pleasure to meet you."],
        pitfalls: ["Dùng slang trong văn phong trang trọng.", "Áp mẫu formal cho đoạn chat thân mật.", "Không đổi cách xưng hô."],
        practice: ["Rewrite one message in a more formal style.", "Choose suitable expression for each context.", "Spot register mismatch."],
      },
      {
        name: "Key vocabulary and collocations",
        keyPoints: ["social norms, body language, cultural differences, mutual respect.", "Các collocation cần nhớ để làm reading và vocabulary.", "Kết nối từ mới với ngữ cảnh giao tiếp thực tế."],
        formulas: ["show respect.", "express gratitude.", "avoid misunderstanding."],
        examples: ["Mutual respect strengthens communication.", "Cultural differences may lead to misunderstanding.", "He expressed gratitude in a sincere way."],
        pitfalls: ["Học từ đơn lẻ không nhớ cụm đi kèm.", "Dùng nghĩa tiếng Việt trực tiếp khiến collocation sai.", "Không phân biệt polite với respectful."],
        practice: ["Complete collocations.", "Use 5 target words in sentences.", "Mini game with synonyms and contexts."],
      },
      {
        name: "Ứng dụng trong đề thi",
        keyPoints: ["Hội thoại ngắn, đọc hiểu tình huống, chọn response phù hợp.", "Tập nhìn keyword để xác định quan hệ người nói.", "Tổng hợp mẹo loại trừ đáp án lệch ngữ cảnh."],
        formulas: ["Identify relation -> identify purpose -> choose tone.", "supporting clue from previous utterance.", "eliminate rude or irrelevant options."],
        examples: ["Would you like me to help? -> That's very kind of you.", "Thanks for your invitation. -> I'd love to, but...", "Excuse me, could you tell me..."],
        pitfalls: ["Chọn đáp án đúng ngữ pháp nhưng sai lịch sự.", "Không bám utterance trước đó.", "Bỏ qua relation speaker-listener."],
        practice: ["Multiple-choice dialogue set.", "Think-pair-share on response choice.", "Exit ticket with 3 communication items."],
      },
    ],
  },
  {
    id: "slide-modal-verbs",
    topic: "Modal Verbs: May, Might, Should, Must (Present & Past)",
    count: "12",
    structure: "Cấu trúc Modal -> Perfect Gerund -> Practice",
    style: "Tối giản (Học thuật)",
    notes: "Phân biệt must have V3 vs should have V3.",
    chapters: [
      {
        name: "Modal verbs in present meaning",
        keyPoints: ["May/might for possibility.", "Should for advice or expectation.", "Must for strong obligation or deduction."],
        formulas: ["may/might + V.", "should + V.", "must + V."],
        examples: ["She might join the contest.", "You should revise this part again.", "Students must wear their ID cards."],
        pitfalls: ["Nhầm must obligation với must deduction.", "Dùng to sau modal verb.", "Không phân biệt may và might theo mức độ."],
        practice: ["Choose the best modal in 5 contexts.", "Explain the speaker's intention.", "Create one sentence for each modal."],
      },
      {
        name: "Modal perfect for past meaning",
        keyPoints: ["Must have V3 = suy luận mạnh về quá khứ.", "Should have V3 = lẽ ra nên làm nhưng không làm.", "Might/May have V3 = khả năng đã xảy ra."],
        formulas: ["must have + V3.", "should have + V3.", "might have + V3."],
        examples: ["He must have forgotten the meeting.", "You should have checked the answer more carefully.", "They might have taken the wrong bus."],
        pitfalls: ["Dùng must had V3.", "Hiểu sai should have thành lời khuyên hiện tại.", "Không bám bối cảnh thời gian quá khứ."],
        practice: ["Transform 4 situations into modal perfect.", "Distinguish regret and deduction.", "Correct wrong modal perfect forms."],
      },
      {
        name: "Modal verbs in passive and reporting",
        keyPoints: ["Modal + be + V3 trong bị động.", "Could/should be used in formal instructions.", "Liên hệ với câu bị động và sentence transformation."],
        formulas: ["must be completed.", "should be submitted.", "may be delayed."],
        examples: ["The form must be signed today.", "Applications should be sent by email.", "The event may be postponed."],
        pitfalls: ["Quên be trong modal passive.", "Nhầm V3 với V-ing.", "Bỏ qua tính trang trọng của ngữ cảnh."],
        practice: ["Rewrite 3 active sentences into modal passive.", "Find the incorrect modal passive.", "State the tone of each sentence."],
      },
      {
        name: "Perfect gerund and related structures",
        keyPoints: ["Perfect gerund dùng sau deny, regret, admit in some advanced patterns.", "So sánh với modal perfect để tránh nhầm.", "Đây là phần notes yêu cầu làm rõ."],
        formulas: ["regret having done...", "deny having done...", "be accused of having done..."],
        examples: ["He denied having broken the window.", "She regretted having ignored the warning.", "They were accused of having leaked the file."],
        pitfalls: ["Nhầm perfect gerund với should have V3.", "Dùng infinitive sau deny/regret trong mẫu sai.", "Không nhận ra sắc thái đã hoàn tất trước mốc khác."],
        practice: ["Complete 4 sentences with perfect gerund.", "Compare with modal perfect meaning.", "Write one example with deny and one with regret."],
      },
      {
        name: "Luyện tập tổng hợp",
        keyPoints: ["Xác định nghĩa trước rồi mới chọn cấu trúc modal phù hợp.", "Phân biệt hiện tại, quá khứ, lời khuyên và suy luận.", "Tổng hợp nhanh bằng sơ đồ quyết định."],
        formulas: ["obligation -> must / have to.", "advice/regret -> should / should have.", "deduction -> must have / may have / might have."],
        examples: ["You should have told me earlier.", "She may be waiting outside.", "He must have been exhausted after the race."],
        pitfalls: ["Chọn đúng từ khóa nhưng sai thời gian.", "Không để ý bối cảnh suy luận hay bắt buộc.", "Lẫn perfect gerund với modal perfect."],
        practice: ["Mini test 6 items.", "Error correction round.", "Checklist for choosing modals under exam pressure."],
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
  const structure = normalizeText(meta?.structure || meta?.notes);
  const style = normalizeText(meta?.slideTemplate || meta?.style);

  return (
    DIRECT_SLIDE_PRESETS.find((preset) => normalizeText(preset.id) === presetId)
    || DIRECT_SLIDE_PRESETS.find((preset) => (
      normalizeText(preset.topic) === topic
      && normalizeText(preset.structure) === structure
      && normalizeText(preset.style) === style
    ))
    || null
  );
}

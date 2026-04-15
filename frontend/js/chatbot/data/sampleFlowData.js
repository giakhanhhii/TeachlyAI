const SAMPLES_FULLSET = [
  { t: "Ôn tập tổng hợp Tiếng Anh THPT Quốc gia (Guided)", l: "Khá", s: "10", q: "20", f: "10", e: "Tập trung vào phần Đọc hiểu và Điền từ." },
  { t: "Chuyên đề Từ vựng Unit 1-5 (Tiếng Anh 12)", l: "Cơ bản", s: "8", q: "15", f: "20", e: "Ôn tập từ vựng trọng tâm sách giáo khoa." },
  { t: "Ngữ pháp 9+ Đảo ngữ & Câu điều kiện hỗn hợp", l: "Nâng cao", s: "12", q: "25", f: "10", e: "Dành cho mục tiêu điểm 9-10." },
  { t: "Luyện đề minh họa THPT QG 2026 (Mới nhất)", l: "Khá", s: "15", q: "30", f: "0", e: "Cấu trúc định hướng mới của Bộ Giáo dục." },
  { t: "Unit 6-10: Endangered Species & Vietnam and International Org", l: "Khá", s: "10", q: "20", f: "15", e: "Tập trung vào từ vựng chuyên sâu chủ đề môi trường." },
  { t: "Chuyên đề Trọng âm & Phát âm nâng cao", l: "Cơ bản", s: "5", q: "40", f: "10", e: "Chống liệt phần ngữ âm." },
  { t: "Đọc hiểu: Chủ đề Technology & AI in Education", l: "Khá", s: "10", q: "15", f: "0", e: "Rèn luyện kỹ năng tìm main idea và infer." },
  { t: "Ngữ pháp: Câu bị động & Câu tường thuật (Lớp 12)", l: "Cơ bản", s: "8", q: "20", f: "10", e: "Ôn tập kỹ các cấu trúc biến đổi câu." },
  { t: "Từ vựng Unit 2: Cultural Diversity", l: "Khá", s: "10", q: "15", f: "20", e: "Các collocations về chủ đề văn hóa và phong tục." },
  { t: "Luyện tập giới từ, cụm động từ (Phrasal Verbs)", l: "Khó", s: "5", q: "30", f: "20", e: "Những cụm từ dễ nhầm lẫn trong đề thi." },
  { t: "Unit 4: The Mass Media (Tiếng Anh 12)", l: "Khá", s: "10", q: "20", f: "10", e: "Từ vựng về truyền thông và báo chí." },
  { t: "Tổng ôn kiến thức cơ bản lớp 11 cho thi THPT QG", l: "Cơ bản", s: "12", q: "20", f: "10", e: "Ôn lại các thì và modal verbs lớp 11." },
];

const SAMPLES_SLIDE = [
  { t: "Thì của động từ & Sự hòa hợp chủ vị (Full)", c: "12", s: "Quy tắc 12 thì -> Hòa hợp chủ vị -> Lưu ý đặc biệt", y: "Trang trọng", n: "Dùng bảng so sánh để học sinh dễ nắm bắt." },
  { t: "Câu bị động (Passive Voice) - Các dạng đặc biệt", c: "10", s: "Bị động kép -> Have something done -> It is said that...", y: "Trang trọng", n: "Tập trung vào các câu hỏi thường xuất hiện trong đề thi." },
  { t: "Mệnh đề quan hệ & Rút gọn mệnh đề quan hệ", c: "15", s: "Đại từ quan hệ -> Rút gọn bằng Ving/V3 -> Lưu ý That", y: "Gần gũi", n: "Thêm nhiều bài tập vận dụng ngay sau mỗi phần lý thuyết." },
  { t: "Unit 6: Endangered Species (Vocabulary)", c: "12", s: "Key terms -> Context examples -> Practice", y: "Hài hước", n: "Sử dụng hình ảnh các loài động vật quý hiếm." },
  { t: "Word Formation: Word roots, Prefixes & Suffixes", c: "10", s: "Noun/Verb/Adj signals -> Common suffixes -> Exercises", y: "Trang trọng", n: "Dạy mẹo chọn đáp án theo hậu tố từ." },
  { t: "Reported Speech with Gerund & Infinitive", c: "12", s: "Reporting verbs list -> Structure -> Example", y: "Gần gũi", n: "Dạng bài: 'He advised me to...', 'He denied Ving...'" },
  { t: "Comparisons: Equative, Comparative & Superlative", c: "8", s: "Cấu trúc so sánh -> So sánh kép -> Phân biệt", y: "Hài hước", n: "Lấy ví dụ hài hước về các học sinh trong lớp." },
  { t: "Conditionals: Type 1, 2, 3 & Mixed", c: "14", s: "Công thức -> Đảo ngữ -> Mixed type -> Unless", y: "Trang trọng", n: "Nhấn mạnh vào Đảo ngữ câu điều kiện." },
  { t: "Unit 3: Ways of Socializing (Grade 12)", c: "10", s: "Verbal/Non-verbal -> Formal/Informal -> Vocabulary", y: "Gần gũi", n: "Tập trung vào các collocations về giao tiếp." },
  { t: "Modal Verbs: May, Might, Should, Must (Present & Past)", c: "12", s: "Cấu trúc Modal -> Perfect Gerund -> Practice", y: "Trang trọng", n: "Phân biệt must have V3 vs should have V3." },
  { t: "Conjunctions: Although, Because, In spite of, Due to", c: "10", s: "Clause vs Phrase -> Transform -> Linking words", y: "Gần gũi", n: "Bài tập viết lại câu chuyển đổi giữa clause và phrase." },
  { t: "Inversion (Đảo ngữ) - Chuyên đề nâng cao", c: "15", s: "Never/Hardly -> Only/Not until -> Should/Were/Had", y: "Trang trọng", n: "Dành cho nhóm học sinh giỏi ôn thi chuyên." },
];

const SAMPLES_QUIZ = [
  { s: "Trổng hợp Ngữ pháp THPT QG - Phần 1", k: "Grammar", q: "25", d: "Khá", n: "Bao gồm mạo từ, thì, và câu hỏi đuôi." },
  { s: "Phrasal Verbs & Idioms thường gặp (Bộ 1)", k: "Vocabulary", q: "20", d: "Khó", n: "Các cụm từ chủ đề Family, School và Work." },
  { s: "Phát âm đuôi -ed, -s và Ngữ âm cơ bản", k: "Reading", q: "30", d: "Cơ bản", n: "Phân biệt /s/, /z/, /iz/ và âm câm." },
  { s: "Reading Passages: Education in the future", k: "Reading", q: "10", d: "Khá", n: "2 bài đọc điền từ và Đọc hiểu trả lời câu hỏi." },
  { s: "Tìm lỗi sai (Error Identification) - Lớp 12", k: "Grammar", q: "20", d: "Khá", n: "Lỗi về thì, đại từ và từ vựng gây nhầm lẫn." },
  { s: "Chuyên đề Câu đồng nghĩa (Sentence Transformation)", k: "Grammar", q: "15", d: "Khá", n: "Viết lại câu với so sánh, câu bị động, tường thuật." },
  { s: "Từ vựng Unit 1: Home Life & Generations", k: "Vocabulary", q: "25", d: "Cơ bản", n: "Bám sát danh mục từ vựng SGK mới." },
  { s: "Reading: Biodiversity & Environment", k: "Reading", q: "10", d: "Khó", n: "Nhiều từ vựng học thuật về môi trường." },
  { s: "Stress (Trọng âm) từ 2 và 3 âm tiết", k: "Reading", q: "40", d: "Khá", n: "Quy tắc trọng âm danh từ, động từ và đuôi -ion, -ic." },
  { s: "Collocations: Get, Do, Make, Take", k: "Vocabulary", q: "20", d: "Khá", n: "Phân biệt Do homework vs Make a decision." },
  { s: "Prepositions after Adjectives & Verbs", k: "Grammar", q: "20", d: "Cơ bản", n: "Các giới từ đi kèm popular adj/verb trong lớp 12." },
  { s: "Mixed Quiz: Luyện đề tổng hợp số 01", k: "Reading", q: "50", d: "Khá", n: "Đề thi thử rút gọn bám sát form THPT QG." },
];

const SAMPLES_FLASH = [
  { l: "Unit 1: Generational differences", b: "Nghĩa + Phiên âm + Ví dụ", c: "20", n: "SGK Tiếng Anh 12." },
  { l: "Essential Phrasal Verbs list (Set A)", b: "Vietnamese + Collocation", c: "30", n: "Tập trung các từ: look for, give up, break down..." },
  { l: "Word Forms: Noun/Verb suffixes", b: "Suffix meaning + Example", c: "15", n: "Quy tắc -tion, -ment, -ize, -ify." },
  { l: "Common English Idioms about Study", b: "Definition + Context", c: "12", n: "Ví dụ: 'Pass with flying colors', 'Hit the books'." },
  { l: "Unit 3: Social interaction vocabulary", b: "Meaning + Part of speech", c: "20", n: "Từ vựng về giao tiếp và nghi thức xã giao." },
  { l: "Irregular Verbs (Most common 50)", b: "V1 - V2 - V3 + Meaning", c: "50", n: "Bảng động từ bất quy tắc trích lọc." },
  { l: "Prefixes for Opposites (un-, im-, in-, dis-)", b: "Prefix + Root word", c: "20", n: "Dạng bài: 'Clear' -> 'Unclear'." },
  { l: "Unit 6: Animals and Habitats", b: "Species name + Habitat description", c: "15", n: "Nghĩa các từ: poach, habitat, extinct." },
  { l: "Synonyms & Antonyms (IELTS 5.5 level)", b: "Word - Syn - Ant", c: "20", n: "Phục vụ bài tìm từ đồng nghĩa/trái nghĩa trong đề." },
  { l: "Prepositions of Time & Place", b: "Usage rule + Sample", c: "25", n: "In, On, At toàn tập." },
  { l: "Connecting words (Linking words)", b: "Function + Example", c: "15", n: "Therefore, However, Moreover, Otherwise." },
  { l: "Vocabulary for Job Interviews (Lớp 12)", b: "Job title + Requirements", c: "15", n: "Unit 6-7 sách giáo khoa cũ/mới." },
];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

shuffle(SAMPLES_FULLSET);
shuffle(SAMPLES_SLIDE);
shuffle(SAMPLES_QUIZ);
shuffle(SAMPLES_FLASH);

export { SAMPLES_FULLSET, SAMPLES_SLIDE, SAMPLES_QUIZ, SAMPLES_FLASH };

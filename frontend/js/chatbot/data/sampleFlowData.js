import { DIRECT_QUIZ_AUTOFILL_SAMPLES } from "./directQuizPresets.js";
import { DIRECT_SLIDE_AUTOFILL_SAMPLES } from "./directSlidePresets.js";

const SAMPLES_FULLSET = [
  { t: "Ôn tập tổng hợp Tiếng Anh THPT Quốc gia (Guided)", l: "Khá", m: "Chuyên nghiệp (đa sắc)", s: "10", q: "20", f: "10", e: "Tập trung vào phần Đọc hiểu và Điền từ." },
  { t: "Chuyên đề Từ vựng Unit 1-5 (Tiếng Anh 12)", l: "Cơ bản", m: "Tối giản (Học thuật)", s: "8", q: "15", f: "20", e: "Ôn tập từ vựng trọng tâm sách giáo khoa." },
  { t: "Ngữ pháp 9+ Đảo ngữ & Câu điều kiện hỗn hợp", l: "Nâng cao", m: "Vui tươi (Thân thiện)", s: "12", q: "25", f: "10", e: "Dành cho mục tiêu điểm 9-10." },
  { t: "Luyện đề minh họa THPT QG 2026 (Mới nhất)", l: "Khá", m: "Vũ trụ sáng (Trẻ trung)", s: "15", q: "30", f: "0", e: "Cấu trúc định hướng mới của Bộ Giáo dục." },
  { t: "Unit 6-10: Endangered Species & Vietnam and International Org", l: "Khá", m: "Vũ trụ tối (Huyền bí)", s: "10", q: "20", f: "15", e: "Tập trung vào từ vựng chuyên sâu chủ đề môi trường." },
  { t: "Chuyên đề Trọng âm & Phát âm nâng cao", l: "Cơ bản", m: "Biển cả", s: "5", q: "40", f: "10", e: "Chống liệt phần ngữ âm." },
  { t: "Đọc hiểu: Chủ đề Technology & AI in Education", l: "Khá", m: "Comic", s: "10", q: "15", f: "0", e: "Rèn luyện kỹ năng tìm main idea và infer." },
  { t: "Ngữ pháp: Câu bị động & Câu tường thuật (Lớp 12)", l: "Cơ bản", m: "Chuyên nghiệp (đa sắc)", s: "8", q: "20", f: "10", e: "Ôn tập kỹ các cấu trúc biến đổi câu." },
  { t: "Từ vựng Unit 2: Cultural Diversity", l: "Khá", m: "Tối giản (Học thuật)", s: "10", q: "15", f: "20", e: "Các collocations về chủ đề văn hóa và phong tục." },
  { t: "Luyện tập giới từ, cụm động từ (Phrasal Verbs)", l: "Nâng cao", m: "Vui tươi (Thân thiện)", s: "5", q: "30", f: "20", e: "Những cụm từ dễ nhầm lẫn trong đề thi." },
  { t: "Unit 4: The Mass Media (Tiếng Anh 12)", l: "Khá", m: "Vũ trụ sáng (Trẻ trung)", s: "10", q: "20", f: "10", e: "Từ vựng về truyền thông và báo chí." },
  { t: "Tổng ôn kiến thức cơ bản lớp 11 cho thi THPT QG", l: "Cơ bản", m: "Biển cả", s: "12", q: "20", f: "10", e: "Ôn lại các thì và modal verbs lớp 11." },
];

const SAMPLES_SLIDE = DIRECT_SLIDE_AUTOFILL_SAMPLES.slice();

const SAMPLES_QUIZ = DIRECT_QUIZ_AUTOFILL_SAMPLES.slice();

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

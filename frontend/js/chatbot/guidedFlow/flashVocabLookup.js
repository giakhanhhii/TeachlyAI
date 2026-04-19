/**
 * Tra cứu nghĩa tiếng Việt cho từ/cụm tiếng Anh (không dùng AI).
 * Khóa chữ thường, khoảng trắng gộp.
 */

/**
 * `false` = không tra EN_TO_VI — dòng chỉ tiếng Anh chỉ đi API dịch OpenAI, dễ kiểm tra AI.
 * Đặt `true` khi muốn dùng lại từ điển cục bộ.
 */
export const USE_LOCAL_FLASH_VOCAB_LOOKUP = false;

/** @param {string} s */
function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** @type {Record<string, string>} */
const EN_TO_VI = {
  obstacle: "trở ngại, chướng ngại vật",
  preserve: "bảo tồn, giữ gìn",
  abandon: "từ bỏ, bỏ rơi",
  quality: "chất lượng",
  glass: "thủy tinh",
  "glass production": "sản xuất thủy tinh",
  "i love you": "anh yêu em, tôi yêu bạn",
  many: "nhiều, rất nhiều",
  our: "của chúng ta, của chúng tôi",
  us: "chúng ta, chúng tôi",
  production: "sản xuất",
  apart: "riêng biệt, tách rời; ngoại trừ",
  quartz: "thạch anh",
  porcelain: "sứ",
  maintain: "duy trì, bảo trì",
  equipment: "thiết bị",
  resource: "tài nguyên",
  sustainable: "bền vững",
  environment: "môi trường",
  pollution: "ô nhiễm",
  recycle: "tái chế",
  reduce: "giảm",
  increase: "tăng",
  improve: "cải thiện",
  develop: "phát triển",
  research: "nghiên cứu",
  experiment: "thí nghiệm",
  hypothesis: "giả thuyết",
  evidence: "bằng chứng",
  conclusion: "kết luận",
  analysis: "phân tích",
  method: "phương pháp",
  process: "quá trình",
  structure: "cấu trúc",
  function: "chức năng",
  feature: "đặc điểm",
  benefit: "lợi ích",
  challenge: "thách thức",
  solution: "giải pháp",
  strategy: "chiến lược",
  goal: "mục tiêu",
  target: "mục tiêu, đích",
  effort: "nỗ lực",
  support: "hỗ trợ",
  require: "đòi hỏi, yêu cầu",
  provide: "cung cấp",
  consider: "cân nhắc, xem xét",
  include: "bao gồm",
  exclude: "loại trừ",
  compare: "so sánh",
  contrast: "tương phản",
  similar: "tương tự",
  different: "khác biệt",
  significant: "đáng kể, quan trọng",
  necessary: "cần thiết",
  possible: "có thể",
  probable: "có khả năng",
  certain: "chắc chắn",
  doubt: "nghi ngờ",
  believe: "tin",
  assume: "giả định",
  predict: "dự đoán",
  result: "kết quả",
  cause: "nguyên nhân",
  effect: "tác động, hiệu ứng",
  influence: "ảnh hưởng",
  factor: "yếu tố",
  condition: "điều kiện",
  situation: "tình huống",
  context: "bối cảnh",
  issue: "vấn đề",
  debate: "tranh luận",
  opinion: "ý kiến",
  attitude: "thái độ",
  behavior: "hành vi",
  culture: "văn hóa",
  tradition: "truyền thống",
  society: "xã hội",
  economy: "kinh tế",
  policy: "chính sách",
  government: "chính phủ",
  education: "giáo dục",
  knowledge: "kiến thức",
  skill: "kỹ năng",
  ability: "khả năng",
  opportunity: "cơ hội",
  threat: "mối đe dọa",
  advantage: "lợi thế",
  disadvantage: "bất lợi",
  house: "ngôi nhà, nhà ở",
  home: "nhà, quê hương",
  family: "gia đình",
  friend: "bạn bè",
  neighbor: "hàng xóm",
  community: "cộng đồng",
  village: "làng, thôn",
  city: "thành phố",
  country: "đất nước; vùng quê",
  climate: "khí hậu",
  weather: "thời tiết",
  season: "mùa",
  nature: "thiên nhiên",
  animal: "động vật",
  plant: "thực vật; cây",
  energy: "năng lượng",
  power: "sức mạnh; điện",
  force: "lực",
  motion: "chuyển động",
  speed: "tốc độ",
  distance: "khoảng cách",
  weight: "trọng lượng",
  measure: "đo lường",
  data: "dữ liệu",
  chart: "biểu đồ",
  graph: "đồ thị",
  table: "bảng; bàn",
  summary: "tóm tắt",
  detail: "chi tiết",
  example: "ví dụ",
  definition: "định nghĩa",
  meaning: "nghĩa",
  translation: "bản dịch",
  vocabulary: "từ vựng",
  grammar: "ngữ pháp",
  sentence: "câu",
  paragraph: "đoạn văn",
  essay: "bài luận",
  article: "bài báo",
  author: "tác giả",
  reader: "độc giả",
  audience: "khán giả, đối tượng",
  purpose: "mục đích",
  theme: "chủ đề",
  topic: "chủ đề",
  title: "tiêu đề",
  chapter: "chương",
  section: "phần",
  introduction: "phần mở đầu",
};

/**
 * @param {string} englishPhrase
 * @returns {string} nghĩa tiếng Việt hoặc chuỗi rỗng nếu không có
 */
export function lookupEnToVi(englishPhrase) {
  if (!USE_LOCAL_FLASH_VOCAB_LOOKUP) return "";
  const raw = String(englishPhrase || "").trim();
  if (raw.length < 2) return "";
  const k = norm(raw);
  if (EN_TO_VI[k]) return EN_TO_VI[k];
  const first = k.split(" ")[0];
  if (first && EN_TO_VI[first]) return EN_TO_VI[first];
  return "";
}

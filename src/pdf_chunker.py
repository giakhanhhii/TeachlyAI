"""
PDF Chunker - Pipeline xử lý sách giáo khoa tiếng Anh
=======================================================
Chuyển đổi PDF → Chunks JSON có cấu trúc để nạp vào knowledge base.

Luồng xử lý:
  PDF → Text (pdfplumber) → Làm sạch → Tách đoạn → LLM phân loại → JSON output
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ─────────────────────────── Hằng số ───────────────────────────

CATEGORIES = ["Ngữ pháp", "Từ vựng", "Bài tập mẫu", "Mẹo làm bài"]
DIFFICULTIES = ["Nhận biết", "Thông hiểu", "Vận dụng"]

# Regex nhận biết dòng rác (số trang, header/footer lặp lại)
_NOISE_PATTERNS: list[re.Pattern] = [
    re.compile(r"^\s*\d+\s*$"),                          # Chỉ số trang
    re.compile(r"^\s*-\s*\d+\s*-\s*$"),                 # - 12 -
    re.compile(r"^\s*Page\s+\d+\s*(of\s+\d+)?\s*$", re.IGNORECASE),
    re.compile(r"^\s*©.*$"),                             # Copyright line
    re.compile(r"^\s*www\.\S+\s*$"),                     # URL line
]

# Từ gợi ý phân loại — dùng để hỗ trợ LLM
_CATEGORY_HINTS = {
    "Ngữ pháp": [
        "tense", "grammar", "structure", "clause", "subject", "verb",
        "present perfect", "past simple", "conditional", "passive",
        "article", "preposition", "conjunction", "modal", "relative",
        "thì ", "cấu trúc", "ngữ pháp", "câu điều kiện", "thể bị động",
    ],
    "Từ vựng": [
        "vocabulary", "word", "definition", "synonym", "antonym",
        "phrase", "idiom", "collocation", "prefix", "suffix",
        "từ vựng", "nghĩa", "định nghĩa", "thành ngữ",
    ],
    "Bài tập mẫu": [
        "exercise", "practice", "example", "sample", "fill in",
        "choose", "answer", "question", "task", "activity",
        "bài tập", "ví dụ", "điền vào", "câu hỏi", "chọn đáp án",
    ],
    "Mẹo làm bài": [
        "tip", "trick", "strategy", "note", "remember", "warning",
        "common mistake", "advice", "hint", "key point",
        "mẹo", "lưu ý", "ghi nhớ", "lỗi thường gặp", "chú ý",
    ],
}


# ─────────────────────────── Data Models ───────────────────────────

@dataclass
class Chunk:
    """Một đơn vị kiến thức đã chuẩn hóa."""
    category: str
    topic: str
    content: str
    keywords: list[str]
    difficulty: str
    source_page: int = 0
    chunk_index: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "topic": self.topic,
            "content": self.content,
            "keywords": self.keywords,
            "difficulty": self.difficulty,
            "meta": {
                "source_page": self.source_page,
                "chunk_index": self.chunk_index,
            },
        }


@dataclass
class ProcessingResult:
    """Kết quả xử lý toàn bộ một file PDF."""
    source_file: str
    total_pages: int
    total_chunks: int
    chunks: list[Chunk] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_file": self.source_file,
            "total_pages": self.total_pages,
            "total_chunks": self.total_chunks,
            "chunks": [c.to_dict() for c in self.chunks],
            "errors": self.errors,
        }


# ─────────────────────────── Text Extraction ───────────────────────────

class PDFExtractor:
    """Trích xuất văn bản thô từ PDF sử dụng pdfplumber."""

    def extract(self, pdf_path: Path) -> list[tuple[int, str]]:
        """
        Trả về list[(page_number, raw_text)] — 1-indexed page numbers.
        Raises RuntimeError nếu không đọc được file.
        """
        try:
            import pdfplumber  # type: ignore
        except ImportError as e:
            raise RuntimeError(
                "Thiếu dependency 'pdfplumber'. Chạy: pip install pdfplumber"
            ) from e

        pages: list[tuple[int, str]] = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages.append((i, text))

        logger.info(f"Đã trích xuất {len(pages)} trang từ '{pdf_path.name}'")
        return pages


# ─────────────────────────── Noise Filter ───────────────────────────

class NoiseFilter:
    """
    Lọc bỏ nhiễu: số trang, header/footer lặp lại, ký tự rác.
    Nhận diện header/footer bằng thuật toán tần suất xuất hiện.
    """

    def __init__(self, min_line_length: int = 3):
        self._min_len = min_line_length

    def filter_pages(
        self, pages: list[tuple[int, str]]
    ) -> list[tuple[int, str]]:
        """Lọc nhiễu trên toàn bộ danh sách trang, nhận diện header/footer chung."""
        if not pages:
            return []

        # Bước 1: tìm các dòng xuất hiện ở nhiều trang (≥30%) → header/footer
        line_freq: dict[str, int] = {}
        for _, text in pages:
            seen = set()
            for line in text.splitlines():
                cleaned = line.strip()
                if cleaned and cleaned not in seen:
                    line_freq[cleaned] = line_freq.get(cleaned, 0) + 1
                    seen.add(cleaned)

        threshold = max(2, int(len(pages) * 0.3))
        repeated_lines = {ln for ln, cnt in line_freq.items() if cnt >= threshold}
        logger.debug(f"Phát hiện {len(repeated_lines)} dòng header/footer lặp lại")

        # Bước 2: lọc từng trang
        cleaned: list[tuple[int, str]] = []
        for page_num, text in pages:
            filtered = self._filter_text(text, repeated_lines)
            cleaned.append((page_num, filtered))
        return cleaned

    def _filter_text(self, text: str, repeated_lines: set[str]) -> str:
        lines = text.splitlines()
        good: list[str] = []
        for line in lines:
            stripped = line.strip()
            # Bỏ dòng rỗng ngắn
            if len(stripped) < self._min_len:
                continue
            # Bỏ header/footer lặp lại
            if stripped in repeated_lines:
                continue
            # Bỏ dòng khớp noise pattern
            if any(p.match(stripped) for p in _NOISE_PATTERNS):
                continue
            # Xóa ký tự rác (non-printable)
            cleaned = re.sub(r"[^\x20-\x7E\u00C0-\u024F\u1E00-\u1EFF\n\t]", "", line)
            if cleaned.strip():
                good.append(cleaned)
        return "\n".join(good)


# ─────────────────────────── Segment Splitter ───────────────────────────

class SegmentSplitter:
    """
    Tách văn bản đã làm sạch thành các đoạn ngữ nghĩa.
    Ưu tiên tách tại:
      1. Section headers rõ ràng (GRAMMAR:, VOCABULARY:, TIPS:, etc.)
      2. Dòng trống kép  
      3. Kích thước tối đa (max_tokens_per_chunk)
    """

    # Section headers thường gặp trong sách giáo khoa
    _SECTION_HEADER = re.compile(
        r"^(?:"
        r"GRAMMAR|VOCABULARY|VOCAB|PRACTICE|EXERCISE|TIPS?|STRATEGIES|NOTE|READING|LISTENING|WRITING|SPEAKING"
        r"|NGỮ PHÁP|TỪ VỰNG|BÀI TẬP|MẸO|GHI NHỚ|LƯU Ý"
        r")[:\s]",
        re.IGNORECASE,
    )

    # Heading tổng quát: ALL CAPS ≥4 ký tự hoặc đánh số
    _GENERIC_HEADING = re.compile(
        r"^(?:[A-Z][A-Z\s]{3,50}[:.]?|(?:\d+\.)+\s+\S|Unit\s+\d+|Chapter\s+\d+)"
    )

    def split(self, text: str, max_tokens_per_chunk: int = 500) -> list[str]:
        """
        Trả về list[str] — mỗi phần tử là một chunk ngữ nghĩa.
        Mỗi chunk không vượt quá ~max_tokens_per_chunk × 4 ký tự.
        """
        max_chars = max_tokens_per_chunk * 4

        # Bước 1: Tách dứt khoát tại section headers
        lines = text.splitlines()
        sections: list[list[str]] = [[]]
        for line in lines:
            stripped = line.strip()
            is_section = (
                self._SECTION_HEADER.match(stripped)
                or (
                    self._GENERIC_HEADING.match(stripped)
                    and len(stripped) > 4
                    and len(stripped) < 80
                )
            )
            if is_section and sections[-1]:   # flush khi gặp header mới
                sections.append([line])
            else:
                sections[-1].append(line)

        # Bước 2: Trong mỗi section → tách theo đoạn trống kép
        raw_blocks: list[str] = []
        for sec_lines in sections:
            sec_text = "\n".join(sec_lines).strip()
            if not sec_text:
                continue
            sub_blocks = [b.strip() for b in re.split(r"\n\s*\n", sec_text) if b.strip()]
            raw_blocks.extend(sub_blocks)

        # Bước 3: Gộp/cắt theo max_chars
        result: list[str] = []
        buffer = ""
        for block in raw_blocks:
            # Block quá lớn → bắt buộc cắt theo câu
            if len(block) > max_chars:
                if buffer:
                    result.append(buffer.strip())
                    buffer = ""
                result.extend(self._split_by_sentence(block, max_chars))
                continue

            # Block là section header → flush buffer trước
            stripped_block = block.splitlines()[0].strip() if block else ""
            is_section_block = (
                self._SECTION_HEADER.match(stripped_block)
                or self._GENERIC_HEADING.match(stripped_block)
            )
            if is_section_block and buffer:
                result.append(buffer.strip())
                buffer = block
                continue

            # Gộp nếu còn đủ chỗ
            if buffer and (len(buffer) + len(block) + 2 <= max_chars):
                buffer = buffer + "\n\n" + block
            else:
                if buffer:
                    result.append(buffer.strip())
                buffer = block

        if buffer:
            result.append(buffer.strip())

        # Lọc đoạn quá ngắn (<30 ký tự)
        return [s for s in result if len(s) >= 30]

    @staticmethod
    def _split_by_sentence(text: str, max_chars: int) -> list[str]:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        chunks: list[str] = []
        buf = ""
        for sent in sentences:
            if not buf or len(buf) + len(sent) + 1 <= max_chars:
                buf = (buf + " " + sent).strip() if buf else sent
            else:
                if buf:
                    chunks.append(buf)
                buf = sent
        if buf:
            chunks.append(buf)
        return chunks


# ─────────────────────────── LLM Classifier ───────────────────────────

_CLASSIFY_SYSTEM = """Bạn là chuyên gia giáo dục tiếng Anh. 
Nhiệm vụ: Phân tích một đoạn văn bản từ sách giáo khoa tiếng Anh và trả về JSON.

Quy tắc phân loại category:
- "Ngữ pháp": giải thích cấu trúc ngữ pháp, thì, thể, mệnh đề
- "Từ vựng": danh sách từ, định nghĩa, collocations, idioms
- "Bài tập mẫu": bài tập có đáp án mẫu hoặc ví dụ minh họa có cấu trúc bài làm
- "Mẹo làm bài": tips, lưu ý, chiến lược, lỗi thường gặp

Quy tắc difficulty:
- "Nhận biết": nhớ/nhận diện kiến thức cơ bản
- "Thông hiểu": giải thích, so sánh, phân tích
- "Vận dụng": áp dụng vào bài tập hoặc tình huống thực tế

QUAN TRỌNG: Chỉ trả về JSON hợp lệ, không thêm markdown hay giải thích ngoài JSON."""

_CLASSIFY_TEMPLATE = """Phân tích đoạn văn bản dưới đây:

---
{segment}
---

Trả về JSON với định dạng chính xác:
{{
  "category": "<một trong: Ngữ pháp | Từ vựng | Bài tập mẫu | Mẹo làm bài>",
  "topic": "<chủ đề cụ thể, VD: Thì hiện tại hoàn thành, Từ vựng chủ đề môi trường>",
  "content": "<nội dung đã làm sạch, giữ nguyên tiếng Anh>",
  "keywords": ["từ khóa 1", "từ khóa 2", "..."],
  "difficulty": "<một trong: Nhận biết | Thông hiểu | Vận dụng>"
}}"""


class LLMClassifier:
    """
    Sử dụng LLM (GPT-4o hoặc tương đương) để phân loại và trích xuất metadata.
    Có fallback heuristic khi LLM không khả dụng.
    """

    def __init__(
        self,
        client: Any | None,
        model: str = "gpt-4o-mini",
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        self._client = client
        self._model = model
        self._max_retries = max_retries
        self._retry_delay = retry_delay

    def classify(self, segment: str, page_num: int = 0) -> dict[str, Any]:
        """
        Phân loại một đoạn văn. Trả về dict khớp schema Chunk.
        Nếu LLM lỗi → dùng heuristic fallback.
        """
        if not segment.strip():
            return self._empty_chunk()

        if self._client:
            for attempt in range(self._max_retries):
                try:
                    return self._llm_classify(segment)
                except Exception as e:
                    logger.warning(
                        f"LLM classify attempt {attempt+1}/{self._max_retries} failed: {e}"
                    )
                    if attempt < self._max_retries - 1:
                        time.sleep(self._retry_delay * (attempt + 1))

            logger.warning("LLM thất bại sau tất cả retry, dùng heuristic fallback")

        return self._heuristic_classify(segment)

    def _llm_classify(self, segment: str) -> dict[str, Any]:
        prompt = _CLASSIFY_TEMPLATE.format(segment=segment[:3000])  # giới hạn context

        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": _CLASSIFY_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
        return self._validate_and_fix(data, segment)

    def _heuristic_classify(self, segment: str) -> dict[str, Any]:
        """Phân loại dựa trên từ khóa khi không có LLM."""
        seg_lower = segment.lower()
        scores: dict[str, int] = {cat: 0 for cat in CATEGORIES}
        for cat, hints in _CATEGORY_HINTS.items():
            for hint in hints:
                if hint in seg_lower:
                    scores[cat] += 1

        category = max(scores, key=lambda k: scores[k])
        if scores[category] == 0:
            category = "Ngữ pháp"  # default

        keywords = self._extract_keywords_heuristic(segment)
        difficulty = self._guess_difficulty(segment)
        topic = self._guess_topic(segment, category)

        return {
            "category": category,
            "topic": topic,
            "content": segment.strip(),
            "keywords": keywords,
            "difficulty": difficulty,
        }

    def _validate_and_fix(self, data: dict, segment: str) -> dict[str, Any]:
        """Kiểm tra và sửa output LLM nếu thiếu hoặc sai field."""
        if data.get("category") not in CATEGORIES:
            data["category"] = self._heuristic_classify(segment)["category"]
        if data.get("difficulty") not in DIFFICULTIES:
            data["difficulty"] = "Thông hiểu"
        if not data.get("topic"):
            data["topic"] = "Chưa xác định"
        if not isinstance(data.get("keywords"), list):
            data["keywords"] = []
        if not data.get("content"):
            data["content"] = segment.strip()
        else:
            data["content"] = data["content"].strip()
        return data

    @staticmethod
    def _extract_keywords_heuristic(text: str) -> list[str]:
        """Trích xuất từ khóa đơn giản: từ viết hoa, từ trong ngoặc."""
        words = re.findall(r"\b[A-Z][a-z]{3,}\b|\b[A-Z]{2,}\b", text)
        # Lấy cụm từ trong ngoặc đơn/kép
        quoted = re.findall(r'"([^"]{2,30})"', text)
        all_kw = list(dict.fromkeys(words + quoted))  # dedup, giữ thứ tự
        return all_kw[:10]

    @staticmethod
    def _guess_difficulty(text: str) -> str:
        tl = text.lower()
        if any(w in tl for w in ["apply", "practice", "exercise", "write", "use", "vận dụng"]):
            return "Vận dụng"
        if any(w in tl for w in ["explain", "compare", "analyze", "why", "thông hiểu"]):
            return "Thông hiểu"
        return "Nhận biết"

    @staticmethod
    def _guess_topic(text: str, category: str) -> str:
        # Thử lấy dòng đầu tiên có nghĩa làm topic
        for line in text.splitlines():
            stripped = line.strip()
            if 5 < len(stripped) < 80 and not stripped.startswith(("•", "-", "*")):
                return stripped[:60]
        return f"{category} - Chủ đề chưa xác định"

    @staticmethod
    def _empty_chunk() -> dict[str, Any]:
        return {
            "category": "Ngữ pháp",
            "topic": "Không xác định",
            "content": "",
            "keywords": [],
            "difficulty": "Nhận biết",
        }


# ─────────────────────────── Main Pipeline ───────────────────────────

class PDFChunkerPipeline:
    """
    Pipeline chính: kết hợp Extract → Filter → Split → Classify → Output JSON.
    """

    def __init__(
        self,
        llm_client: Any | None = None,
        model: str = "gpt-4o-mini",
        output_dir: Path | None = None,
        max_tokens_per_chunk: int = 500,
        batch_size: int = 5,
    ):
        self._extractor = PDFExtractor()
        self._filter = NoiseFilter()
        self._splitter = SegmentSplitter()
        self._classifier = LLMClassifier(llm_client, model)
        self._output_dir = output_dir or Path("output/chunks")
        self._output_dir.mkdir(parents=True, exist_ok=True)
        self._max_tokens = max_tokens_per_chunk
        self._batch_size = batch_size

    def process(self, pdf_path: Path) -> ProcessingResult:
        """Xử lý một file PDF. Trả về ProcessingResult."""
        logger.info(f"=== Bắt đầu xử lý: {pdf_path.name} ===")
        result = ProcessingResult(
            source_file=str(pdf_path),
            total_pages=0,
            total_chunks=0,
        )

        # 1. Trích xuất text
        try:
            pages = self._extractor.extract(pdf_path)
        except Exception as e:
            result.errors.append(f"Lỗi đọc PDF: {e}")
            logger.error(f"Không đọc được PDF: {e}")
            return result

        result.total_pages = len(pages)

        # 2. Lọc nhiễu
        clean_pages = self._filter.filter_pages(pages)

        # 3. Tách đoạn + Phân loại
        chunk_idx = 0
        for page_num, page_text in clean_pages:
            if not page_text.strip():
                continue

            segments = self._splitter.split(page_text, self._max_tokens)
            logger.info(f"Trang {page_num}: {len(segments)} đoạn")

            for seg in segments:
                try:
                    meta = self._classifier.classify(seg, page_num)
                    chunk = Chunk(
                        category=meta["category"],
                        topic=meta["topic"],
                        content=meta["content"],
                        keywords=meta["keywords"],
                        difficulty=meta["difficulty"],
                        source_page=page_num,
                        chunk_index=chunk_idx,
                    )
                    result.chunks.append(chunk)
                    chunk_idx += 1
                except Exception as e:
                    msg = f"Trang {page_num}: Phân loại thất bại — {e}"
                    result.errors.append(msg)
                    logger.warning(msg)

        result.total_chunks = len(result.chunks)
        logger.info(
            f"=== Hoàn thành: {result.total_chunks} chunks từ {result.total_pages} trang ==="
        )
        return result

    def save(self, result: ProcessingResult, output_name: str | None = None) -> Path:
        """Lưu kết quả ra file JSON."""
        if not output_name:
            stem = Path(result.source_file).stem
            output_name = f"{stem}_chunks.json"
        if not output_name.endswith(".json"):
            output_name += ".json"

        out_path = self._output_dir / output_name
        out_path.write_text(
            json.dumps(result.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info(f"Đã lưu: {out_path}")
        return out_path

    def process_and_save(self, pdf_path: Path, output_name: str | None = None) -> Path:
        """Shortcut: xử lý và lưu ngay."""
        result = self.process(pdf_path)
        return self.save(result, output_name)

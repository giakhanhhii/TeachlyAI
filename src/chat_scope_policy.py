from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata


TEACHLY_CHAT_SYSTEM = """Bạn là Teachly AI, trợ lý hỗ trợ giáo viên và học sinh ôn Tiếng Anh THPT QG (Việt Nam).
Chỉ được trả lời 2 nhóm nội dung:
1. Dạy học, học tập, ôn luyện và kiểm tra đánh giá liên quan tới Tiếng Anh.
2. Hướng dẫn cách dùng website Teachly hoặc giới thiệu ngắn gọn các tính năng trên web, đặc biệt là 4 card: Full Set, Slide, Quiz, Flashcard.

Nếu người dùng hỏi về môn học khác ngoài Tiếng Anh, hoặc hỏi nội dung không liên quan tới giáo dục Tiếng Anh hay tính năng/cách dùng website, hãy từ chối ngắn gọn bằng tiếng Việt và mời họ hỏi lại đúng phạm vi.
Khi người dùng hỏi về tính năng hoặc cách dùng website, trả lời thật ngắn gọn, thực dụng, ưu tiên 2-4 câu ngắn hoặc các ý rất ngắn.
Ưu tiên tiếng Việt khi người dùng dùng tiếng Việt.
Khi người dùng cần **bộ slide** (hoặc bạn sinh nội dung slide), chỉ trả về **một JSON** dạng mảng các đối tượng nhỏ gọn:
[{"title":"...","bullets":["...","..."]}, ...]
Không bọc markdown, không HTML/CSS, không nhãn hiệu hay font — giao diện do ứng dụng áp mẫu có sẵn.
Nếu được hỏi về quiz, flashcard hoặc hình ảnh minh họa, gợi ý cấu trúc nội dung hữu ích (không cần tạo file thật trừ khi được mô tả rõ công cụ ngoài chat)."""

OUT_OF_SCOPE_REPLY = (
    "Mình chỉ hỗ trợ về dạy và học Tiếng Anh, hoặc hướng dẫn ngắn gọn cách dùng/tính năng của Teachly. "
    "Bạn hãy hỏi về bài học Tiếng Anh hoặc về các card như Full Set, Slide, Quiz, Flashcard nhé."
)

_FEATURE_CONTEXT_TERMS = (
    "teachly",
    "chatbot",
    "trang web",
    "website",
    "web",
    "ung dung",
    "app",
    "he thong",
    "card",
    "fullset",
    "full set",
    "slide",
    "quiz",
    "flashcard",
    "flash card",
)

_FEATURE_HELP_TERMS = (
    "cach dung",
    "huong dan",
    "su dung",
    "tinh nang",
    "gioi thieu",
    "lam sao",
    "nhu the nao",
    "co the lam gi",
    "ho tro gi",
    "dung de lam gi",
    "khac nhau",
    "nao phu hop",
    "nen dung",
    "tren web",
    "trong web",
    "web nay",
    "chatbot nay",
    "tao nhu nao",
    "xuat pdf",
    "tai len",
    "upload",
    "dang nhap",
    "chia se",
)

_ENGLISH_TERMS = (
    "tieng anh",
    "english",
    "grammar",
    "vocabulary",
    "pronunciation",
    "listening",
    "speaking",
    "reading",
    "writing",
    "ielts",
    "toeic",
    "thptqg",
    "thpt",
    "ngu phap",
    "tu vung",
    "phat am",
    "doc hieu",
    "nghe noi",
    "viet doan",
    "viet cau",
    "phonics",
    "ipa",
    "word stress",
    "collocation",
    "passive voice",
    "present simple",
    "present perfect",
    "past simple",
    "relative clause",
    "modal verb",
    "conditionals",
    "thi hien tai",
    "thi qua khu",
    "cau dieu kien",
    "cau bi dong",
    "menh de quan he",
)

_TEACHING_TERMS = (
    "day hoc",
    "giang day",
    "su pham",
    "giao an",
    "bai giang",
    "on thi",
    "kiem tra danh gia",
    "lop hoc",
    "hoc sinh",
    "giao vien",
)

_OTHER_SUBJECT_TERMS = (
    "toan",
    "vat ly",
    "hoa hoc",
    "sinh hoc",
    "ngu van",
    "van hoc",
    "lich su",
    "dia ly",
    "tin hoc",
    "lap trinh",
    "coding",
    "code",
)


@dataclass(frozen=True)
class ChatScopeDecision:
    allowed: bool
    reason: str
    reply: str | None = None


def _normalize_text(text: str) -> str:
    lowered = (text or "").strip().lower()
    decomposed = unicodedata.normalize("NFD", lowered)
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    without_d = without_marks.replace("đ", "d")
    return re.sub(r"\s+", " ", without_d)


def _contains_any(text: str, phrases: tuple[str, ...]) -> bool:
    return any(phrase in text for phrase in phrases)


def _is_feature_help_request(text: str) -> bool:
    return _contains_any(text, _FEATURE_CONTEXT_TERMS) and _contains_any(text, _FEATURE_HELP_TERMS)


def _is_english_teaching_request(text: str) -> bool:
    return _contains_any(text, _ENGLISH_TERMS) or _contains_any(text, _TEACHING_TERMS)


def evaluate_chat_scope(message: str) -> ChatScopeDecision:
    normalized = _normalize_text(message)
    if _is_feature_help_request(normalized):
        return ChatScopeDecision(allowed=True, reason="feature_help")
    if _contains_any(normalized, _OTHER_SUBJECT_TERMS) and not _contains_any(normalized, _ENGLISH_TERMS):
        return ChatScopeDecision(allowed=False, reason="other_subject", reply=OUT_OF_SCOPE_REPLY)
    if _is_english_teaching_request(normalized):
        return ChatScopeDecision(allowed=True, reason="english_teaching")
    return ChatScopeDecision(allowed=False, reason="unrelated", reply=OUT_OF_SCOPE_REPLY)

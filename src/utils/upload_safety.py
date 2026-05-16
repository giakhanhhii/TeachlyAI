from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import re
import unicodedata

MAX_SCAN_CHARS = 50_000

NSFW_TERMS = (
    "porn",
    "pornography",
    "pornhub",
    "hentai",
    "sex tape",
    "blowjob",
    "handjob",
    "cumshot",
    "anal sex",
    "oral sex",
    "nude",
    "nudes",
    "naked selfie",
    "masturbate",
    "masturbation",
    "khoa than",
    "khieu dam",
    "phim sex",
    "anh nong",
    "thu dam",
    "quan he tinh duc",
    "hiep dam",
)

TERROR_DIRECT_TERMS = (
    "terrorist manifesto",
    "suicide bombing",
    "suicide bomber",
    "car bomb",
    "bomb vest",
    "ao bom",
    "danh bom lieu chet",
    "che tao bom",
)

TERROR_CONTEXT_TERMS = (
    "terrorist",
    "terrorism",
    "extremist attack",
    "violent extremist",
    "khung bo",
    "danh bom",
)

GRAPHIC_VIOLENCE_TERMS = (
    "behead",
    "beheading",
    "decapitate",
    "decapitation",
    "dismember",
    "massacre",
    "slaughter",
    "murder",
    "assassinate",
    "assassination",
    "kill people",
    "kill civilians",
    "giet nguoi",
    "sat hai",
    "tham sat",
    "chem giet",
    "cat dau",
)

INSTRUCTION_CUES = (
    "how to",
    "guide to",
    "tutorial",
    "step by step",
    "instructions",
    "recipe for",
    "build a",
    "make a",
    "cach lam",
    "huong dan",
    "chi cach",
    "lam sao de",
)

ILLEGAL_TARGET_TERMS = (
    "bomb",
    "explosive",
    "detonator",
    "gunpowder",
    "fake passport",
    "counterfeit money",
    "credit card fraud",
    "drug trafficking",
    "buy drugs",
    "sell drugs",
    "meth",
    "heroin",
    "cocaine",
    "thuoc no",
    "bom xang",
    "ho chieu gia",
    "tien gia",
    "ma tuy",
    "mua ma tuy",
    "ban ma tuy",
)

OBSCENE_TERMS = (
    "fuck me",
    "suck my dick",
    "eat my ass",
    "dit nhau",
    "bu cu",
    "bo cu",
    "liem lon",
    "dit me",
)

TEACHING_RELEVANT_TERMS = (
    "english",
    "tieng anh",
    "grammar",
    "ngu phap",
    "vocabulary",
    "tu vung",
    "pronunciation",
    "phat am",
    "reading",
    "doc hieu",
    "listening",
    "speaking",
    "writing",
    "lesson",
    "bai giang",
    "bai hoc",
    "worksheet",
    "exercise",
    "bai tap",
    "practice",
    "luyen tap",
    "on tap",
    "revision",
    "student",
    "students",
    "hoc sinh",
    "teacher",
    "giao vien",
    "classroom",
    "question",
    "questions",
    "cau hoi",
    "answer",
    "answers",
    "dap an",
    "multiple choice",
    "choose the best answer",
    "fill in the blank",
    "passage",
    "paragraph",
    "dialogue",
    "sentence",
    "definition",
    "example",
    "examples",
    "topic",
    "unit",
    "tense",
    "passive voice",
    "reported speech",
    "relative clause",
    "relative clauses",
    "conditionals",
    "word formation",
    "collocation",
    "collocations",
    "idiom",
    "idioms",
    "synonym",
    "antonym",
    "thpt",
    "ielts",
    "toeic",
)

DASHBOARD_UI_TERMS = (
    "dashboard",
    "analytics",
    "metric",
    "metrics",
    "kpi",
    "overview",
    "conversion",
    "ctr",
    "impressions",
    "clicks",
    "sessions",
    "bounce rate",
    "active users",
    "monthly recurring revenue",
    "mrr",
    "arr",
    "revenue",
    "profit",
    "sales",
    "orders",
    "customers",
    "traffic",
    "funnel",
    "retention",
    "engagement",
    "signups",
    "installs",
    "workspace",
    "admin panel",
    "profile",
    "settings",
    "notification",
    "notifications",
    "search",
    "filter",
    "export",
    "login",
    "logout",
    "password",
    "username",
    "email",
)


@dataclass(frozen=True)
class UploadSafetyViolation(Exception):
    category: str
    public_detail: str
    matched_terms: tuple[str, ...] = ()

    def __str__(self) -> str:
        return self.public_detail


def _normalize_text(text: str) -> str:
    value = unicodedata.normalize("NFKD", str(text or "").casefold())
    value = value.replace("đ", "d")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return f" {value} " if value else " "


def _collect_matches(normalized_text: str, phrases: tuple[str, ...], limit: int = 6) -> tuple[str, ...]:
    matches: list[str] = []
    for phrase in phrases:
        if f" {phrase} " in normalized_text:
            matches.append(phrase)
            if len(matches) >= limit:
                break
    return tuple(matches)


def _build_scan_text(*parts: str) -> str:
    return "\n".join(str(part or "") for part in parts if str(part or "").strip())


def _ensure_no_unsafe_content(*, scan_text: str, subject_label: str, safe_content_hint: str) -> None:
    normalized = _normalize_text(scan_text[:MAX_SCAN_CHARS])
    if normalized == " ":
        return

    instruction_hits = _collect_matches(normalized, INSTRUCTION_CUES)

    nsfw_hits = _collect_matches(normalized, NSFW_TERMS)
    if nsfw_hits:
        raise UploadSafetyViolation(
            category="nsfw",
            public_detail=(
                f"{subject_label} bị từ chối vì chứa nội dung người lớn hoặc khiêu dâm không phù hợp. "
                f"Vui lòng {safe_content_hint}."
            ),
            matched_terms=nsfw_hits,
        )

    terror_direct_hits = _collect_matches(normalized, TERROR_DIRECT_TERMS)
    if terror_direct_hits:
        raise UploadSafetyViolation(
            category="terrorism",
            public_detail=(
                f"{subject_label} bị từ chối vì chứa nội dung khủng bố hoặc cực đoan bạo lực. "
                f"Vui lòng {safe_content_hint}."
            ),
            matched_terms=terror_direct_hits,
        )

    terror_context_hits = _collect_matches(normalized, TERROR_CONTEXT_TERMS)
    if terror_context_hits and instruction_hits:
        raise UploadSafetyViolation(
            category="terrorism",
            public_detail=(
                f"{subject_label} bị từ chối vì chứa hướng dẫn hoặc nội dung cổ vũ khủng bố/cực đoan bạo lực. "
                f"Vui lòng {safe_content_hint}."
            ),
            matched_terms=terror_context_hits + instruction_hits,
        )

    illegal_hits = _collect_matches(normalized, ILLEGAL_TARGET_TERMS)
    if illegal_hits and instruction_hits:
        raise UploadSafetyViolation(
            category="illegal",
            public_detail=(
                f"{subject_label} bị từ chối vì chứa hướng dẫn cho hành vi bất hợp pháp hoặc nguy hiểm. "
                f"Vui lòng {safe_content_hint}."
            ),
            matched_terms=illegal_hits + instruction_hits,
        )

    violence_hits = _collect_matches(normalized, GRAPHIC_VIOLENCE_TERMS)
    if len(violence_hits) >= 2 or (violence_hits and instruction_hits):
        raise UploadSafetyViolation(
            category="graphic_violence",
            public_detail=(
                f"{subject_label} bị từ chối vì chứa nội dung bạo lực nguy hiểm hoặc giết chóc không phù hợp. "
                f"Vui lòng {safe_content_hint}."
            ),
            matched_terms=violence_hits + instruction_hits,
        )

    obscene_hits = _collect_matches(normalized, OBSCENE_TERMS)
    if obscene_hits:
        raise UploadSafetyViolation(
            category="obscene",
            public_detail=(
                f"{subject_label} bị từ chối vì chứa nội dung tục tĩu hoặc phản cảm không phù hợp. "
                f"Vui lòng {safe_content_hint}."
            ),
            matched_terms=obscene_hits,
        )


def ensure_safe_upload_content(document_text: str, notes: str = "") -> None:
    safe_document = str(document_text or "")
    safe_notes = str(notes or "")
    combined = _build_scan_text(safe_notes, safe_document)
    _ensure_no_unsafe_content(
        scan_text=combined,
        subject_label="Tệp",
        safe_content_hint="tải lên tài liệu học tập an toàn và lành mạnh",
    )

    normalized = _normalize_text(combined[:MAX_SCAN_CHARS])
    normalized_document = _normalize_text(safe_document[:MAX_SCAN_CHARS])
    normalized_notes = _normalize_text(safe_notes[:MAX_SCAN_CHARS])
    if normalized == " ":
        return
    doc_teaching_hits = _collect_matches(normalized_document, TEACHING_RELEVANT_TERMS, limit=8)
    note_teaching_hits = _collect_matches(normalized_notes, TEACHING_RELEVANT_TERMS, limit=4)
    dashboard_hits = _collect_matches(normalized_document, DASHBOARD_UI_TERMS, limit=8)

    if not doc_teaching_hits:
        if len(dashboard_hits) >= 2:
            raise UploadSafetyViolation(
                category="non_teaching_content",
                public_detail=(
                    "Tệp bị từ chối vì trông giống ảnh giao diện, dashboard hoặc số liệu vận hành, "
                    "không phải học liệu để dạy/học Tiếng Anh. Vui lòng tải lên bài giảng, bài tập, "
                    "đề, đoạn đọc, từ vựng hoặc tài liệu giảng dạy liên quan đến Tiếng Anh."
                ),
                matched_terms=dashboard_hits,
            )

        raise UploadSafetyViolation(
            category="non_teaching_content",
            public_detail=(
                "Tệp bị từ chối vì chưa cho thấy đây là học liệu hoặc nội dung giảng dạy Tiếng Anh. "
                "Vui lòng tải lên bài giảng, bài tập, đề, đoạn đọc, từ vựng hoặc tài liệu phục vụ dạy/học."
            ),
            matched_terms=dashboard_hits or note_teaching_hits,
        )


def _iter_prompt_fragments(value: object) -> list[str]:
    if isinstance(value, str):
        text = value.strip()
        return [text] if text else []
    if isinstance(value, Mapping):
        out: list[str] = []
        for key, item in value.items():
            key_text = str(key or "")
            if key_text.startswith("__") or key_text == "presetId":
                continue
            out.extend(_iter_prompt_fragments(item))
        return out
    if isinstance(value, (list, tuple, set)):
        out: list[str] = []
        for item in value:
            out.extend(_iter_prompt_fragments(item))
        return out
    return []


def ensure_safe_generation_prompt(topic: str = "", form: Mapping[str, object] | None = None) -> None:
    fragments = [str(topic or "").strip()]
    if isinstance(form, Mapping):
        fragments.extend(_iter_prompt_fragments(form))
    combined = _build_scan_text(*fragments)
    _ensure_no_unsafe_content(
        scan_text=combined,
        subject_label="Yêu cầu",
        safe_content_hint="nhập chủ đề và ghi chú học tập an toàn, lành mạnh",
    )

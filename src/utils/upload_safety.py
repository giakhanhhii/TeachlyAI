from __future__ import annotations

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


def ensure_safe_upload_content(document_text: str, notes: str = "") -> None:
    combined = "\n".join(part for part in (notes, document_text) if str(part or "").strip())
    normalized = _normalize_text(combined[:MAX_SCAN_CHARS])
    if normalized == " ":
        return

    instruction_hits = _collect_matches(normalized, INSTRUCTION_CUES)

    nsfw_hits = _collect_matches(normalized, NSFW_TERMS)
    if nsfw_hits:
        raise UploadSafetyViolation(
            category="nsfw",
            public_detail=(
                "Tệp bị từ chối vì chứa nội dung người lớn hoặc khiêu dâm không phù hợp. "
                "Vui lòng tải lên tài liệu học tập an toàn và lành mạnh."
            ),
            matched_terms=nsfw_hits,
        )

    terror_direct_hits = _collect_matches(normalized, TERROR_DIRECT_TERMS)
    if terror_direct_hits:
        raise UploadSafetyViolation(
            category="terrorism",
            public_detail=(
                "Tệp bị từ chối vì chứa nội dung khủng bố hoặc cực đoan bạo lực. "
                "Vui lòng dùng tài liệu học tập an toàn."
            ),
            matched_terms=terror_direct_hits,
        )

    terror_context_hits = _collect_matches(normalized, TERROR_CONTEXT_TERMS)
    if terror_context_hits and instruction_hits:
        raise UploadSafetyViolation(
            category="terrorism",
            public_detail=(
                "Tệp bị từ chối vì chứa hướng dẫn hoặc nội dung cổ vũ khủng bố/cực đoan bạo lực. "
                "Vui lòng dùng tài liệu học tập an toàn."
            ),
            matched_terms=terror_context_hits + instruction_hits,
        )

    illegal_hits = _collect_matches(normalized, ILLEGAL_TARGET_TERMS)
    if illegal_hits and instruction_hits:
        raise UploadSafetyViolation(
            category="illegal",
            public_detail=(
                "Tệp bị từ chối vì chứa hướng dẫn cho hành vi bất hợp pháp hoặc nguy hiểm. "
                "Vui lòng tải lên tài liệu học tập phù hợp."
            ),
            matched_terms=illegal_hits + instruction_hits,
        )

    violence_hits = _collect_matches(normalized, GRAPHIC_VIOLENCE_TERMS)
    if len(violence_hits) >= 2 or (violence_hits and instruction_hits):
        raise UploadSafetyViolation(
            category="graphic_violence",
            public_detail=(
                "Tệp bị từ chối vì chứa nội dung bạo lực nguy hiểm hoặc giết chóc không phù hợp. "
                "Vui lòng tải lên tài liệu học tập an toàn."
            ),
            matched_terms=violence_hits + instruction_hits,
        )

    obscene_hits = _collect_matches(normalized, OBSCENE_TERMS)
    if obscene_hits:
        raise UploadSafetyViolation(
            category="obscene",
            public_detail=(
                "Tệp bị từ chối vì chứa nội dung tục tĩu hoặc phản cảm không phù hợp. "
                "Vui lòng tải lên tài liệu học tập lành mạnh."
            ),
            matched_terms=obscene_hits,
        )

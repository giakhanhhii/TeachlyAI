"""Dịch từ/cụm EN→VI cho flashcard (OpenAI: tối thiểu 2 nghĩa Việt gần nhất, tối đa 3 nếu có)."""

from __future__ import annotations

import json
import os
import re
import unicodedata
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
from threading import Lock
from typing import Final

from .config import FLASH_TRANSLATE_OPENAI_MODEL, OPENAI_API_KEY
from .flash_translate_clients import get_openai_flash_client

_BATCH_CHUNK_SIZE: Final[int] = max(8, min(96, int(os.getenv("FLASH_TRANSLATE_CHUNK_SIZE", "72"))))
_PARALLEL_CHUNKS: Final[int] = max(1, min(6, int(os.getenv("FLASH_TRANSLATE_PARALLEL_CHUNKS", "3"))))

# Tăng khi đổi quy tắc gloss / prompt — tránh LRU + chunk cache giữ bản cũ 1 nghĩa.
_GLOSS_POLICY_VERSION: Final[int] = 3

_CHUNK_CACHE: "OrderedDict[tuple[int, tuple[str, ...]], dict[str, str]]" = OrderedDict()
_CHUNK_CACHE_MAX: Final[int] = max(64, min(2000, int(os.getenv("FLASH_TRANSLATE_CACHE_MAX", "512"))))
_chunk_cache_lock = Lock()


def _choice_text(resp: object) -> str:
    ch = getattr(resp, "choices", None) or []
    c0 = ch[0] if ch else None
    msg = getattr(c0, "message", None) if c0 else None
    raw = getattr(msg, "content", None) if msg else None
    return (raw or "") if isinstance(raw, str) else ""


def _dedupe_terms_preserve_order(terms: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in terms:
        t = (raw or "").strip()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


def _extract_first_json_object(text: str) -> dict:
    s = (text or "").strip()
    if "```" in s:
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE | re.MULTILINE)
        s = re.sub(r"\s*```\s*$", "", s).strip()
    start = s.find("{")
    end = s.rfind("}")
    if start < 0 or end < start:
        raise ValueError("Model không trả về JSON object.")
    last_error: Exception | None = None
    for stop in range(end + 1, start, -1):
        if s[stop - 1] != "}":
            continue
        try:
            obj = json.loads(s[start:stop])
        except json.JSONDecodeError as exc:
            last_error = exc
            continue
        if not isinstance(obj, dict):
            raise ValueError("JSON phải là object.")
        return obj
    raise ValueError("Không parse được JSON object.") from last_error


def _chunk_cache_key(terms: tuple[str, ...]) -> tuple[int, tuple[str, ...]]:
    return (_GLOSS_POLICY_VERSION, terms)


def _chunk_cache_get(terms: tuple[str, ...]) -> dict[str, str] | None:
    key = _chunk_cache_key(terms)
    with _chunk_cache_lock:
        hit = _CHUNK_CACHE.get(key)
        if hit is not None:
            _CHUNK_CACHE.move_to_end(key)
            return hit.copy()
    return None


def _chunk_cache_set(terms: tuple[str, ...], value: dict[str, str]) -> None:
    key = _chunk_cache_key(terms)
    with _chunk_cache_lock:
        _CHUNK_CACHE[key] = value.copy()
        _CHUNK_CACHE.move_to_end(key)
        while len(_CHUNK_CACHE) > _CHUNK_CACHE_MAX:
            _CHUNK_CACHE.popitem(last=False)


def _flash_terms_translate_batch_one(ordered: list[str]) -> dict[str, str]:
    """Một lần gọi LLM cho một chunk."""
    if not ordered:
        return {}
    for t in ordered:
        if len(t) > 240:
            raise ValueError("term quá dài (tối đa 240 ký tự)")

    n = len(ordered)
    client = get_openai_flash_client()
    model = (FLASH_TRANSLATE_OPENAI_MODEL or "gpt-4o-mini").strip() or "gpt-4o-mini"

    lines = "\n".join(f"{i + 1}.{item}" for i, item in enumerate(ordered))
    sys_msg = (
        "EN→VI flashcard back. For EACH numbered English item, output EXACTLY 2 or 3 Vietnamese glosses "
        "(most common sense first), separated by comma+space. If a word truly has only one sense, add the "
        "closest common synonym or near-sense as the second gloss. Never output a single gloss without a comma. "
        'Only JSON: {"g":["…"]} — exactly n strings, same order, no markdown.'
    )
    user_msg = f"n={n}\n{lines}\nJSON g len {n}. Each g[i] must look like: nghĩa một, nghĩa hai or a, b, c."
    max_tokens = min(32 + n * 32, 1600)

    messages = [{"role": "system", "content": sys_msg}, {"role": "user", "content": user_msg}]
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.05,
    )
    raw_text = " ".join(_choice_text(resp).split()).strip()
    obj = _extract_first_json_object(raw_text)
    g = obj.get("g")
    if not isinstance(g, list):
        raise ValueError('JSON phải có khóa "g" là mảng.')
    out: dict[str, str] = {}
    for i, key in enumerate(ordered):
        cell = g[i] if i < len(g) else ""
        gloss = _clamp_vietnamese_glosses(str(cell) if cell is not None else "")
        if _gloss_segment_count(gloss) < 2:
            gloss = _repair_min_two_glosses(key, strict=False)
        gloss = _clamp_vietnamese_glosses(gloss)
        if _gloss_segment_count(gloss) < 2:
            gloss = _repair_min_two_glosses(key, strict=True)
        gloss = _clamp_vietnamese_glosses(gloss)
        if gloss:
            out[key] = gloss
    return out


def _translate_one_chunk_cached(chunk: list[str]) -> dict[str, str]:
    terms_key = tuple(chunk)
    cached = _chunk_cache_get(terms_key)
    if cached is not None:
        return cached
    fresh = _flash_terms_translate_batch_one(chunk)
    if fresh:
        _chunk_cache_set(terms_key, fresh)
    return fresh


def flash_terms_translate_batch(terms: list[str]) -> dict[str, str]:
    """Dịch nhiều mục EN→VI: cache theo chunk + song song nhiều chunk khi danh sách dài."""
    ordered = _dedupe_terms_preserve_order(terms)
    if not ordered:
        return {}
    chunks = [ordered[i : i + _BATCH_CHUNK_SIZE] for i in range(0, len(ordered), _BATCH_CHUNK_SIZE)]
    if len(chunks) == 1:
        return _translate_one_chunk_cached(chunks[0])

    workers = min(_PARALLEL_CHUNKS, len(chunks))
    if workers <= 1:
        merged: dict[str, str] = {}
        for c in chunks:
            merged.update(_translate_one_chunk_cached(c))
        return merged

    merged = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_translate_one_chunk_cached, c): c for c in chunks}
        for fut in as_completed(futures):
            merged.update(fut.result())
    return merged


def _normalize_gloss_string(raw: str) -> str:
    """NFKC + đổi dấu phẩy/chấm phẩy fullwidth → ASCII (model hay trả ，)."""
    s = (raw or "").strip()
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s)
    trans = str.maketrans(
        {
            "\uff0c": ",",
            "\uff1b": ";",
            "\u3001": ",",
            "\ufe50": ",",
            "\ufe51": ",",
        }
    )
    s = s.translate(trans)
    return " ".join(s.split()).strip()


def _split_gloss_candidates(raw: str) -> list[str]:
    s = _normalize_gloss_string(raw)
    if not s:
        return []
    return [p for p in (" ".join(x.split()).strip() for x in re.split(r"[,;/|\u2013\u2014]+", s)) if p]


def _unique_gloss_chunks(pieces: list[str], *, max_glosses: int) -> list[str]:
    seen_lower: set[str] = set()
    chunks: list[str] = []
    for p in pieces:
        key = p.lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        chunks.append(p)
        if len(chunks) >= max_glosses:
            break
    return chunks


def _gloss_segment_count(s: str) -> int:
    """Số nghĩa sau chuẩn hoá — cùng logic tách/dedupe tối đa 3 với _clamp_vietnamese_glosses."""
    chunks = _unique_gloss_chunks(_split_gloss_candidates(s), max_glosses=3)
    if chunks:
        return len(chunks)
    t = _normalize_gloss_string(s)
    return 1 if t else 0


def _clamp_vietnamese_glosses(raw: str, *, max_glosses: int = 3) -> str:
    """Chuẩn hoá: tách theo dấu phẩy/chấm phẩy/gạch; giữ tối đa max_glosses cụm có nội dung."""
    chunks = _unique_gloss_chunks(_split_gloss_candidates(raw), max_glosses=max_glosses)
    if not chunks:
        s = _normalize_gloss_string(raw)
        return s[:160].strip() if s else ""
    return ", ".join(chunks[:max_glosses])


def _repair_min_two_glosses(term: str, *, strict: bool = False) -> str:
    """Gọi bổ sung khi chỉ có 1 nghĩa — bắt buộc 2–3 gloss tiếng Việt, không dùng lru_cache."""
    t = (term or "").strip()
    if not t:
        return ""
    client = get_openai_flash_client()
    model = (FLASH_TRANSLATE_OPENAI_MODEL or "gpt-4o-mini").strip() or "gpt-4o-mini"
    if strict:
        sys_msg = (
            "EN→VI flashcard FIX. Previous answers had fewer than 2 glosses. Reply ONE line ONLY. "
            "Format MUST be: Vietnamese1, Vietnamese2 — ASCII comma between glosses, no other punctuation "
            "between glosses. Exactly 2 or 3 glosses; most common sense first; 2nd is synonym or near-sense. "
            "No English, no quotes, no numbering, no explanation."
        )
        user_msg = f'English: "{t}" → one line: nghĩa_một, nghĩa_hai (ASCII commas only).'
    else:
        sys_msg = (
            "EN→VI flashcard. Reply with ONE line only: exactly 2 or 3 Vietnamese glosses for the English, "
            "comma+space, most common first. If one dictionary sense dominates, second is a close synonym. "
            "No English words, no quotes, no explanation."
        )
        user_msg = f'"{t}" → one line (2 or 3 glosses, commas).'
    messages = [{"role": "system", "content": sys_msg}, {"role": "user", "content": user_msg}]
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=120,
        temperature=0.08 if strict else 0.05,
    )
    text = " ".join(_choice_text(resp).split()).strip()
    return _clamp_vietnamese_glosses(text, max_glosses=3)


@lru_cache(maxsize=768)
def _single_openai_cached(t: str, policy_ver: int) -> str:
    client = get_openai_flash_client()
    model = (FLASH_TRANSLATE_OPENAI_MODEL or "gpt-4o-mini").strip() or "gpt-4o-mini"
    messages = [
        {
            "role": "system",
            "content": (
                "EN→VI flashcard back: reply ONE line with exactly 2 or 3 closest Vietnamese senses, comma+space "
                "(e.g. mới, mới mẻ, mới tin). Most common first. If one sense dominates, add synonym as 2nd. "
                "No English, no quotes, no explanation."
            ),
        },
        {"role": "user", "content": f'"{t}" → one line VI (2 or 3 glosses, commas).'},
    ]
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=96,
        temperature=0.05,
    )
    text = " ".join(_choice_text(resp).split()).strip()
    text = _clamp_vietnamese_glosses(text, max_glosses=3)
    if _gloss_segment_count(text) < 2:
        text = _repair_min_two_glosses(t, strict=False)
    text = _clamp_vietnamese_glosses(text, max_glosses=3)
    if _gloss_segment_count(text) < 2:
        text = _repair_min_two_glosses(t, strict=True)
    text = _clamp_vietnamese_glosses(text, max_glosses=3)
    return text[:220].rstrip() if len(text) > 220 else text


def flash_term_translate_en_to_vi(term: str) -> str:
    t = (term or "").strip()
    if not t:
        raise ValueError("term rỗng")
    if len(t) > 240:
        raise ValueError("term quá dài (tối đa 240 ký tự)")
    if not (OPENAI_API_KEY or "").strip():
        raise ValueError("OPENAI_API_KEY chưa cấu hình trong .env")
    return _single_openai_cached(t, _GLOSS_POLICY_VERSION)

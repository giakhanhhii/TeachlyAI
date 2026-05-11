"""AI content generation for slide / quiz / flashcard using GPT-4o Mini."""

from __future__ import annotations

import json
import logging
import random
from typing import Any

from .flash_translate_clients import get_openai_flash_client
from .config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

AI_CONTENT_MODEL = "gpt-4o-mini"

TOPIC_POOL: list[str] = [
    "Phrasal verbs with GET",
    "Phrasal verbs with MAKE",
    "Phrasal verbs with TAKE",
    "Phrasal verbs with PUT",
    "Phrasal verbs with GIVE",
    "Common English idioms (body parts)",
    "Business English vocabulary",
    "Travel and tourism vocabulary",
    "Academic word list — science",
    "Academic word list — society",
    "IELTS common vocabulary",
    "Collocations with MAKE and DO",
    "Collocations with TAKE and HAVE",
    "Adjective-noun collocations",
    "Verb-noun collocations (everyday)",
    "English prefixes and meanings",
    "English suffixes and word forms",
    "Synonyms for common verbs",
    "Synonyms for common adjectives",
    "Antonyms for academic words",
    "Technology and digital vocabulary",
    "Environment and climate vocabulary",
    "Health and medicine vocabulary",
    "Education and learning vocabulary",
    "Work and career vocabulary",
    "Food and cooking vocabulary",
    "Sports and fitness vocabulary",
    "Money and finance vocabulary",
    "Social media and internet vocabulary",
    "Emotions and feelings vocabulary",
    "Time expressions in English",
    "Linking words and discourse markers",
    "Conditional sentences types",
    "Reported speech key verbs",
    "Passive voice usage",
    "Gerunds and infinitives",
    "Modal verbs meanings",
    "Question tags patterns",
    "Comparative and superlative forms",
    "Common English mistakes",
]

_SLIDE_SYSTEM = """You are an English learning content creator for Vietnamese students.
Generate a JSON slide deck about the given English topic.

Rules:
- Exactly 10 slides
- Each slide: "title" (3-6 words) and "bullets" (array of 3-4 items)
- Each bullet: max 7 words, clear and useful
- Keep titles and bullets SHORT to avoid overflow
- Content must be genuinely educational about the topic
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<deck title>","slides":[{"id":"s1","title":"<slide title>","bullets":["<bullet>","<bullet>","<bullet>"]},...]}"""

_QUIZ_SYSTEM = """You are an English learning quiz creator for Vietnamese students.
Generate a JSON quiz about the given English topic.

Rules:
- Exactly 10 questions
- Each question: "text" (the question), "options" (4 short choices A-D), "correctIndex" (0-3), "hint" (1 sentence explanation in Vietnamese or English)
- Options must be SHORT (1-5 words each), no A./B./C./D. prefixes in options array
- Questions test practical knowledge of the topic
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<quiz title>","questions":[{"id":"q1","text":"<question>","options":["<A>","<B>","<C>","<D>"],"correctIndex":0,"hint":"<hint>"},...]}"""

_FLASH_SYSTEM = """You are an English flashcard creator for Vietnamese students.
Generate a JSON flashcard set about the given English topic.

Rules:
- Exactly 20 cards
- Each card: "front" (English word or short phrase, max 4 words), "phonetic" (IPA), "back" (Vietnamese definition OR English definition, max 12 words), "hint" (brief usage note, max 8 words)
- Keep "back" SHORT — max 12 words
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<set title>","cards":[{"id":"c1","front":"<word>","phonetic":"/<ipa>/","back":"<definition>","hint":"<usage note>"},...]}"""


def _call_openai(system: str, user: str, max_tokens: int) -> str:
    client = get_openai_flash_client()
    resp = client.chat.completions.create(
        model=AI_CONTENT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0.8,
    )
    return resp.choices[0].message.content or ""


def _parse_json_response(raw: str, kind: str) -> dict[str, Any]:
    text = raw.strip()
    # Strip markdown fences if model included them despite instructions
    if text.startswith("```"):
        lines = text.splitlines()
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error("AI content JSON parse error (%s): %s | raw=%s", kind, exc, text[:400])
        raise ValueError(f"Model returned invalid JSON for {kind}") from exc


def generate_slide_content(topic: str) -> dict[str, Any]:
    """Generate a 10-slide deck about topic. Returns mock-compatible JSON."""
    user_msg = f"Topic: {topic}\nGenerate the slide deck JSON now."
    raw = _call_openai(_SLIDE_SYSTEM, user_msg, max_tokens=1800)
    data = _parse_json_response(raw, "slide")
    # Validate basic shape
    if not isinstance(data.get("slides"), list):
        raise ValueError("AI slide response missing 'slides' array")
    # Ensure ids exist
    for i, s in enumerate(data["slides"]):
        if not s.get("id"):
            s["id"] = f"ai_s{i + 1}"
        # Clamp bullets to 4 per slide
        if isinstance(s.get("bullets"), list) and len(s["bullets"]) > 5:
            s["bullets"] = s["bullets"][:4]
    return data


def generate_quiz_content(topic: str) -> dict[str, Any]:
    """Generate a 10-question quiz about topic. Returns mock-compatible JSON."""
    user_msg = f"Topic: {topic}\nGenerate the quiz JSON now."
    raw = _call_openai(_QUIZ_SYSTEM, user_msg, max_tokens=2400)
    data = _parse_json_response(raw, "quiz")
    if not isinstance(data.get("questions"), list):
        raise ValueError("AI quiz response missing 'questions' array")
    for i, q in enumerate(data["questions"]):
        if not q.get("id"):
            q["id"] = f"ai_q{i + 1}"
        # Clamp options to exactly 4
        opts = q.get("options") or []
        if len(opts) > 4:
            q["options"] = opts[:4]
        if isinstance(q.get("correctIndex"), int):
            q["correctIndex"] = max(0, min(3, q["correctIndex"]))
        else:
            q["correctIndex"] = 0
    return data


def generate_flash_content(topic: str) -> dict[str, Any]:
    """Generate 20 flashcards about topic. Returns mock-compatible JSON."""
    user_msg = f"Topic: {topic}\nGenerate the flashcard JSON now."
    raw = _call_openai(_FLASH_SYSTEM, user_msg, max_tokens=2800)
    data = _parse_json_response(raw, "flashcard")
    if not isinstance(data.get("cards"), list):
        raise ValueError("AI flashcard response missing 'cards' array")
    for i, c in enumerate(data["cards"]):
        if not c.get("id"):
            c["id"] = f"ai_c{i + 1}"
    return data


def generate_fullset_content() -> dict[str, Any]:
    """Generate slide + quiz + flashcard for the SAME random topic.

    Returns:
        {"slide": {...}, "quiz": {...}, "flashcard": {...}}
    """
    topic = random.choice(TOPIC_POOL)
    logger.info("AI fullset generation: topic=%s", topic)

    import concurrent.futures

    def _gen_slide() -> dict[str, Any]:
        return generate_slide_content(topic)

    def _gen_quiz() -> dict[str, Any]:
        return generate_quiz_content(topic)

    def _gen_flash() -> dict[str, Any]:
        return generate_flash_content(topic)

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        f_slide = pool.submit(_gen_slide)
        f_quiz = pool.submit(_gen_quiz)
        f_flash = pool.submit(_gen_flash)
        slide_data = f_slide.result()
        quiz_data = f_quiz.result()
        flash_data = f_flash.result()

    return {
        "slide": slide_data,
        "quiz": quiz_data,
        "flashcard": flash_data,
        "topic": topic,
    }


# ---------------------------------------------------------------------------
# Autofill helpers — lightweight calls that return form field values only
# ---------------------------------------------------------------------------

_AUTOFILL_SLIDE_SYSTEM = """You generate form autofill data for an English learning slide deck creation form (Vietnamese THPT students).
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"topic": "<English topic in Vietnamese, 3-8 words>", "count": 10, "structure": "Giới thiệu → Ví dụ → Luyện tập", "notes": ""}
Rules:
- topic: a specific, useful English grammar/vocabulary/skill topic (in Vietnamese). Must be fresh and varied.
- count: integer between 10 and 15
- structure: 3 short Vietnamese steps joined by " → "
- notes: empty string"""

_AUTOFILL_QUIZ_SYSTEM = """You generate form autofill data for an English quiz creation form (Vietnamese THPT students).
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"source": "<English topic in Vietnamese>", "kind": "<quiz type>", "count": 20, "difficulty": "<level>", "notes": ""}
Rules:
- source: a specific English grammar/vocabulary/skill topic (in Vietnamese)
- kind: one of exactly: Từ vựng | Ngữ pháp | Phát âm | Đọc hiểu | Giao tiếp
- count: 15 or 20
- difficulty: one of exactly: Mất gốc | Cơ bản | Khá | Nâng cao
- notes: empty string"""

_AUTOFILL_FLASH_SYSTEM = """You generate form autofill data for a flashcard creation form (Vietnamese THPT English learners).
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"list": "<topic description in Vietnamese, 1-2 sentences>", "back": "Nghĩa tiếng Việt, Phiên âm, Ví dụ", "count": 20, "notes": ""}
Rules:
- list: 1 sentence describing the specific English vocabulary topic to cover (in Vietnamese)
- back: always exactly the string "Nghĩa tiếng Việt, Phiên âm, Ví dụ"
- count: always 20
- notes: empty string"""

_AUTOFILL_FULLSET_SYSTEM = """You generate form autofill data for a full-set (slide + quiz + flashcard) creation form (Vietnamese THPT English learners).
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"topic": "<English topic in Vietnamese>", "level": "<level>", "slides": 10, "quiz": 20, "flash": 10, "extra": ""}
Rules:
- topic: a specific English grammar/vocabulary/skill topic (in Vietnamese)
- level: one of exactly: Mất gốc | Cơ bản | Khá | Nâng cao
- slides + quiz + flash must be <= 40 and each >= 1
- extra: empty string"""


def generate_autofill_slide() -> dict[str, Any]:
    """Return form field values for a slide deck autofill (no full content)."""
    raw = _call_openai(_AUTOFILL_SLIDE_SYSTEM, "Generate a fresh autofill JSON now.", max_tokens=120)
    data = _parse_json_response(raw, "autofill_slide")
    data.setdefault("topic", "Phrasal verbs thông dụng")
    data["count"] = max(10, min(15, int(data.get("count") or 10)))
    data.setdefault("structure", "Giới thiệu → Ví dụ → Luyện tập")
    data["notes"] = ""
    return data


def generate_autofill_quiz() -> dict[str, Any]:
    """Return form field values for a quiz autofill (no full content)."""
    _VALID_KINDS = {"Từ vựng", "Ngữ pháp", "Phát âm", "Đọc hiểu", "Giao tiếp"}
    _VALID_LEVELS = {"Mất gốc", "Cơ bản", "Khá", "Nâng cao"}
    raw = _call_openai(_AUTOFILL_QUIZ_SYSTEM, "Generate a fresh autofill JSON now.", max_tokens=120)
    data = _parse_json_response(raw, "autofill_quiz")
    data.setdefault("source", "Từ vựng tiếng Anh thông dụng")
    if data.get("kind") not in _VALID_KINDS:
        data["kind"] = "Từ vựng"
    data["count"] = 20 if int(data.get("count") or 20) > 17 else 15
    if data.get("difficulty") not in _VALID_LEVELS:
        data["difficulty"] = "Khá"
    data["notes"] = ""
    return data


def generate_autofill_flash() -> dict[str, Any]:
    """Return form field values for a flashcard autofill (no full content)."""
    raw = _call_openai(_AUTOFILL_FLASH_SYSTEM, "Generate a fresh autofill JSON now.", max_tokens=120)
    data = _parse_json_response(raw, "autofill_flash")
    data.setdefault("list", "Từ vựng tiếng Anh học thuật")
    data["back"] = "Nghĩa tiếng Việt, Phiên âm, Ví dụ"
    data["count"] = 20
    data["notes"] = ""
    return data


def generate_autofill_fullset() -> dict[str, Any]:
    """Return form field values for a fullset autofill (no full content)."""
    _VALID_LEVELS = {"Mất gốc", "Cơ bản", "Khá", "Nâng cao"}
    raw = _call_openai(_AUTOFILL_FULLSET_SYSTEM, "Generate a fresh autofill JSON now.", max_tokens=120)
    data = _parse_json_response(raw, "autofill_fullset")
    data.setdefault("topic", "Từ vựng tiếng Anh học thuật")
    if data.get("level") not in _VALID_LEVELS:
        data["level"] = "Khá"
    slides = max(1, min(30, int(data.get("slides") or 10)))
    quiz = max(1, int(data.get("quiz") or 20))
    flash = max(1, int(data.get("flash") or 10))
    # clamp sum to 40
    total = slides + quiz + flash
    if total > 40:
        excess = total - 40
        quiz = max(1, quiz - excess)
        total = slides + quiz + flash
        if total > 40:
            flash = max(1, flash - (total - 40))
    data["slides"] = slides
    data["quiz"] = quiz
    data["flash"] = flash
    data["extra"] = ""
    return data

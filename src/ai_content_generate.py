"""AI content generation for slide / quiz / flashcard using GPT-4o Mini."""

from __future__ import annotations

import json
import logging
import random
import re
from typing import Any

from .flash_translate_clients import get_openai_flash_client
from .config import OPENAI_API_KEY

logger = logging.getLogger(__name__)

AI_CONTENT_MODEL = "gpt-4o-mini"

TOPIC_POOL: list[str] = [
    # Grammar — THPT core
    "Passive voice across all tenses",
    "Conditional sentences types 1, 2 and 3",
    "Relative clauses and reduced relative clauses",
    "Reported speech: statements, questions and commands",
    "Modal verbs: must, should, could, may, might",
    "Modal perfect: must have, should have, might have",
    "Word formation: nouns, adjectives, adverbs and verbs",
    "Subject-verb agreement in special cases",
    "Gerunds and infinitives",
    "Inversion in conditional and emphatic sentences",
    "Comparative, superlative and double comparatives",
    "Conjunctions and linking words",
    "Articles and determiners",
    "Question tags",
    # Vocabulary — THPT themes
    "Technology and artificial intelligence vocabulary",
    "Urbanisation, rural migration and city life",
    "Environment, climate change and deforestation",
    "Endangered languages and cultural preservation",
    "Education, schools and modern learning methods",
    "Health, medicine and public health",
    "Tourism, travel and leisure activities",
    "Social media, internet and digital communication",
    "Career, employment and workplace vocabulary",
    "Globalisation and cultural exchange",
    "Science, robotics and innovation vocabulary",
    "Food, nutrition and sustainable living",
    # Reading comprehension skills
    "Reading: identifying main ideas and supporting details",
    "Reading: inference and implied meaning",
    "Reading: word meaning in context and paraphrase",
    "Reading: causal relationships in academic texts",
    "Reading: inserting a sentence into a paragraph",
    # Cloze and fill-in-the-blank skills
    "Collocations and fixed phrases in context",
    "Phrasal verbs with GET, MAKE, TAKE and PUT",
    "Discourse markers and linking expressions",
    "Prepositions after adjectives, verbs and nouns",
    "Word form selection in cloze passages",
    # Sentence arrangement and writing
    "Arranging sentences in a logical conversation",
    "Arranging sentences to form a coherent paragraph",
    "Sentence transformation and rewriting techniques",
    "Error identification and correction",
]

_SLIDE_SYSTEM = """You are an English learning content creator for Vietnamese students.
Generate a JSON slide deck about the given English topic and follow the requested form constraints.

Rules:
- Use exactly the requested number of slides. If no count is requested, use 10 slides.
- FIRST slide (cover): "title" = ONE short headline (max 10 words, max ~72 characters) that names the topic clearly — do NOT paste the full raw topic string, do NOT stack keywords with slashes, do NOT use ALL CAPS blocks. This title must fit a 16:9 slide header without clipping.
- FIRST slide: exactly 2 or 3 bullets only; each bullet max 14 words; concise English only; do NOT repeat the full topic phrase in every bullet.
- Slides 2+: "title" max 8 words; 3 bullets each; each bullet max 18 words (one clear sentence each).
- No filler like repeating the same long topic label in every bullet.
- Deck "title" field: short deck name (max 12 words).
- Content must be genuinely educational about the topic.
- LANGUAGE RULE (HARD): ALL fields — deck title, slide titles, bullets — MUST be written in English. NEVER use Vietnamese in any field.
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<deck title>","slides":[{"id":"s1","title":"<short cover headline>","bullets":["<bullet>","<bullet>"]},...]}"""

_QUIZ_SYSTEM = """You are an English learning quiz creator for Vietnamese students.
Generate a JSON quiz about the given English topic and follow the requested form constraints.

Rules:
- Use exactly the requested number of questions. If no count is requested, use 10 questions.
- Each question: "text" (the question), "options" (4 short choices A-D), "correctIndex" (0-3), "hint" (1 sentence explanation)
- Options must be SHORT (1-5 words each), no A./B./C./D. prefixes in options array
- Questions test practical knowledge of the topic
- LANGUAGE RULE (HARD): ALL fields — title, text, options, hint — MUST be written in English. NEVER use Vietnamese in any field. This is an English-learning app; mixing Vietnamese defeats the purpose.
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<quiz title>","questions":[{"id":"q1","text":"<question>","options":["<A>","<B>","<C>","<D>"],"correctIndex":0,"hint":"<hint>"},...]}"""

_FLASH_SYSTEM = """You are an English flashcard creator for Vietnamese students.
Generate a JSON flashcard set about the given English topic and follow the requested form constraints.

Rules:
- Use exactly the requested number of cards. If no count is requested, use 20 cards.
- Each card:
  - "front": English word or short phrase (max 4 words) — MUST be in English
  - "phonetic": IPA transcription
  - "back": short English meaning or definition (max 12 words) — MUST be in English
  - "hint": short English example sentence or usage note (max 8 words) — MUST be in English
- LANGUAGE RULE (HARD): front, back, hint, and title MUST all be English. No Vietnamese is allowed anywhere.
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<set title>","cards":[{"id":"c1","front":"<word>","phonetic":"/<ipa>/","back":"<English meaning>","hint":"<English example>"},...]}"""


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


def _sanitize_topic(topic: str) -> str:
    """Collapse whitespace/control chars and cap length to block prompt injection."""
    return " ".join(topic.split())[:200]


def _sanitize_note(value: Any, *, max_len: int = 300) -> str:
    return " ".join(str(value or "").split())[:max_len]


def _sanitize_multiline(value: Any, *, max_len: int = 500) -> str:
    lines = [line.strip() for line in str(value or "").replace("\r", "\n").split("\n")]
    cleaned = [line for line in lines if line]
    return "\n".join(cleaned)[:max_len]


def _coerce_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        num = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, num))


def _append_form_line(lines: list[str], label: str, value: str) -> None:
    text = _sanitize_note(value)
    if text:
        lines.append(f"{label}: {text}")


def _clamp_line(text: str, max_chars: int) -> str:
    """Single-line clamp for slide titles and bullets (16:9 safe)."""
    s = " ".join(str(text or "").split())
    if len(s) <= max_chars:
        return s
    cut = s[: max_chars - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:") + "…"


def _short_cover_title(topic: str, *, max_chars: int = 78, max_words: int = 11) -> str:
    """Cover slide headline — short enough for professional split themes (e.g. 1.thptqg)."""
    t = " ".join(str(topic or "").split())
    if not t:
        return "Topic"
    words = t.split()
    if len(words) > max_words:
        return _clamp_line(" ".join(words[:max_words]), max_chars + 8)
    if len(t) > max_chars:
        return _clamp_line(t, max_chars)
    return t


def _normalize_ai_slide_deck(data: dict[str, Any], topic: str) -> None:
    """Clamp titles/bullets so decks fit slide shells (cover slide overflow)."""
    slides = data.get("slides")
    if not isinstance(slides, list):
        return
    for idx, s in enumerate(slides):
        if not isinstance(s, dict):
            continue
        tit = s.get("title")
        max_title = 82 if idx == 0 else 72
        if isinstance(tit, str) and tit.strip():
            s["title"] = _clamp_line(tit, max_title)
        elif idx == 0:
            s["title"] = _short_cover_title(topic)
        bullets = s.get("bullets")
        if not isinstance(bullets, list):
            continue
        max_bullets = 3 if idx == 0 else 4
        max_chars_b = 150 if idx == 0 else 200
        out: list[str] = []
        for b in bullets[:max_bullets]:
            if isinstance(b, str) and b.strip():
                out.append(_clamp_line(b, max_chars_b))
        s["bullets"] = out


def _clone_slide_item(slide: dict[str, Any], index: int, topic: str) -> dict[str, Any]:
    bullets_raw = slide.get("bullets")
    bullets = [str(item).strip() for item in bullets_raw] if isinstance(bullets_raw, list) else []
    cloned = {
        "id": f"ai_s{index + 1}",
        "title": str(slide.get("title") or (_short_cover_title(topic) if index == 0 else f"Practice point {index}")).strip(),
        "bullets": [bullet for bullet in bullets if bullet],
    }
    if not cloned["bullets"]:
        cloned["bullets"] = (
            [f"Introduction to {topic}", f"Key ideas to notice", f"Practice with clear examples"]
            if index == 0
            else [f"Key idea from {topic}", "Review one useful example", "Recall the main takeaway"]
        )
    return cloned


def _clone_quiz_item(question: dict[str, Any], index: int, topic: str) -> dict[str, Any]:
    options_raw = question.get("options")
    options = [str(item).strip() for item in options_raw] if isinstance(options_raw, list) else []
    cloned = {
        "id": f"ai_q{index + 1}",
        "text": str(question.get("text") or f"Which idea best matches {topic}?").strip(),
        "options": options[:4] if options else ["Main idea", "Example", "Counterpoint", "Detail"],
        "hint": str(question.get("hint") or f"Review the key point about {topic}.").strip(),
    }
    while len(cloned["options"]) < 4:
        cloned["options"].append(f"Option {len(cloned['options']) + 1}")
    cloned["correctIndex"] = _resolve_quiz_correct_index(question if question else cloned)
    return cloned


def _clone_flash_item(card: dict[str, Any], index: int, topic: str) -> dict[str, Any]:
    cloned = {
        "id": f"ai_c{index + 1}",
        "front": str(card.get("front") or f"{topic.split()[0]} term").strip(),
        "phonetic": str(card.get("phonetic") or "/tɜːm/").strip(),
        "back": str(card.get("back") or "Useful English meaning").strip(),
        "hint": str(card.get("hint") or f"Used when discussing {topic}.").strip(),
    }
    return cloned


def _ensure_exact_items(
    items: list[Any],
    count: int,
    *,
    kind: str,
    topic: str,
) -> list[dict[str, Any]]:
    safe_count = max(0, int(count))
    if safe_count == 0:
        return []

    cleaned = [item for item in items if isinstance(item, dict)]
    seeds = cleaned[:]

    if kind == "slide":
        if not seeds:
            seeds = [_clone_slide_item({}, 0, topic)]
        out = [_clone_slide_item(item, index, topic) for index, item in enumerate(cleaned[:safe_count])]
        while len(out) < safe_count:
            out.append(_clone_slide_item(seeds[len(out) % len(seeds)], len(out), topic))
        return out

    if kind == "quiz":
        if not seeds:
            seeds = [_clone_quiz_item({}, 0, topic)]
        out = [_clone_quiz_item(item, index, topic) for index, item in enumerate(cleaned[:safe_count])]
        while len(out) < safe_count:
            out.append(_clone_quiz_item(seeds[len(out) % len(seeds)], len(out), topic))
        return out

    if not seeds:
        seeds = [_clone_flash_item({}, 0, topic)]
    out = [_clone_flash_item(item, index, topic) for index, item in enumerate(cleaned[:safe_count])]
    while len(out) < safe_count:
        out.append(_clone_flash_item(seeds[len(out) % len(seeds)], len(out), topic))
    return out


def _normalize_option_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _clamp_quiz_index(value: int) -> int:
    return max(0, min(3, int(value)))


def _index_from_choice_token(raw: Any, *, prefer_zero_based: bool) -> int | None:
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int):
        if prefer_zero_based:
            return _clamp_quiz_index(raw)
        if 1 <= raw <= 4:
            return raw - 1
        if 0 <= raw <= 3:
            return raw
        return _clamp_quiz_index(raw)
    text = str(raw or "").strip()
    if not text:
        return None
    upper = text.upper()
    if upper in {"A", "B", "C", "D"}:
        return ord(upper) - ord("A")
    if text.isdigit():
        num = int(text)
        if prefer_zero_based and 0 <= num <= 3:
            return num
        if 1 <= num <= 4:
            return num - 1
        if 0 <= num <= 3:
            return num
        return _clamp_quiz_index(num)
    match = re.search(r"\b(?:OPTION|ANSWER|CHOICE|CORRECT)\s*[:\-]?\s*([ABCD]|[1-4])\b", upper)
    if match:
        token = match.group(1)
        if token in {"A", "B", "C", "D"}:
            return ord(token) - ord("A")
        return int(token) - 1
    match = re.match(r"^\s*([ABCD])(?:[\).\:\-\s]|$)", upper)
    if match:
        return ord(match.group(1)) - ord("A")
    return None


def _resolve_quiz_correct_index(question: dict[str, Any]) -> int:
    options_raw = question.get("options")
    options = options_raw if isinstance(options_raw, list) else []
    normalized_options = [_normalize_option_text(opt) for opt in options[:4]]

    for field_name, prefer_zero_based in (
        ("correctIndex", True),
        ("correct_index", True),
        ("correctAnswer", False),
        ("correct_answer", False),
        ("correctOption", False),
        ("correct_option", False),
        ("answer", False),
    ):
        value = question.get(field_name)
        if value is None:
            continue
        inferred = _index_from_choice_token(value, prefer_zero_based=prefer_zero_based)
        if inferred is not None:
            return inferred
        normalized_value = _normalize_option_text(value)
        if normalized_value:
            for idx, option_text in enumerate(normalized_options):
                if normalized_value == option_text:
                    return idx
                if normalized_value.endswith(option_text) and option_text:
                    return idx
    return 0


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


def coerce_autofill_count(value: Any, allowed: list[int], default: int) -> int:
    if not allowed:
        return default
    try:
        num = int(value)
    except (TypeError, ValueError):
        return default
    if num in allowed:
        return num
    return min(allowed, key=lambda candidate: (abs(candidate - num), candidate))


def _coerce_fullset_autofill_combo(slide_raw: Any, quiz_raw: Any, flash_raw: Any) -> dict[str, int]:
    allowed_combos = [
        {"slides": 10, "quiz": 10, "flash": 10},
        {"slides": 10, "quiz": 10, "flash": 20},
        {"slides": 10, "quiz": 20, "flash": 10},
        {"slides": 20, "quiz": 10, "flash": 10},
    ]
    target = {
        "slides": coerce_autofill_count(slide_raw, [10, 20], 10),
        "quiz": coerce_autofill_count(quiz_raw, [10, 20], 20),
        "flash": coerce_autofill_count(flash_raw, [10, 20], 10),
    }
    return min(
        allowed_combos,
        key=lambda combo: (
            abs(combo["slides"] - target["slides"]) +
            abs(combo["quiz"] - target["quiz"]) +
            abs(combo["flash"] - target["flash"]),
            combo["slides"] + combo["quiz"] + combo["flash"],
        ),
    )


def _ensure_ai_slide_count(items: list[Any], count: int, topic: str) -> list[dict[str, Any]]:
    safe_count = max(0, int(count))
    cleaned = [item for item in items if isinstance(item, dict)]
    if not cleaned:
        cleaned = [{"title": _short_cover_title(topic), "bullets": [f"Introduction to {topic}", "Key ideas", "Practice overview"]}]
    out: list[dict[str, Any]] = []
    while len(out) < safe_count:
        source = cleaned[len(out) % len(cleaned)]
        clone = {
            **source,
            "id": f"ai_s{len(out) + 1}",
            "bullets": list(source.get("bullets") or []),
        }
        out.append(clone)
    return out[:safe_count]


def _ensure_ai_quiz_count(items: list[Any], count: int, topic: str) -> list[dict[str, Any]]:
    safe_count = max(0, int(count))
    cleaned = [item for item in items if isinstance(item, dict)]
    if not cleaned:
        cleaned = [{
            "text": f"Which idea best matches {topic}?",
            "options": ["Main idea", "Example", "Counterpoint", "Detail"],
            "hint": f"Review the key point about {topic}.",
            "correctIndex": 0,
        }]
    out: list[dict[str, Any]] = []
    while len(out) < safe_count:
        source = cleaned[len(out) % len(cleaned)]
        clone = {
            **source,
            "id": f"ai_q{len(out) + 1}",
            "options": list(source.get("options") or []),
        }
        out.append(clone)
    return out[:safe_count]


def _ensure_ai_flash_count(items: list[Any], count: int, topic: str) -> list[dict[str, Any]]:
    safe_count = max(0, int(count))
    cleaned = [item for item in items if isinstance(item, dict)]
    topic_token = (topic.split() or ["topic"])[0]
    if not cleaned:
        cleaned = [{
            "front": f"{topic_token} term",
            "phonetic": "/tɜːm/",
            "back": "Useful English meaning",
            "hint": f"Used when discussing {topic}.",
        }]
    out: list[dict[str, Any]] = []
    while len(out) < safe_count:
        source = cleaned[len(out) % len(cleaned)]
        clone = {
            **source,
            "id": f"ai_c{len(out) + 1}",
        }
        out.append(clone)
    return out[:safe_count]


def generate_slide_content(topic: str, form: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generate a 10-slide deck about topic. Returns mock-compatible JSON."""
    form = form or {}
    topic = _sanitize_topic(topic)
    count = _coerce_int(form.get("count"), 10, 5, 30)
    structure = _sanitize_multiline(form.get("structure"))
    style = _sanitize_note(form.get("style") or form.get("slideTemplate"))
    notes = _sanitize_multiline(form.get("notes"))
    user_lines = [
        f"Topic: {topic}",
        f"Slide count: {count}",
    ]
    _append_form_line(user_lines, "Preferred structure", structure)
    _append_form_line(user_lines, "Visual template name", style)
    _append_form_line(user_lines, "Extra notes", notes)
    user_lines.append("Generate the slide deck JSON now.")
    user_msg = "\n".join(user_lines)
    raw = _call_openai(_SLIDE_SYSTEM, user_msg, max_tokens=min(4096, max(1800, 240 + count * 140)))
    data = _parse_json_response(raw, "slide")
    # Validate basic shape
    if not isinstance(data.get("slides"), list):
        raise ValueError("AI slide response missing 'slides' array")
    data["slides"] = _ensure_ai_slide_count(data["slides"], count, topic)
    for s in data["slides"]:
        if isinstance(s.get("bullets"), list) and len(s["bullets"]) > 5:
            s["bullets"] = s["bullets"][:4]
    _normalize_ai_slide_deck(data, topic)
    # Cover slide: short headline (full topic in deck title / meta — avoids header clip)
    if data["slides"] and isinstance(data["slides"][0], dict):
        s0 = data["slides"][0]
        cur = s0.get("title")
        if not (isinstance(cur, str) and cur.strip()):
            s0["title"] = _short_cover_title(topic)
        elif len(cur) > 82 or len(cur.split()) > 12:
            s0["title"] = _short_cover_title(topic)
    if isinstance(data.get("title"), str):
        data["title"] = _clamp_line(data["title"], 100)
    return data


def generate_quiz_content(topic: str, form: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generate a 10-question quiz about topic. Returns mock-compatible JSON."""
    form = form or {}
    topic = _sanitize_topic(topic)
    count = _coerce_int(form.get("count"), 10, 1, 40)
    kind = _sanitize_note(form.get("kind"))
    difficulty = _sanitize_note(form.get("difficulty") or form.get("level"))
    notes = _sanitize_multiline(form.get("notes") or form.get("extra"))
    user_lines = [
        f"Topic: {topic}",
        f"Question count: {count}",
    ]
    _append_form_line(user_lines, "Quiz focus", kind)
    _append_form_line(user_lines, "Difficulty", difficulty)
    _append_form_line(user_lines, "Extra notes", notes)
    user_lines.append("Generate the quiz JSON now.")
    user_msg = "\n".join(user_lines)
    raw = _call_openai(_QUIZ_SYSTEM, user_msg, max_tokens=min(4096, max(2400, 300 + count * 150)))
    data = _parse_json_response(raw, "quiz")
    if not isinstance(data.get("questions"), list):
        raise ValueError("AI quiz response missing 'questions' array")
    data["questions"] = _ensure_ai_quiz_count(data["questions"], count, topic)
    for q in data["questions"]:
        # Clamp options to exactly 4
        opts = q.get("options") or []
        if len(opts) > 4:
            q["options"] = opts[:4]
        while len(q["options"]) < 4:
            q["options"].append(f"Option {len(q['options']) + 1}")
        q["correctIndex"] = _resolve_quiz_correct_index(q)
    return data


def generate_flash_content(topic: str, form: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generate 20 flashcards about topic. Returns mock-compatible JSON."""
    form = form or {}
    topic = _sanitize_topic(topic)
    count = _coerce_int(form.get("count"), 20, 1, 40)
    basis = _sanitize_multiline(form.get("basis") or form.get("back"))
    notes = _sanitize_multiline(form.get("notes") or form.get("extra"))
    user_lines = [
        f"Topic or vocabulary basis: {topic}",
        f"Card count: {count}",
    ]
    _append_form_line(user_lines, "Back-side information preference", basis)
    _append_form_line(user_lines, "Extra notes", notes)
    user_lines.append("If a vocabulary list is implied, stay close to it when choosing card terms.")
    user_lines.append("Generate the flashcard JSON now.")
    user_msg = "\n".join(user_lines)
    raw = _call_openai(_FLASH_SYSTEM, user_msg, max_tokens=min(4096, max(2800, 320 + count * 95)))
    data = _parse_json_response(raw, "flashcard")
    if not isinstance(data.get("cards"), list):
        raise ValueError("AI flashcard response missing 'cards' array")
    data["cards"] = _ensure_ai_flash_count(data["cards"], count, topic)
    return data


def generate_fullset_content(topic: str | None = None, form: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generate slide + quiz + flashcard for the SAME topic.

    If *topic* is provided (from the form), use it; otherwise pick randomly from TOPIC_POOL.

    Returns:
        {"slide": {...}, "quiz": {...}, "flashcard": {...}, "topic": str}
    """
    form = form or {}
    if topic:
        topic = _sanitize_topic(topic)
    if not topic:
        topic = random.choice(TOPIC_POOL)
    logger.info("AI fullset generation: topic=%s", topic)

    import concurrent.futures

    shared_level = _sanitize_note(form.get("level"))
    shared_extra = _sanitize_multiline(form.get("extra"))
    slide_form = {
        "count": form.get("slides"),
        "slideTemplate": form.get("slideTemplate"),
        "style": form.get("slideTemplate"),
        "notes": shared_extra,
    }
    quiz_form = {
        "count": form.get("quiz"),
        "difficulty": shared_level,
        "notes": shared_extra,
    }
    flash_form = {
        "count": form.get("flash"),
        "notes": shared_extra,
        "extra": shared_extra,
    }

    def _gen_slide() -> dict[str, Any]:
        return generate_slide_content(topic, form=slide_form)

    def _gen_quiz() -> dict[str, Any]:
        return generate_quiz_content(topic, form=quiz_form)

    def _gen_flash() -> dict[str, Any]:
        return generate_flash_content(topic, form=flash_form)

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

_AUTOFILL_SLIDE_SYSTEM = """You generate form autofill data for an English slide deck creation form for Vietnamese grade-12 / THPT students.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"topic": "<English topic, 3-8 words>", "count": 10, "structure": "Overview -> Examples -> Practice", "notes": ""}
Rules:
- topic: a specific grade-12 English topic written in English. Choose creatively and randomly from grammar (passive voice, conditionals, relative clauses, reported speech, modal verbs, word formation, inversion…), vocabulary (urbanisation, endangered languages, AI & robots, environment, health, travel, social media…), reading skills (main idea, inference, paraphrase, causal relationships…), or cloze skills (collocations, phrasal verbs, linking words…). Must be fresh each call.
- count: one of exactly 10, 20, 30
- structure: 3 short English steps joined by " -> "
- notes: short English note or empty string
- LANGUAGE RULE (HARD): topic, structure, and notes MUST be English only."""

_AUTOFILL_QUIZ_SYSTEM = """You generate form autofill data for an English quiz creation form for Vietnamese grade-12 / THPT students.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"source": "<English topic in Vietnamese>", "kind": "<quiz type>", "count": 20, "difficulty": "<level>", "notes": ""}
Rules:
- source: a specific grade-12 English topic in Vietnamese. Choose creatively and randomly from grammar (passive voice, conditionals, relative clauses, reported speech, modal verbs, word formation…), vocabulary (urbanisation, endangered languages, AI & robots, environment, health…), reading comprehension, pronunciation, or communication functions. Must be fresh each call.
- kind: one of exactly: Từ vựng | Ngữ pháp | Phát âm | Đọc hiểu | Giao tiếp
- count: one of exactly 10, 20, 30, 40
- difficulty: one of exactly: Mất gốc | Cơ bản | Khá | Nâng cao
- notes: empty string"""

_AUTOFILL_FLASH_SYSTEM = """You generate form autofill data for a flashcard creation form for Vietnamese grade-12 / THPT English learners.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"list": "<topic description in Vietnamese, 1 sentence>", "back": "Nghĩa tiếng Việt, Phiên âm, Ví dụ", "count": 20, "notes": ""}
Rules:
- list: 1 sentence in Vietnamese describing the specific English vocabulary topic to cover. Choose creatively and randomly from: urbanisation & city life, endangered languages & culture, AI & robotics, environment & climate, health & medicine, travel & tourism, social media, phrasal verbs, collocations, word formation, idioms, academic vocabulary. Must be fresh each call.
- back: always exactly the string "Nghĩa tiếng Việt, Phiên âm, Ví dụ"
- count: one of exactly 10, 20, 30, 40
- notes: empty string"""

_AUTOFILL_FULLSET_SYSTEM = """You generate form autofill data for a full-set (slide + quiz + flashcard) creation form for Vietnamese grade-12 / THPT English learners.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"topic": "<English topic in Vietnamese>", "level": "<level>", "slides": 10, "quiz": 20, "flash": 10, "extra": ""}
Rules:
- topic: a specific grade-12 English topic in Vietnamese. Choose creatively and randomly from grammar (passive voice, conditionals, relative clauses, reported speech, modal verbs, word formation, inversion…), vocabulary (urbanisation, endangered languages, AI & robots, environment, health, travel…), or reading/cloze skills. Must be fresh each call.
- level: one of exactly: Mất gốc | Cơ bản | Khá | Nâng cao
- Choose exactly one valid combination: (10,10,10), (10,10,20), (10,20,10), or (20,10,10)
- extra: empty string"""


def generate_autofill_slide(recent: list[str] | None = None) -> dict[str, Any]:
    """Return form field values for a slide deck autofill (no full content)."""
    avoid = f"\nDo NOT repeat any of these recent topics: {', '.join(_sanitize_topic(t) for t in recent)}" if recent else ""
    raw = _call_openai(_AUTOFILL_SLIDE_SYSTEM, f"Generate a fresh autofill JSON now.{avoid}", max_tokens=150)
    data = _parse_json_response(raw, "autofill_slide")
    data.setdefault("topic", "Common phrasal verbs")
    data["count"] = coerce_autofill_count(data.get("count"), [10, 20, 30], 10)
    data.setdefault("structure", "Overview -> Examples -> Practice")
    data["notes"] = ""
    return data


def generate_autofill_quiz(recent: list[str] | None = None) -> dict[str, Any]:
    """Return form field values for a quiz autofill (no full content)."""
    _VALID_KINDS = {"Từ vựng", "Ngữ pháp", "Phát âm", "Đọc hiểu", "Giao tiếp"}
    _VALID_LEVELS = {"Mất gốc", "Cơ bản", "Khá", "Nâng cao"}
    avoid = f"\nDo NOT repeat any of these recent topics: {', '.join(_sanitize_topic(t) for t in recent)}" if recent else ""
    raw = _call_openai(_AUTOFILL_QUIZ_SYSTEM, f"Generate a fresh autofill JSON now.{avoid}", max_tokens=150)
    data = _parse_json_response(raw, "autofill_quiz")
    data.setdefault("source", "Từ vựng tiếng Anh thông dụng")
    if data.get("kind") not in _VALID_KINDS:
        data["kind"] = "Từ vựng"
    data["count"] = coerce_autofill_count(data.get("count"), [10, 20, 30, 40], 20)
    if data.get("difficulty") not in _VALID_LEVELS:
        data["difficulty"] = "Khá"
    data["notes"] = ""
    return data


def generate_autofill_flash(recent: list[str] | None = None) -> dict[str, Any]:
    """Return form field values for a flashcard autofill (no full content)."""
    avoid = f"\nDo NOT repeat any of these recent topics: {', '.join(_sanitize_topic(t) for t in recent)}" if recent else ""
    raw = _call_openai(_AUTOFILL_FLASH_SYSTEM, f"Generate a fresh autofill JSON now.{avoid}", max_tokens=150)
    data = _parse_json_response(raw, "autofill_flash")
    data.setdefault("list", "Từ vựng tiếng Anh học thuật")
    data["back"] = "Nghĩa tiếng Việt, Phiên âm, Ví dụ"
    data["count"] = coerce_autofill_count(data.get("count"), [10, 20, 30, 40], 20)
    data["notes"] = ""
    return data


def generate_autofill_fullset(recent: list[str] | None = None) -> dict[str, Any]:
    """Return form field values for a fullset autofill (no full content)."""
    _VALID_LEVELS = {"Mất gốc", "Cơ bản", "Khá", "Nâng cao"}
    avoid = f"\nDo NOT repeat any of these recent topics: {', '.join(_sanitize_topic(t) for t in recent)}" if recent else ""
    raw = _call_openai(_AUTOFILL_FULLSET_SYSTEM, f"Generate a fresh autofill JSON now.{avoid}", max_tokens=150)
    data = _parse_json_response(raw, "autofill_fullset")
    data.setdefault("topic", "Từ vựng tiếng Anh học thuật")
    if data.get("level") not in _VALID_LEVELS:
        data["level"] = "Khá"
    combo = _coerce_fullset_autofill_combo(data.get("slides"), data.get("quiz"), data.get("flash"))
    data["slides"] = combo["slides"]
    data["quiz"] = combo["quiz"]
    data["flash"] = combo["flash"]
    data["extra"] = ""
    return data


# ---------------------------------------------------------------------------
# Document-context generation — derive content from uploaded file text
# ---------------------------------------------------------------------------

_DOC_SLIDE_SYSTEM = """You are an English learning content creator for Vietnamese students.
You are given an excerpt from an uploaded document (Markdown format).
Your job is to read the document and create a slide deck that teaches the KEY content from it.

Rules:
- Exactly 10 slides (or as many as requested)
- FIRST slide (cover): short headline title (max 10 words, ~72 characters) summarising the document — no long slash-separated keyword lists, no ALL CAPS blocks; must fit a 16:9 header.
- FIRST slide: 2–3 bullets only, each max 14 words; do not repeat the same long phrase in every bullet.
- Other slides: titles max 8 words; 3 bullets each; each bullet max 18 words; one sentence per bullet.
- Derive all content from the document — do not invent facts not present in it
- LANGUAGE RULE (HARD): ALL fields — deck title, slide titles, bullets — MUST be written in English. NEVER use Vietnamese in any field.
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<deck title>","slides":[{"id":"s1","title":"<short headline>","bullets":["<bullet>","<bullet>"]},...]}"""

_DOC_QUIZ_SYSTEM = """You are an English learning quiz creator for Vietnamese students.
You are given an excerpt from an uploaded document (Markdown format).
Your job is to create quiz questions that test understanding of the document's content.

Rules:
- Exactly 10 questions (or as many as requested)
- Each question: "text" (the question), "options" (4 short choices), "correctIndex" (0-3), "hint" (1 sentence explanation)
- Options must be SHORT (1-5 words each), no A./B./C./D. prefixes
- All questions must be answerable from the document
- LANGUAGE RULE (HARD): ALL fields — title, text, options, hint — MUST be written in English. NEVER use Vietnamese in any field. This is an English-learning app; mixing Vietnamese defeats the purpose.
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<quiz title>","questions":[{"id":"q1","text":"<question>","options":["<A>","<B>","<C>","<D>"],"correctIndex":0,"hint":"<hint>"},...]}"""

_DOC_FLASH_SYSTEM = """You are an English vocabulary flashcard creator for Vietnamese students.
You are given an excerpt from an uploaded document (Markdown format).
Your job is to pick the most useful ENGLISH VOCABULARY WORDS from the document — words that a student should learn and remember.

Rules:
- Exactly as many cards as requested (default 20)
- Pick ONLY real English vocabulary: nouns, verbs, adjectives, adverbs, collocations, idioms, or key topic phrases
- NEVER create cards for grammar terms, tense names (e.g. "Present simple", "Past perfect"), or meta-linguistic labels (e.g. "auxiliary verb", "modal verb", "clause")
- Each card:
  - "front": English word or short phrase (max 4 words) — MUST be in English
  - "phonetic": IPA transcription
  - "back": short English meaning or definition (max 10 words) — MUST be in English
  - "hint": short English example sentence or collocate (max 10 words) — MUST be in English
- LANGUAGE RULE (HARD): front, back, hint, and title MUST all be English. No Vietnamese is allowed anywhere.
- Prioritise topic-specific vocabulary that reflects the subject matter of the document
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<topic-based set title>","cards":[{"id":"c1","front":"<word>","phonetic":"/<ipa>/","back":"<English meaning>","hint":"<English example>"},...]}"""

_DOC_CHAR_LIMIT = 12_000  # chars of document sent to model (well within gpt-4o-mini context)


def _build_doc_user_msg(document_text: str, count: int, notes: str) -> str:
    excerpt = document_text[:_DOC_CHAR_LIMIT]
    parts = [f"Document:\n---\n{excerpt}\n---", f"Items requested: {count}"]
    if notes and notes.strip():
        parts.append(f"Notes: {notes.strip()}")
    parts.append("Generate the JSON now.")
    return "\n".join(parts)


def generate_slide_from_document(document_text: str, count: int = 10, notes: str = "") -> dict[str, Any]:
    """Generate a slide deck from uploaded document text. Returns same schema as generate_slide_content."""
    count = max(5, min(30, int(count or 10)))
    raw = _call_openai(_DOC_SLIDE_SYSTEM, _build_doc_user_msg(document_text, count, notes), max_tokens=3000)
    data = _parse_json_response(raw, "slide_from_doc")
    if not isinstance(data.get("slides"), list):
        raise ValueError("AI slide response missing 'slides' array")
    data["slides"] = _ensure_ai_slide_count(data["slides"], count, str(data.get("title") or "Document"))
    for s in data["slides"]:
        if isinstance(s.get("bullets"), list) and len(s["bullets"]) > 5:
            s["bullets"] = s["bullets"][:4]
    topic_hint = str(data.get("title") or "Document")
    _normalize_ai_slide_deck(data, topic_hint)
    if isinstance(data.get("title"), str):
        data["title"] = _clamp_line(data["title"], 100)
    return data


def generate_quiz_from_document(document_text: str, count: int = 10, notes: str = "") -> dict[str, Any]:
    """Generate a quiz from uploaded document text. Returns same schema as generate_quiz_content."""
    count = max(1, min(50, int(count or 10)))
    raw = _call_openai(_DOC_QUIZ_SYSTEM, _build_doc_user_msg(document_text, count, notes), max_tokens=3500)
    data = _parse_json_response(raw, "quiz_from_doc")
    if not isinstance(data.get("questions"), list):
        raise ValueError("AI quiz response missing 'questions' array")
    data["questions"] = _ensure_ai_quiz_count(data["questions"], count, "Document")
    for q in data["questions"]:
        opts = q.get("options") or []
        if len(opts) > 4:
            q["options"] = opts[:4]
        while len(q["options"]) < 4:
            q["options"].append(f"Option {len(q['options']) + 1}")
        q["correctIndex"] = _resolve_quiz_correct_index(q)
    return data


def generate_flash_from_document(document_text: str, count: int = 20, notes: str = "") -> dict[str, Any]:
    """Generate flashcards from uploaded document text. Returns same schema as generate_flash_content."""
    count = max(1, min(500, int(count or 20)))
    raw = _call_openai(_DOC_FLASH_SYSTEM, _build_doc_user_msg(document_text, count, notes), max_tokens=4000)
    data = _parse_json_response(raw, "flash_from_doc")
    if not isinstance(data.get("cards"), list):
        raise ValueError("AI flashcard response missing 'cards' array")
    data["cards"] = _ensure_ai_flash_count(data["cards"], count, "Document")
    return data


def generate_fullset_from_document(
    document_text: str,
    counts: dict[str, int] | None = None,
    notes: str = "",
) -> dict[str, Any]:
    """Generate slide + quiz + flashcard from uploaded document text.

    Returns same schema as generate_fullset_content:
    {"slide": {...}, "quiz": {...}, "flashcard": {...}, "topic": str}
    """
    import concurrent.futures

    c = counts or {}
    slide_count = max(5, min(30, int(c.get("slides", 10))))
    quiz_count = max(1, min(50, int(c.get("quiz", 10))))
    flash_count = max(1, min(500, int(c.get("flash", 20))))

    def _gen_slide() -> dict[str, Any]:
        return generate_slide_from_document(document_text, slide_count, notes)

    def _gen_quiz() -> dict[str, Any]:
        return generate_quiz_from_document(document_text, quiz_count, notes)

    def _gen_flash() -> dict[str, Any]:
        return generate_flash_from_document(document_text, flash_count, notes)

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        f_slide = pool.submit(_gen_slide)
        f_quiz = pool.submit(_gen_quiz)
        f_flash = pool.submit(_gen_flash)
        slide_data = f_slide.result()
        quiz_data = f_quiz.result()
        flash_data = f_flash.result()

    # Derive a topic label from the slide deck title
    topic = str(slide_data.get("title") or "Uploaded document")
    return {
        "slide": slide_data,
        "quiz": quiz_data,
        "flashcard": flash_data,
        "topic": topic,
    }


# ---------------------------------------------------------------------------
# Recommendation system
# ---------------------------------------------------------------------------

_RECOMMEND_SYSTEM_MIXED = """You are a learning topic recommender for a Vietnamese English-learning app.
You receive a ranked list of the user's top studied topics, sorted by TOTAL accumulated time spent (most time first).
The #1 entry is the topic the user has invested the most time in overall.

Your job: Recommend exactly 4 new study topics that:
- Are DIFFERENT from every topic already in the history list (no repeats)
- Are CLOSELY related to the TOP 1-2 topics (highest dwellSeconds) — prioritise similarity to the most-studied topic
- Cover a mix of the 4 content types: slide, quiz, flash, fullset
- Are appropriate for Vietnamese high-school English learners (THPT level)
- Include a short English explanation of why you suggest it (max 15 words)

Return ONLY valid JSON, no markdown fences, no explanation:
{"topics":[{"topic":"<English topic name>","kind":"slide"|"quiz"|"flash"|"fullset","reason":"<English reason, max 15 words>"},...]}"""

_RECOMMEND_SYSTEM_SAME_KIND = """You are a learning topic recommender for a Vietnamese English-learning app.
You receive a ranked list of the user's top studied topics, sorted by TOTAL accumulated time spent (most time first).
The #1 entry is the topic the user has invested the most time in overall.

Your job: Recommend exactly 4 new study topics that:
- Are DIFFERENT from every topic already in the history list (no repeats)
- Are CLOSELY related to the TOP 1-2 topics (highest dwellSeconds) — prioritise similarity to the most-studied topic
- ALL 4 must be of kind: {kind}
- Are appropriate for Vietnamese high-school English learners (THPT level)
- Include a short English explanation of why you suggest it (max 15 words)

Return ONLY valid JSON, no markdown fences, no explanation:
{{"topics":[{{"topic":"<English topic name>","kind":"{kind}","reason":"<English reason, max 15 words>"}},...]}}\
"""


def generate_topic_recommendations(history: list[dict], kind: str = "") -> dict:
    """
    history: [{ topic, kind, dwellSeconds }] — last 5 items, oldest first.
    kind: if provided, all recommendations will be of this kind.
    Returns: { topics: [{ topic, kind, reason }] }
    """
    valid_kinds = {"slide", "quiz", "flash", "fullset"}
    use_kind = kind.strip() if kind.strip() in valid_kinds else ""

    if use_kind:
        system = _RECOMMEND_SYSTEM_SAME_KIND.format(kind=use_kind)
    else:
        system = _RECOMMEND_SYSTEM_MIXED

    lines = []
    for i, h in enumerate(history, 1):
        lines.append(f"{i}. [{h.get('kind', '?')}] {h.get('topic', '?')} — {h.get('dwellSeconds', 0)}s total")
    user_msg = "Most-studied topics ranked by total time (#1 = highest):\n" + "\n".join(lines) + "\n\nRecommend 4 new topics closely related to #1 and #2. Return JSON now."

    raw = _call_openai(system, user_msg, max_tokens=600)
    start = raw.find("{")
    end = raw.rfind("}") + 1
    try:
        data = json.loads(raw[start:end]) if start >= 0 else {}
    except json.JSONDecodeError:
        data = {}
    topics = data.get("topics", [])
    if not isinstance(topics, list):
        topics = []
    # Ensure kind field is set correctly when requested
    if use_kind:
        for t in topics:
            t["kind"] = use_kind
    return {"topics": topics[:4]}

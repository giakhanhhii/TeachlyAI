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
Generate a JSON slide deck about the given English topic.

Rules:
- Exactly 10 slides
- The FIRST slide (s1) title must be the topic itself (verbatim or a very close restatement — this is the cover/title slide)
- Each slide: "title" (3-6 words) and "bullets" (array of 3-4 items)
- Each bullet: 20-30 words, write as a detailed informative sentence with context or examples
- Keep slide TITLES short (3-6 words) to avoid overflow
- Content must be genuinely educational about the topic
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<deck title>","slides":[{"id":"s1","title":"<topic>","bullets":["<bullet>","<bullet>","<bullet>"]},...]}"""

_QUIZ_SYSTEM = """You are an English learning quiz creator for Vietnamese students.
Generate a JSON quiz about the given English topic.

Rules:
- Exactly 10 questions
- Each question: "text" (the question), "options" (4 short choices A-D), "correctIndex" (0-3), "hint" (1 sentence explanation)
- Options must be SHORT (1-5 words each), no A./B./C./D. prefixes in options array
- Questions test practical knowledge of the topic
- LANGUAGE RULE (HARD): ALL fields — title, text, options, hint — MUST be written in English. NEVER use Vietnamese in any field. This is an English-learning app; mixing Vietnamese defeats the purpose.
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<quiz title>","questions":[{"id":"q1","text":"<question>","options":["<A>","<B>","<C>","<D>"],"correctIndex":0,"hint":"<hint>"},...]}"""

_FLASH_SYSTEM = """You are an English flashcard creator for Vietnamese students.
Generate a JSON flashcard set about the given English topic.

Rules:
- Exactly 20 cards
- Each card:
  - "front": English word or short phrase (max 4 words) — MUST be in English
  - "phonetic": IPA transcription
  - "back": Vietnamese meaning ONLY (max 12 words) — MUST be in Vietnamese, never English
  - "hint": short English example sentence or usage note (max 8 words) — MUST be in English
- LANGUAGE RULE (HARD): front and hint MUST be English; back MUST be Vietnamese. No mixing.
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<set title>","cards":[{"id":"c1","front":"<word>","phonetic":"/<ipa>/","back":"<Vietnamese meaning>","hint":"<English example>"},...]}"""


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
    topic = _sanitize_topic(topic)
    user_msg = f"Topic: {topic}\nGenerate the slide deck JSON now."
    raw = _call_openai(_SLIDE_SYSTEM, user_msg, max_tokens=1800)
    data = _parse_json_response(raw, "slide")
    # Validate basic shape
    if not isinstance(data.get("slides"), list):
        raise ValueError("AI slide response missing 'slides' array")
    # First slide title = topic (cover slide)
    if data["slides"]:
        data["slides"][0]["title"] = topic
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
    topic = _sanitize_topic(topic)
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
    topic = _sanitize_topic(topic)
    user_msg = f"Topic: {topic}\nGenerate the flashcard JSON now."
    raw = _call_openai(_FLASH_SYSTEM, user_msg, max_tokens=2800)
    data = _parse_json_response(raw, "flashcard")
    if not isinstance(data.get("cards"), list):
        raise ValueError("AI flashcard response missing 'cards' array")
    for i, c in enumerate(data["cards"]):
        if not c.get("id"):
            c["id"] = f"ai_c{i + 1}"
    return data


def generate_fullset_content(topic: str | None = None) -> dict[str, Any]:
    """Generate slide + quiz + flashcard for the SAME topic.

    If *topic* is provided (from the form), use it; otherwise pick randomly from TOPIC_POOL.

    Returns:
        {"slide": {...}, "quiz": {...}, "flashcard": {...}, "topic": str}
    """
    if topic:
        topic = _sanitize_topic(topic)
    if not topic:
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

_AUTOFILL_SLIDE_SYSTEM = """You generate form autofill data for an English slide deck creation form for Vietnamese grade-12 / THPT students.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"topic": "<English topic in Vietnamese, 3-8 words>", "count": 10, "structure": "Giới thiệu → Ví dụ → Luyện tập", "notes": ""}
Rules:
- topic: a specific grade-12 English topic in Vietnamese. Choose creatively and randomly from grammar (passive voice, conditionals, relative clauses, reported speech, modal verbs, word formation, inversion…), vocabulary (urbanisation, endangered languages, AI & robots, environment, health, travel, social media…), reading skills (main idea, inference, paraphrase, causal relationships…), or cloze skills (collocations, phrasal verbs, linking words…). Must be fresh each call.
- count: integer between 10 and 15
- structure: 3 short Vietnamese steps joined by " → "
- notes: empty string"""

_AUTOFILL_QUIZ_SYSTEM = """You generate form autofill data for an English quiz creation form for Vietnamese grade-12 / THPT students.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"source": "<English topic in Vietnamese>", "kind": "<quiz type>", "count": 20, "difficulty": "<level>", "notes": ""}
Rules:
- source: a specific grade-12 English topic in Vietnamese. Choose creatively and randomly from grammar (passive voice, conditionals, relative clauses, reported speech, modal verbs, word formation…), vocabulary (urbanisation, endangered languages, AI & robots, environment, health…), reading comprehension, pronunciation, or communication functions. Must be fresh each call.
- kind: one of exactly: Từ vựng | Ngữ pháp | Phát âm | Đọc hiểu | Giao tiếp
- count: 15 or 20
- difficulty: one of exactly: Mất gốc | Cơ bản | Khá | Nâng cao
- notes: empty string"""

_AUTOFILL_FLASH_SYSTEM = """You generate form autofill data for a flashcard creation form for Vietnamese grade-12 / THPT English learners.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"list": "<topic description in Vietnamese, 1 sentence>", "back": "Nghĩa tiếng Việt, Phiên âm, Ví dụ", "count": 20, "notes": ""}
Rules:
- list: 1 sentence in Vietnamese describing the specific English vocabulary topic to cover. Choose creatively and randomly from: urbanisation & city life, endangered languages & culture, AI & robotics, environment & climate, health & medicine, travel & tourism, social media, phrasal verbs, collocations, word formation, idioms, academic vocabulary. Must be fresh each call.
- back: always exactly the string "Nghĩa tiếng Việt, Phiên âm, Ví dụ"
- count: always 20
- notes: empty string"""

_AUTOFILL_FULLSET_SYSTEM = """You generate form autofill data for a full-set (slide + quiz + flashcard) creation form for Vietnamese grade-12 / THPT English learners.
Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{"topic": "<English topic in Vietnamese>", "level": "<level>", "slides": 10, "quiz": 20, "flash": 10, "extra": ""}
Rules:
- topic: a specific grade-12 English topic in Vietnamese. Choose creatively and randomly from grammar (passive voice, conditionals, relative clauses, reported speech, modal verbs, word formation, inversion…), vocabulary (urbanisation, endangered languages, AI & robots, environment, health, travel…), or reading/cloze skills. Must be fresh each call.
- level: one of exactly: Mất gốc | Cơ bản | Khá | Nâng cao
- slides + quiz + flash must be <= 40 and each >= 1
- extra: empty string"""


def generate_autofill_slide(recent: list[str] | None = None) -> dict[str, Any]:
    """Return form field values for a slide deck autofill (no full content)."""
    avoid = f"\nDo NOT repeat any of these recent topics: {', '.join(_sanitize_topic(t) for t in recent)}" if recent else ""
    raw = _call_openai(_AUTOFILL_SLIDE_SYSTEM, f"Generate a fresh autofill JSON now.{avoid}", max_tokens=150)
    data = _parse_json_response(raw, "autofill_slide")
    data.setdefault("topic", "Phrasal verbs thông dụng")
    data["count"] = max(10, min(15, int(data.get("count") or 10)))
    data.setdefault("structure", "Giới thiệu → Ví dụ → Luyện tập")
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
    data["count"] = 20 if int(data.get("count") or 20) > 17 else 15
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
    data["count"] = 20
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


# ---------------------------------------------------------------------------
# Document-context generation — derive content from uploaded file text
# ---------------------------------------------------------------------------

_DOC_SLIDE_SYSTEM = """You are an English learning content creator for Vietnamese students.
You are given an excerpt from an uploaded document (Markdown format).
Your job is to read the document and create a slide deck that teaches the KEY content from it.

Rules:
- Exactly 10 slides (or as many as requested)
- The FIRST slide (s1) title must be the main topic of the document (cover slide)
- Each slide: "title" (3-6 words) and "bullets" (array of 3-4 items)
- Each bullet: 20-30 words, write as a detailed informative sentence using content from the document
- Keep slide TITLES short (3-6 words)
- Derive all content from the document — do not invent facts not present in it
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<deck title>","slides":[{"id":"s1","title":"<main topic>","bullets":["<bullet>","<bullet>","<bullet>"]},...]}"""

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
  - "back": SHORT Vietnamese meaning (max 10 words) — MUST be in Vietnamese, never English
  - "hint": short English example sentence or collocate (max 10 words) — MUST be in English
- LANGUAGE RULE (HARD): front and hint MUST be English; back MUST be Vietnamese. No mixing allowed.
- Prioritise topic-specific vocabulary that reflects the subject matter of the document
- Return ONLY valid JSON, no markdown fences, no explanation

Schema:
{"title":"<topic-based set title>","cards":[{"id":"c1","front":"<word>","phonetic":"/<ipa>/","back":"<Vietnamese meaning>","hint":"<English example>"},...]}"""

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
    for i, s in enumerate(data["slides"]):
        if not s.get("id"):
            s["id"] = f"ai_s{i + 1}"
        if isinstance(s.get("bullets"), list) and len(s["bullets"]) > 5:
            s["bullets"] = s["bullets"][:4]
    return data


def generate_quiz_from_document(document_text: str, count: int = 10, notes: str = "") -> dict[str, Any]:
    """Generate a quiz from uploaded document text. Returns same schema as generate_quiz_content."""
    count = max(1, min(50, int(count or 10)))
    raw = _call_openai(_DOC_QUIZ_SYSTEM, _build_doc_user_msg(document_text, count, notes), max_tokens=3500)
    data = _parse_json_response(raw, "quiz_from_doc")
    if not isinstance(data.get("questions"), list):
        raise ValueError("AI quiz response missing 'questions' array")
    for i, q in enumerate(data["questions"]):
        if not q.get("id"):
            q["id"] = f"ai_q{i + 1}"
        opts = q.get("options") or []
        if len(opts) > 4:
            q["options"] = opts[:4]
        if isinstance(q.get("correctIndex"), int):
            q["correctIndex"] = max(0, min(3, q["correctIndex"]))
        else:
            q["correctIndex"] = 0
    return data


def generate_flash_from_document(document_text: str, count: int = 20, notes: str = "") -> dict[str, Any]:
    """Generate flashcards from uploaded document text. Returns same schema as generate_flash_content."""
    count = max(1, min(500, int(count or 20)))
    raw = _call_openai(_DOC_FLASH_SYSTEM, _build_doc_user_msg(document_text, count, notes), max_tokens=4000)
    data = _parse_json_response(raw, "flash_from_doc")
    if not isinstance(data.get("cards"), list):
        raise ValueError("AI flashcard response missing 'cards' array")
    for i, c in enumerate(data["cards"]):
        if not c.get("id"):
            c["id"] = f"ai_c{i + 1}"
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
    topic = str(slide_data.get("title") or "Tài liệu tải lên")
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
- Include a short Vietnamese explanation of why you suggest it (max 15 words)

Return ONLY valid JSON, no markdown fences, no explanation:
{"topics":[{"topic":"<English topic name>","kind":"slide"|"quiz"|"flash"|"fullset","reason":"<Vietnamese reason, max 15 words>"},...]}"""

_RECOMMEND_SYSTEM_SAME_KIND = """You are a learning topic recommender for a Vietnamese English-learning app.
You receive a ranked list of the user's top studied topics, sorted by TOTAL accumulated time spent (most time first).
The #1 entry is the topic the user has invested the most time in overall.

Your job: Recommend exactly 4 new study topics that:
- Are DIFFERENT from every topic already in the history list (no repeats)
- Are CLOSELY related to the TOP 1-2 topics (highest dwellSeconds) — prioritise similarity to the most-studied topic
- ALL 4 must be of kind: {kind}
- Are appropriate for Vietnamese high-school English learners (THPT level)
- Include a short Vietnamese explanation of why you suggest it (max 15 words)

Return ONLY valid JSON, no markdown fences, no explanation:
{{"topics":[{{"topic":"<English topic name>","kind":"{kind}","reason":"<Vietnamese reason, max 15 words>"}},...]}}\
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
        lines.append(f"{i}. [{h.get('kind', '?')}] {h.get('topic', '?')} — {h.get('dwellSeconds', 0)}s tổng cộng")
    user_msg = "Chủ đề học nhiều nhất (xếp hạng theo tổng thời gian, #1 = nhiều nhất):\n" + "\n".join(lines) + "\n\nĐề xuất 4 chủ đề mới bám sát chủ đề #1 và #2. Trả về JSON ngay."

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

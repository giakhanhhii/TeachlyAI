from __future__ import annotations

import json

import src.ai_content_generate as ai_content_generate


def test_generate_quiz_content_resolves_letter_and_text_answers(monkeypatch):
    payload = {
        "title": "Energy quiz",
        "questions": [
            {
                "text": "Which source is renewable?",
                "options": ["Coal", "Solar energy", "Diesel", "Plastic"],
                "correctAnswer": "B",
                "hint": "Solar can be replenished.",
            },
            {
                "text": "Which option matches the passage?",
                "options": ["Deforestation", "Recycling", "Pollution", "Mining"],
                "answer": "Recycling",
                "hint": "The document promotes waste reduction.",
            },
        ],
    }

    monkeypatch.setattr(ai_content_generate, "_call_openai", lambda *_args, **_kwargs: json.dumps(payload))

    data = ai_content_generate.generate_quiz_content("Green living", form={"count": 2})

    assert [q["correctIndex"] for q in data["questions"]] == [1, 1]


def test_generate_quiz_from_document_accepts_string_correct_index(monkeypatch):
    payload = {
        "title": "Reading check",
        "questions": [
            {
                "text": "What is the main topic?",
                "options": ["Rainforests", "Oceans", "Deserts", "Mountains"],
                "correctIndex": "2",
                "hint": "The passage focuses on deserts.",
            }
        ],
    }

    monkeypatch.setattr(ai_content_generate, "_call_openai", lambda *_args, **_kwargs: json.dumps(payload))

    data = ai_content_generate.generate_quiz_from_document("Document text", count=1)

    assert data["questions"][0]["correctIndex"] == 2


def test_generate_fullset_content_preserves_non_a_quiz_answers(monkeypatch):
    payload = {
        "title": "Education quiz",
        "questions": [
            {
                "text": "Which skill is collaborative?",
                "options": ["Isolation", "Teamwork", "Silence", "Delay"],
                "correctOption": "2",
                "hint": "Working with others matters.",
            }
        ],
    }

    monkeypatch.setattr(ai_content_generate, "_call_openai", lambda *_args, **_kwargs: json.dumps(payload))
    monkeypatch.setattr(
        ai_content_generate,
        "generate_slide_content",
        lambda topic, form=None: {"title": topic, "slides": [{"id": "s1", "title": "Cover", "bullets": ["One", "Two"]}]},
    )
    monkeypatch.setattr(
        ai_content_generate,
        "generate_flash_content",
        lambda topic, form=None: {"title": topic, "cards": [{"id": "c1", "front": "teamwork"}]},
    )

    data = ai_content_generate.generate_fullset_content("Education", form={"slides": 1, "quiz": 1, "flash": 1})

    assert data["quiz"]["questions"][0]["correctIndex"] == 1

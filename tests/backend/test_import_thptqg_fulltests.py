from __future__ import annotations

from pathlib import Path

import pytest

from scripts.import_thptqg_fulltests import (
    OPTION_RE,
    QUESTION_RE,
    apply_clear_answer_overrides,
    find_question_runs,
    slurp,
)


def test_option_re_only_matches_option_markers_at_line_start():
    text = (
        "Question 1. We met A. Smith during the trip.\n"
        "The sentence continues on the same line.\n"
        "A. First option\n"
        "B. Second option\n"
        "C. Third option\n"
        "D. Fourth option\n"
    )

    letters = [match.group(1) for match in OPTION_RE.finditer(text)]

    assert letters == ["A", "B", "C", "D"]


def test_slurp_raises_for_invalid_utf8(tmp_path: Path):
    sample = tmp_path / "broken.md"
    sample.write_bytes(b"valid\xffinvalid")

    with pytest.raises(UnicodeDecodeError):
        slurp(sample)


def test_find_question_runs_keeps_multiple_valid_runs():
    text = []
    for _ in range(2):
        for idx in range(1, 41):
            text.append(f"Question {idx}.")
    matches = list(QUESTION_RE.finditer("\n".join(text)))

    runs = find_question_runs(matches)

    assert len(runs) == 2
    assert [int(match.group(1)) for match in runs[0]] == list(range(1, 41))
    assert [int(match.group(1)) for match in runs[1]] == list(range(1, 41))


def test_apply_clear_answer_overrides_normalizes_lowercase_letters():
    questions = [
        {
            "number": 1,
            "correctIndex": 0,
            "explanation": "old",
            "explanationEvidence": "seed",
        }
    ]

    apply_clear_answer_overrides(questions, "case-test")

    assert questions[0]["correctIndex"] == 0


def test_apply_clear_answer_overrides_can_handle_uppercase_mapping(monkeypatch: pytest.MonkeyPatch):
    from scripts import import_thptqg_fulltests as mod

    monkeypatch.setitem(mod.CLEAR_ANSWER_OVERRIDES, "case-test", {1: "b"})
    questions = [
        {
            "number": 1,
            "correctIndex": 0,
            "explanation": "old",
            "explanationEvidence": "seed",
        }
    ]

    apply_clear_answer_overrides(questions, "case-test")

    assert questions[0]["correctIndex"] == 1
    assert "manual-override=B" in questions[0]["explanationEvidence"]

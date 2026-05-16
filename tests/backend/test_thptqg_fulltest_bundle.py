from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BUNDLE_PATH = ROOT / "backend" / "mock" / "thptqg_fulltest.json"


def load_bundle() -> dict:
    return json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))


def question_map(bundle: dict) -> dict[tuple[str, int], dict]:
    mapping: dict[tuple[str, int], dict] = {}
    for test in bundle["tests"]:
        for question in test["questions"]:
            mapping[(test["yearLabel"], question["number"])] = question
    return mapping


def test_fulltest_questions_keep_four_unique_non_empty_options():
    bundle = load_bundle()

    for test in bundle["tests"]:
        for question in test["questions"]:
            options = question["options"]
            assert len(options) == 4, f"{test['yearLabel']} Q{question['number']} must have 4 options"
            assert all(isinstance(option, str) and option.strip() for option in options)
            assert len(set(options)) == 4, f"{test['yearLabel']} Q{question['number']} has duplicate options"


def test_fulltest_regression_keys_and_sequences():
    bundle = load_bundle()
    questions = question_map(bundle)

    assert questions[("Mock 12", 38)]["correctIndex"] == 0
    assert questions[("Mock 12", 38)]["options"][0] == "a-b-d-e-c"

    assert questions[("Mock 13", 25)]["correctIndex"] == 3
    assert questions[("Mock 13", 27)]["correctIndex"] == 1
    assert questions[("Mock 13", 29)]["correctIndex"] == 2
    assert questions[("Mock 13", 29)]["options"][2] == "c-d-a-b-e"

    assert questions[("Mock 14", 13)]["correctIndex"] == 1
    assert questions[("Mock 14", 14)]["correctIndex"] == 1
    assert questions[("Mock 14", 15)]["correctIndex"] == 3
    assert questions[("Mock 14", 16)]["correctIndex"] == 1
    assert questions[("Mock 14", 17)]["correctIndex"] == 0
    assert questions[("Mock 14", 19)]["correctIndex"] == 3
    assert questions[("Mock 14", 21)]["correctIndex"] == 2
    assert questions[("Mock 14", 25)]["correctIndex"] == 2

    assert questions[("Mock 15", 9)]["correctIndex"] == 0
    assert questions[("Mock 15", 13)]["correctIndex"] == 3
    assert questions[("Mock 15", 22)]["correctIndex"] == 3
    assert questions[("Mock 15", 24)]["correctIndex"] == 3
    assert questions[("Mock 15", 25)]["correctIndex"] == 2
    assert questions[("Mock 15", 27)]["correctIndex"] == 2
    assert questions[("Mock 15", 28)]["correctIndex"] == 3
    assert questions[("Mock 15", 29)]["correctIndex"] == 2

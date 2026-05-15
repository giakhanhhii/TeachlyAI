from __future__ import annotations

import pytest

from src.utils.upload_safety import UploadSafetyViolation, ensure_safe_upload_content


def test_blocks_explicit_nsfw_upload_text():
    with pytest.raises(UploadSafetyViolation) as exc_info:
        ensure_safe_upload_content("This file includes porn and blowjob content.")

    assert exc_info.value.category == "nsfw"


def test_blocks_illegal_instruction_upload_text():
    with pytest.raises(UploadSafetyViolation) as exc_info:
        ensure_safe_upload_content("Step by step guide to make a bomb at home.")

    assert exc_info.value.category == "illegal"


def test_allows_normal_educational_text():
    ensure_safe_upload_content(
        "Read the passage about illegal logging in the Amazon rainforest. "
        "Students should answer the questions and discuss climate solutions."
    )


def test_blocks_obscene_notes_even_when_document_is_safe():
    with pytest.raises(UploadSafetyViolation) as exc_info:
        ensure_safe_upload_content(
            "Photosynthesis helps plants produce energy.",
            notes="dit nhau",
        )

    assert exc_info.value.category == "obscene"


def test_blocks_dashboard_like_text_even_when_it_has_words():
    with pytest.raises(UploadSafetyViolation) as exc_info:
        ensure_safe_upload_content(
            "Dashboard overview revenue active users conversion rate sessions retention exports settings.",
            notes="Focus on reading skills",
        )

    assert exc_info.value.category == "non_teaching_content"


def test_blocks_random_text_without_teaching_signal():
    with pytest.raises(UploadSafetyViolation) as exc_info:
        ensure_safe_upload_content(
            "Welcome back profile search notifications account activity recent updates.",
        )

    assert exc_info.value.category == "non_teaching_content"

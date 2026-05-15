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
        "Illegal logging harms biodiversity in the Amazon rainforest. "
        "Students should discuss climate solutions and conservation."
    )


def test_blocks_obscene_notes_even_when_document_is_safe():
    with pytest.raises(UploadSafetyViolation) as exc_info:
        ensure_safe_upload_content(
            "Photosynthesis helps plants produce energy.",
            notes="dit nhau",
        )

    assert exc_info.value.category == "obscene"

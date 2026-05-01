from __future__ import annotations

from pathlib import Path

import pytest

from scripts.import_thptqg_fulltests import OPTION_RE, slurp


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

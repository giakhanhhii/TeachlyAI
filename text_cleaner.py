"""Text post-processing: NFC, blacklist / exam streaming filter, image strip, highlights, MCQ layout."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, List, Optional, Sequence, Tuple

HighlightSegment = Tuple[str, str]


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


# -----------------------------------------------------------------------------
# Intros / TOC blacklist (normalized NFC substring match, case-insensitive ASCII)
# -----------------------------------------------------------------------------

_INTRO_BLACKLIST = (
    "Lời nói đầu",
    "Bạn đọc thân mến",
    "Nhóm tác giả",
    "Mục lục",
    "Table of Contents",
)


def page_is_blacklisted(page_text: str) -> bool:
    t = nfc(page_text).casefold()
    for phrase in _INTRO_BLACKLIST:
        if nfc(phrase).casefold() in t:
            return True
    return False


# -----------------------------------------------------------------------------
# Exam-start heuristics (regex + option-line density)
# -----------------------------------------------------------------------------

_RE_MARK_LETTER = re.compile(
    r"Mark\s+(?:the\s+)?letter\b",
    re.IGNORECASE,
)
_RE_QUESTION_EN = re.compile(
    r"(?:^|\n)\s*Question\s*\d+\s*[.:]\s*",
    re.IGNORECASE | re.MULTILINE,
)
_RE_QUESTION_VI = re.compile(
    r"(?:^|\n)\s*(?:Câu|Cau)\s*\d+\s*[.:]\s*",
    re.IGNORECASE | re.MULTILINE,
)
_RE_OPTION_LINE = re.compile(r"^\s*[A-Da-d](?:[\.)])\s+\S", re.MULTILINE)


def _option_stats(page_text: str) -> tuple[int, int]:
    lines = [ln.strip() for ln in page_text.splitlines()]
    nonempty = [ln for ln in lines if ln]
    if not nonempty:
        return 0, 0
    opts = sum(1 for ln in nonempty if _RE_OPTION_LINE.match(ln))
    return opts, len(nonempty)


def page_triggers_exam_start(page_text: str) -> bool:
    if _RE_MARK_LETTER.search(page_text):
        return True
    if _RE_QUESTION_EN.search(page_text) or _RE_QUESTION_VI.search(page_text):
        return True
    opts, n = _option_stats(page_text)
    if opts >= 4:
        return True
    if n and opts >= 3 and (opts / n) >= 0.25:
        return True
    return False


def filter_pages_markdown(page_mds: Sequence[str]) -> list[str]:
    """
    Apply blacklist + dynamic exam start. Returns kept pages in order (each string is
    one page’s markdown from Chandra).
    """
    kept: list[str] = []
    exercise_started = False
    for md in page_mds:
        text = nfc(md or "")
        if page_is_blacklisted(text):
            continue
        if not exercise_started:
            if page_triggers_exam_start(text):
                exercise_started = True
                kept.append(md)
            continue
        kept.append(md)
    return kept


@dataclass
class StreamingFilterState:
    """Mutable state for per-page keep/skip matching filter_pages_markdown order."""

    exercise_started: bool = False


def streaming_should_keep_page(
    md: str,
    *,
    export_mode: str,
    state: StreamingFilterState,
) -> tuple[bool, StreamingFilterState]:
    """
    Same keep/skip semantics as filter_pages_markdown, one page at a time.
    Returns (keep_this_page, updated_state). Mutates `state` in place for exercise_started.
    """
    text = nfc(md or "")
    if export_mode == "full":
        return bool(text.strip()), state

    if page_is_blacklisted(text):
        return False, state

    if not state.exercise_started:
        if page_triggers_exam_start(text):
            state.exercise_started = True
            return True, state
        return False, state

    return True, state


# -----------------------------------------------------------------------------
# Markdown image stripping (strict regex)
# -----------------------------------------------------------------------------

_RE_MD_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")


def strip_markdown_images(md: str) -> str:
    out = _RE_MD_IMAGE.sub("", md)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.rstrip() + ("\n" if out and not out.endswith("\n") else "")


# -----------------------------------------------------------------------------
# Highlight extraction (PyMuPDF) — optional
# -----------------------------------------------------------------------------


def _rgb01_to_class(rgb: Optional[Sequence[float]]) -> str:
    if not rgb or len(rgb) < 3:
        return "highlight"
    r, g, b = float(rgb[0]), float(rgb[1]), float(rgb[2])
    if r > 0.65 and g > 0.65 and b < 0.45:
        return "yellow"
    if g > max(r, b) + 0.15 and g > 0.45:
        return "green"
    if r > 0.55 and b > 0.45 and g < 0.55:
        return "pink"
    if b > max(r, g) + 0.15 and b > 0.45:
        return "blue"
    return "highlight"


def _iter_annots(page: Any) -> Iterable[Any]:
    fn = getattr(page, "annots", None)
    if callable(fn):
        try:
            for a in fn() or []:
                yield a
            return
        except TypeError:
            pass
    annot = page.first_annot
    while annot is not None:
        yield annot
        annot = annot.next


def extract_highlight_segments(pdf_path: Path) -> List[HighlightSegment]:
    import fitz  # pymupdf

    doc = fitz.open(pdf_path)
    try:
        ordered: List[Tuple[int, float, str, str]] = []
        for pno in range(len(doc)):
            page = doc[pno]
            for annot in _iter_annots(page):
                atype = getattr(annot, "type", (None, ""))
                if len(atype) <= 1 or str(atype[1]).lower() != "highlight":
                    continue
                colors = getattr(annot, "colors", None) or {}
                stroke = colors.get("stroke")
                cls = _rgb01_to_class(stroke)
                rect = annot.rect
                text = nfc(page.get_text("text", clip=rect).strip())
                if not text:
                    continue
                y_top = float(rect.y0)
                ordered.append((pno, y_top, cls, text))
        ordered.sort(key=lambda t: (t[0], t[1]))
        return [(t[2], t[3]) for t in ordered]
    finally:
        doc.close()


def _flexible_wrap_first_occurrence(md: str, css_class: str, needle: str) -> str:
    parts = needle.split()
    if not parts:
        return md
    pattern = r"\s+".join(re.escape(p) for p in parts)
    m = re.search(pattern, md, flags=re.DOTALL)
    if not m:
        return md
    wrapped = f'<mark class="{css_class}">{m.group(0)}</mark>'
    return md[: m.start()] + wrapped + md[m.end() :]


def apply_highlight_marks(md: str, segments: Sequence[HighlightSegment]) -> str:
    out = md
    for css_class, text in segments:
        out = _flexible_wrap_first_occurrence(out, css_class, text)
    return out


# -----------------------------------------------------------------------------
# Post-process (MCQ / passages; preserves <mark>…</mark>)
# -----------------------------------------------------------------------------


def post_process_markdown(md: str) -> str:
    _MARK_HTML = re.compile(r"<mark\b[^>]*>.*?</mark>", re.IGNORECASE | re.DOTALL)
    _PH_OPEN, _PH_CLOSE = "\uE000", "\uE001"

    def _shield_marks(s: str) -> tuple[str, list[str]]:
        parts: list[str] = []

        def _sub(m: re.Match[str]) -> str:
            parts.append(m.group(0))
            return f"{_PH_OPEN}{len(parts) - 1:05d}{_PH_CLOSE}"

        return _MARK_HTML.sub(_sub, s), parts

    def _unshield(s: str, parts: list[str]) -> str:
        out = s
        for i, frag in enumerate(parts):
            out = out.replace(f"{_PH_OPEN}{i:05d}{_PH_CLOSE}", frag)
        return out

    _Q_VI = re.compile(
        r"^\s*(?:Câu|Cau|CAU)\s*\d+\s*[.:]\s*",
        re.IGNORECASE,
    )
    _Q_EN = re.compile(r"^\s*Question\s*\d+\s*[.:]\s*", re.IGNORECASE)
    _OPT = re.compile(r"^(\s*)([A-Da-d])([\.)])\s+(.*)$")

    def _is_question_line(line: str) -> bool:
        t = line.strip()
        return bool(_Q_VI.match(t) or _Q_EN.match(t))

    def _is_option_line(line: str) -> bool:
        return _OPT.match(line) is not None

    def _is_hard_boundary(line: str) -> bool:
        t = line.strip()
        if not t:
            return False
        if t.startswith("|"):
            return True
        if re.match(r"^#{1,6}\s+", t):
            return True
        if re.match(r"^[-*+]\s+", t):
            return True
        if re.match(r"^>{1,}\s+", t):
            return True
        if re.match(r"^\s*```", t):
            return True
        if re.match(
            r"^\s*(?:Mã\s+đề|Mã\s+de|Mã\s+DE|Ma\s+de)\b",
            t,
            re.IGNORECASE,
        ):
            return True
        if re.match(
            r"^\s*(?:Part|PART|Phần|Phan|PHAN)\s+[IVXLC0-9]+",
            t,
            re.IGNORECASE,
        ):
            return True
        if re.match(
            r"^\s*(?:Đọc\s+hiểu|Doc\s+hieu|READING|Reading\s+passage)\b",
            t,
            re.IGNORECASE,
        ):
            return True
        if re.match(r"^\s*(?:HẾT|HET)\b", t, re.IGNORECASE):
            return True
        if re.match(r"^\s*\(\d{1,2}\)\s+\S", t):
            return True
        return _is_question_line(line) or _is_option_line(line)

    def _collapse_blank_runs(s: str) -> str:
        return re.sub(r"\n{3,}", "\n\n", s)

    def _coalesce_soft_paragraph_breaks(text: str) -> str:
        lines = text.split("\n")
        out: list[str] = []
        i = 0
        while i < len(lines):
            cur = lines[i]
            if i + 1 < len(lines):
                nxt = lines[i + 1]
                cs, ns = cur.strip(), nxt.strip()
                if cs and ns and not _is_hard_boundary(nxt):
                    if not cur.strip().endswith((".", "?", "!", ":", ";")):
                        last = cur.rstrip()
                        if last and last[-1].islower() and ns[0].islower():
                            out.append(last + " " + ns)
                            i += 2
                            continue
            out.append(cur)
            i += 1
        return "\n".join(out)

    def _split_fused_options_on_line(line: str) -> str:
        opt_head = r"(?<![A-Za-z0-9])[A-D](?:[\.)])\s+"
        if len(re.findall(opt_head, line, flags=re.IGNORECASE)) < 2:
            return line
        chunks = re.split(rf"(?<=\S)\s+(?={opt_head})", line, flags=re.IGNORECASE)
        return "\n".join(chunks)

    def _heal_mcq_block(text: str) -> str:
        lines = text.split("\n")
        out: list[str] = []
        ctx: str = "none"

        for line in lines:
            raw = line
            stripped = raw.strip()
            if not stripped:
                out.append(raw)
                continue

            if _is_hard_boundary(raw) and not (
                ctx in ("question", "option") and _is_option_line(raw)
            ):
                if _is_question_line(raw):
                    ctx = "question"
                elif _is_option_line(raw):
                    ctx = "option"
                else:
                    ctx = "none"
                out.append(_split_fused_options_on_line(raw))
                continue

            if _is_option_line(raw):
                ctx = "option"
                out.append(_split_fused_options_on_line(raw))
                continue

            if ctx in ("question", "option") and out:
                j = len(out) - 1
                while j >= 0 and not out[j].strip():
                    j -= 1
                if j >= 0:
                    base = out[j].rstrip()
                    out[j] = base + (" " if base else "") + stripped
                    continue

            ctx = "other"
            out.append(raw)

        return "\n".join(out)

    s, stored = _shield_marks(md)
    s = _collapse_blank_runs(s)
    s = _coalesce_soft_paragraph_breaks(s)
    s = _heal_mcq_block(s)
    s = "\n".join(_split_fused_options_on_line(L) for L in s.split("\n"))
    s = _collapse_blank_runs(s)
    return _unshield(s, stored)

from __future__ import annotations

import io
import logging
import os
import tempfile
import xml.etree.ElementTree as ElementTree
import zipfile
from pathlib import Path

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".md", ".txt", ".docx"}
MAX_PAGES = 20
MAX_CHARS = 40_000  # ~20 pages at ~2 000 chars/page


class UnsupportedFormatError(ValueError):
    pass


class PageLimitError(ValueError):
    pass


def _pdf_page_count_pdfplumber(path: Path) -> int:
    import pdfplumber  # type: ignore
    with pdfplumber.open(str(path)) as pdf:
        return len(pdf.pages)


def _extract_pdf_via_pdfplumber(path: Path) -> str:
    """Fallback PDF extraction using pdfplumber — returns plain text joined by page."""
    import pdfplumber  # type: ignore
    lines: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                lines.append(f"### Trang {i}\n\n{text}")
    return "\n\n".join(lines)


def _extract_docx_text_stdlib(payload: bytes) -> str:
    """Extract DOCX text using stdlib only (zipfile + ElementTree).
    Borrowed from feature/lighton-ocr. Used as fallback when markitdown fails."""
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            xml_bytes = archive.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile) as exc:
        raise RuntimeError("Không đọc được tệp DOCX.") from exc
    root = ElementTree.fromstring(xml_bytes)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", ns):
        runs = [str(node.text or "") for node in para.findall(".//w:t", ns)]
        line = "".join(runs).strip()
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs).strip()


def _extract_via_markitdown(tmp_path: str) -> str:
    from markitdown import MarkItDown  # type: ignore
    md = MarkItDown()
    result = md.convert(tmp_path)
    return (result.text_content or "").strip()


def extract_text(file_bytes: bytes, filename: str) -> str:
    """
    Extract text from an uploaded file and return as Markdown string.

    Raises UnsupportedFormatError for unsupported extensions.
    Raises PageLimitError when the file exceeds MAX_PAGES or MAX_CHARS.
    """
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFormatError(
            "Định dạng không được hỗ trợ. Vui lòng dùng PDF, DOCX, Markdown (.md) hoặc TXT."
        )

    if ext == ".pdf":
        return _extract_pdf(file_bytes, filename)

    if ext == ".docx":
        return _extract_docx(file_bytes, filename)

    # .txt / .md — decode directly
    text = file_bytes.decode("utf-8", errors="replace").strip()
    if len(text) > MAX_CHARS:
        raise PageLimitError(
            f"Tài liệu quá dài ({len(text):,} ký tự). "
            f"Giới hạn {MAX_CHARS:,} ký tự (tương đương {MAX_PAGES} trang)."
        )
    return text[:MAX_CHARS]


def _extract_pdf(file_bytes: bytes, filename: str) -> str:
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(file_bytes)
            tmp_path = f.name

        # Page count check first (fast)
        try:
            n_pages = _pdf_page_count_pdfplumber(Path(tmp_path))
        except Exception:
            n_pages = 0  # can't count — let it through, extract will be the gate

        if n_pages > MAX_PAGES:
            raise PageLimitError(
                f"Tài liệu có {n_pages} trang, vượt quá giới hạn {MAX_PAGES} trang."
            )

        # Primary: markitdown (preserves headings, tables, lists)
        text: str | None = None
        try:
            text = _extract_via_markitdown(tmp_path)
        except Exception as exc:
            logger.warning("markitdown PDF extraction failed (%s), falling back to pdfplumber", exc)

        # Fallback: pdfplumber
        if not text:
            try:
                text = _extract_pdf_via_pdfplumber(Path(tmp_path))
            except Exception as exc:
                logger.error("pdfplumber PDF extraction also failed: %s", exc)
                raise RuntimeError("Không thể trích xuất nội dung tệp PDF.") from exc

        return text[:MAX_CHARS]
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _extract_docx(file_bytes: bytes, filename: str) -> str:
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
            f.write(file_bytes)
            tmp_path = f.name

        # Primary: markitdown
        text: str | None = None
        try:
            text = _extract_via_markitdown(tmp_path)
        except Exception as exc:
            logger.warning("markitdown DOCX extraction failed (%s), falling back to stdlib", exc)

        # Fallback: stdlib zipfile + ElementTree
        if not text:
            try:
                text = _extract_docx_text_stdlib(file_bytes)
            except Exception as exc:
                logger.error("Stdlib DOCX extraction also failed: %s", exc)
                raise RuntimeError("Không thể trích xuất nội dung tệp DOCX.") from exc

        if len(text) > MAX_CHARS:
            raise PageLimitError(
                f"Tài liệu quá dài. Giới hạn {MAX_CHARS:,} ký tự "
                f"(tương đương {MAX_PAGES} trang)."
            )
        return text[:MAX_CHARS]
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

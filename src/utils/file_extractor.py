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
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
ALL_SUPPORTED_EXTENSIONS = SUPPORTED_EXTENSIONS | IMAGE_EXTENSIONS
MAX_PAGES = 20
MAX_CHARS = 40_000  # ~20 pages at ~2 000 chars/page
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB for images

IMAGE_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
}


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


def extract_text(file_bytes: bytes, filename: str, openai_api_key: str | None = None) -> str:
    """
    Extract text from an uploaded file and return as Markdown string.

    Raises UnsupportedFormatError for unsupported extensions.
    Raises PageLimitError when the file exceeds MAX_PAGES or MAX_CHARS.
    For image files, openai_api_key is required for Vision OCR.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALL_SUPPORTED_EXTENSIONS:
        raise UnsupportedFormatError(
            "Định dạng không được hỗ trợ. Vui lòng dùng PDF, DOCX, Markdown (.md), TXT hoặc ảnh (JPG, PNG, WEBP)."
        )

    if ext in IMAGE_EXTENSIONS:
        if not openai_api_key:
            raise RuntimeError("Không thể xử lý ảnh: thiếu API key.")
        if len(file_bytes) > MAX_IMAGE_BYTES:
            raise PageLimitError(
                f"Ảnh quá lớn ({len(file_bytes) // (1024*1024)} MB). Giới hạn 10 MB."
            )
        return _extract_image(file_bytes, ext, openai_api_key)

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


def _extract_image(file_bytes: bytes, ext: str, openai_api_key: str) -> str:
    """Use OpenAI Vision (gpt-4o) to OCR text from an image."""
    import base64
    from openai import OpenAI

    mime = IMAGE_MIME.get(ext, "image/jpeg")
    b64 = base64.b64encode(file_bytes).decode("utf-8")

    client = OpenAI(api_key=openai_api_key)
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}", "detail": "high"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Trích xuất toàn bộ văn bản có trong ảnh này. "
                            "Giữ nguyên cấu trúc, tiêu đề, danh sách và bảng biểu nếu có. "
                            "Chỉ trả về văn bản đã trích xuất, không giải thích thêm."
                        ),
                    },
                ],
            }],
            max_tokens=4000,
        )
        text = (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error("OpenAI Vision OCR failed: %s", exc)
        raise RuntimeError("Không thể đọc văn bản từ ảnh. Vui lòng thử lại.") from exc

    if not text:
        raise RuntimeError("Không tìm thấy văn bản trong ảnh.")

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

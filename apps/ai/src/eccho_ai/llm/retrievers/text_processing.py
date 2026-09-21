from pathlib import Path
import re
import unicodedata

from docx import Document as DocxDocument
from langchain_core.documents import Document
from pypdf import PdfReader

from eccho_ai.llm.retrievers.html_text import extract_readable_text


SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".html", ".htm"}


def assert_supported_file(path: Path) -> None:
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        raise ValueError(f"Unsupported file type '{path.suffix}'. Supported: {supported}")


def load_document(path: Path, *, source_filename: str, mime_type: str | None) -> Document:
    assert_supported_file(path)

    extension = path.suffix.lower()
    try:
        if extension == ".pdf":
            text = _read_pdf(path)
        elif extension == ".docx":
            text = _read_docx(path)
        elif extension in (".html", ".htm"):
            text = _read_html(path)
        else:
            text = _read_txt(path)
    except Exception as exc:
        raise ValueError(f"Failed to parse {extension} file: {exc}") from exc

    normalized = normalize_text(text)
    return Document(
        page_content=normalized,
        metadata={
            "source": source_filename,
            "local_path": str(path),
            "mime_type": mime_type,
            "extension": extension,
        },
    )


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "")
    text = text.replace("\x00", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Strip <script>/<style> blocks before anything else.
    text = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", text, flags=re.IGNORECASE | re.DOTALL)
    # Strip zero-width + BOM + other non-printable control chars (keep \n, \t).
    text = re.sub(r"[​-‍﻿]", "", text)
    text = re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    pages: list[str] = []
    for index, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages.append(f"\n\n[Page {index + 1}]\n{page_text}")
    return "\n".join(pages)


def _read_docx(path: Path) -> str:
    document = DocxDocument(str(path))
    parts: list[str] = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if text:
            parts.append(text)

    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                parts.append(" | ".join(cells))

    return "\n".join(parts)


def _read_html(path: Path) -> str:
    return extract_readable_text(_read_txt(path))


def _read_txt(path: Path) -> str:
    return _decode_bytes(path.read_bytes())


def _decode_bytes(data: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")

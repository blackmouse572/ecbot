"""PDF reader repository using PyMuPDF (fitz).

Returns page-aware text chunks for the chunking pipeline.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from io import BytesIO

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


@dataclass
class PageText:
    """Text extracted from a single PDF page."""

    page_index: int
    text: str


@dataclass
class PdfReadResult:
    """Aggregated result of reading a PDF file."""

    pages: list[PageText] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        """Concatenated text from all pages."""
        return "\n\n".join(p.text for p in self.pages if p.text.strip())

    @property
    def preview_text(self) -> str:
        """First ~500 characters suitable for the knowledge item's content preview."""
        text = self.full_text
        return text[:500].rstrip() + ("…" if len(text) > 500 else "")


class PdfReaderRepo:
    """Reads a PDF file from bytes and extracts structured, page-aware text."""

    def read_bytes(self, data: bytes) -> PdfReadResult:
        """Open a PDF from raw bytes and extract text page-by-page.

        Args:
            data: Raw PDF file bytes.

        Returns:
            A :class:`PdfReadResult` containing per-page text.
        """
        result = PdfReadResult()
        try:
            with fitz.open(stream=BytesIO(data), filetype="pdf") as doc:
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    text = page.get_text("text")  # plain text extraction
                    result.pages.append(PageText(page_index=page_num, text=text))
        except Exception as exc:
            logger.error(f"PdfReaderRepo: failed to read PDF — {exc}")
            raise

        return result

    def read_file(self, path: str) -> PdfReadResult:
        """Open a PDF from the filesystem and extract text.

        Args:
            path: Absolute path to the PDF file.
        """
        with open(path, "rb") as f:
            return self.read_bytes(f.read())

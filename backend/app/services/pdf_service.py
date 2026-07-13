"""Preprocessing pipeline step 1: extract text from a PDF, page by page."""
from pathlib import Path

from pypdf import PdfReader


def extract_pages(pdf_path: str | Path) -> list[tuple[int, str]]:
    """Return a list of (page_number, text) tuples. Pages are 1-indexed.

    Empty pages are skipped so they don't pollute the vector store.
    """
    reader = PdfReader(str(pdf_path))
    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i, text))
    return pages

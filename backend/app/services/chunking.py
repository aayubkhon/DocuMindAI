"""Preprocessing pipeline step 2: split document text into overlapping chunks.

Pages are concatenated and split together (rather than page-by-page) so a short
page does not force a tiny standalone chunk — this keeps the chunk/embedding
count low. Each chunk records the page it starts on, so answers can still cite
pages (see UI mockup: "Project Goals... (Page 3)").
"""
from bisect import bisect_right

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

_JOINER = "\n\n"


def chunk_pages(
    pages: list[tuple[int, str]],
    *,
    document_id: str,
    filename: str,
) -> list[Document]:
    if not pages:
        return []

    # Concatenate pages, remembering the character offset where each page starts.
    offsets: list[int] = []
    page_numbers: list[int] = []
    parts: list[str] = []
    pos = 0
    for page_number, text in pages:
        offsets.append(pos)
        page_numbers.append(page_number)
        parts.append(text)
        pos += len(text) + len(_JOINER)
    full_text = _JOINER.join(parts)

    def page_for(char_index: int) -> int:
        # Rightmost page whose start offset is <= char_index.
        return page_numbers[bisect_right(offsets, char_index) - 1]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        add_start_index=True,
    )

    documents: list[Document] = []
    for raw in splitter.create_documents([full_text]):
        start = raw.metadata.get("start_index", 0)
        documents.append(
            Document(
                page_content=raw.page_content,
                metadata={
                    "document_id": document_id,
                    "filename": filename,
                    "page": page_for(start),
                },
            )
        )
    return documents

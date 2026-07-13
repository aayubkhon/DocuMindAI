"""Preprocessing pipeline step 2: split page text into overlapping chunks.

Each chunk keeps its source page number so answers can cite pages (see UI mockup:
"Project Goals... (Page 3)").
"""
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings


def chunk_pages(
    pages: list[tuple[int, str]],
    *,
    document_id: str,
    filename: str,
) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        add_start_index=True,
    )

    documents: list[Document] = []
    for page_number, text in pages:
        for chunk in splitter.split_text(text):
            documents.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "document_id": document_id,
                        "filename": filename,
                        "page": page_number,
                    },
                )
            )
    return documents

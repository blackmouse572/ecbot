"""Storage file names must never be exposed as a source URL (review of #193)."""
from eccho_ai.llm.retrievers.retrieval import RAGRetrievalResult, RAGRetrievalService, RetrievedChunk


def _chunk(document_meta: dict, chunk_meta: dict) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id="c1", document_id="d1", filename="1790661848627-kunmart-doi-tra.docx",
        chunk_index=0, content="Returns within 7 days.",
        metadata={"document": document_meta, "chunk": chunk_meta},
    )


def test_uploaded_file_has_no_source_url():
    chunk = _chunk({}, {"source": "1790661848627-kunmart-doi-tra.docx"})
    context = RAGRetrievalService(store=object(), embedder=object()).format_context([chunk])
    assert "kunmart-doi-tra" not in context
    result = RAGRetrievalResult(query="q", chunks=[chunk], context=context)
    assert result.source_attributions[0]["source_url"] is None


def test_web_page_keeps_its_source_url():
    chunk = _chunk({"source_url": "https://shop.vn/doi-tra"}, {"source": "https://shop.vn/doi-tra"})
    context = RAGRetrievalService(store=object(), embedder=object()).format_context([chunk])
    assert "url=https://shop.vn/doi-tra" in context
    result = RAGRetrievalResult(query="q", chunks=[chunk], context=context)
    assert result.source_attributions[0]["source_url"] == "https://shop.vn/doi-tra"


# #204: operators see every source as "KB-n · <title>", never the storage name.
def test_source_has_the_knowledge_item_title():
    chunk = _chunk({"title": "Chính sách đổi trả"}, {"source": "1790661848627-kunmart-doi-tra.docx"})
    result = RAGRetrievalResult(query="q", chunks=[chunk], context="")
    assert result.source_attributions[0]["title"] == "Chính sách đổi trả"


def test_web_page_falls_back_to_its_page_title():
    chunk = _chunk({"source_url": "https://shop.vn/doi-tra"}, {"title": "Đổi trả | Kunmart"})
    result = RAGRetrievalResult(query="q", chunks=[chunk], context="")
    assert result.source_attributions[0]["title"] == "Đổi trả | Kunmart"


def test_old_upload_without_title_reads_its_name_without_the_storage_prefix():
    chunk = _chunk({}, {})
    result = RAGRetrievalResult(query="q", chunks=[chunk], context="")
    assert result.source_attributions[0]["title"] == "kunmart-doi-tra"

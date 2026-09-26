from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from eccho_ai.core.security import require_internal_token
from eccho_ai.models.app_models import AppResponse
from eccho_ai.models.chat import Chatbots
from eccho_ai.modules.rag.models import RAGChatbotLinksRequest, RAGRetrieveRequest, RAGTextIngestRequest, RAGUrlIngestRequest
from eccho_ai.llm.retrievers.retrieval import RAGRetrievalService
from eccho_ai.modules.rag.services import RAGIngestService
from eccho_ai.core.postgres import PostgresRepo


router = APIRouter(
    prefix="/rag", tags=["RAG"], dependencies=[Depends(require_internal_token)]
)
rag_ingest_service = RAGIngestService()
rag_retrieval_service = RAGRetrievalService()


@router.post("/ingest/upload")
async def upload_document(
    file: UploadFile = File(...),
    knowledge_item_id: str = Form(...),
    chatbot_ids: str = Form(default=""),
    chunk_size: int | None = Form(default=None),
    chunk_overlap: int | None = Form(default=None),
    knowledge_base_id: str | None = Form(default=None),
):
    parsed_chatbot_ids = [s.strip() for s in (chatbot_ids or "").split(",") if s.strip()]
    try:
        result = await rag_ingest_service.ingest_upload(
            file=file,
            knowledge_item_id=knowledge_item_id,
            chatbot_ids=parsed_chatbot_ids,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            metadata={"knowledge_base_id": knowledge_base_id} if knowledge_base_id else {},
        )
        return AppResponse(data=result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/ingest/url")
async def ingest_url(request: RAGUrlIngestRequest):
    try:
        result = await rag_ingest_service.ingest_url(
            url=request.url,
            knowledge_item_id=request.knowledge_item_id,
            chatbot_ids=request.chatbot_ids,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            only_main_content=request.only_main_content,
            max_age=request.max_age,
            parsers=request.parsers,
            metadata={"knowledge_base_id": request.knowledge_base_id} if request.knowledge_base_id else {},
        )
        return AppResponse(data=result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"URL ingest failed: {exc}") from exc


@router.post("/ingest/text")
async def ingest_text(request: RAGTextIngestRequest):
    try:
        result = await rag_ingest_service.ingest_text(
            knowledge_item_id=request.knowledge_item_id, text=request.text,
            title=request.title, chatbot_ids=request.chatbot_ids,
            knowledge_base_id=request.knowledge_base_id,
            chunk_size=request.chunk_size, chunk_overlap=request.chunk_overlap,
        )
        return AppResponse(data=result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/documents")
async def list_documents(limit: int = 20):
    documents = await rag_ingest_service.list_documents(limit=limit)
    return AppResponse(data=documents)


@router.get("/chatbots")
async def list_chatbots(limit: int = 50):
    chatbot_db = PostgresRepo[Chatbots].get_instance()
    chatbots = await chatbot_db.get_all(Chatbots, limit=limit)
    return AppResponse(data=[
        {
            "id": str(chatbot.id),
            "name": chatbot.name,
            "status": chatbot.status,
            "model_provider": chatbot.model_provider,
            "model_text_name": chatbot.model_text_name,
        }
        for chatbot in chatbots
    ])


@router.patch("/documents/by-item/{knowledge_item_id}/chatbots")
async def update_document_chatbots(knowledge_item_id: str, request: RAGChatbotLinksRequest):
    updated = await rag_ingest_service.store.update_chatbot_links(
        knowledge_item_id, request.chatbot_ids
    )
    return AppResponse(data={"updated": updated})


@router.delete("/documents/by-item/{knowledge_item_id}")
async def delete_document_by_item(knowledge_item_id: str):
    removed = await rag_ingest_service.store.delete_by_knowledge_item(knowledge_item_id)
    return AppResponse(data={"removed": removed})


@router.post("/retrieve")
async def retrieve_context(request: RAGRetrieveRequest):
    result = await rag_retrieval_service.retrieve(
        chatbot_id=request.chatbot_id,
        query=request.query,
    )
    return AppResponse(data={
        "query": result.query,
        "context": result.context,
        "sources": result.source_attributions,
        "chunks": [
            {
                "chunk_id": chunk.chunk_id,
                "document_id": chunk.document_id,
                "filename": chunk.filename,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "similarity_score": chunk.similarity_score,
                "fts_score": chunk.fts_score,
                "rerank_score": chunk.rerank_score,
                "sources": sorted(chunk.sources),
                "metadata": chunk.metadata,
            }
            for chunk in result.chunks
        ],
    })

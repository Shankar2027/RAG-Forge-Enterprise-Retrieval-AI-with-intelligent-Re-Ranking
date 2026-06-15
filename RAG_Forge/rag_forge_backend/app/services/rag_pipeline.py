import asyncio
import logging
import time
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.models import QueryLog
from app.schemas.schemas import AskRequest, AskResponse, ChunkResult
from app.services.llm import LLMService
from app.services.reranker import ReRankerService
from app.services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)

class RAGPipelineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.vector_store = VectorStoreService()
        self.reranker = ReRankerService()
        self.llm = LLMService()

    def _get_context_with_fallback(self, reranked_raw: list[dict], request: AskRequest):
        """
        Passes the Top-N chunks to the LLM regardless of their raw score,
        allowing the LLM's superior logic to determine relevance.
        """
        if not reranked_raw:
            return []
        return reranked_raw[:request.rerank_top_n]

    async def query(self, request: AskRequest, user_id: str) -> AskResponse:
        start_time = time.time()
        collection_name = f"{settings.chroma_collection_prefix}_{request.collection_id}"

        # 1. Retrieval
        retrieval_t0 = time.time()
        if request.use_hybrid:
            raw_results = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.vector_store.hybrid_search(collection_name, request.question, request.top_k),
            )
        else:
            raw_results = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.vector_store.vector_search(collection_name, request.question, request.top_k),
            )
        retrieval_ms = (time.time() - retrieval_t0) * 1000

        # 2. Re-rank
        rerank_ms = 0.0
        if request.use_reranker and raw_results:
            rerank_t0 = time.time()
            reranked_raw, _ = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self.reranker.rerank(request.question, raw_results, request.rerank_top_n),
            )
            rerank_ms = (time.time() - rerank_t0) * 1000
        else:
            reranked_raw = raw_results[: request.rerank_top_n]

        final_context_chunks = self._get_context_with_fallback(reranked_raw, request)

        # Helper function to convert raw dictionaries into strict Pydantic ChunkResult objects
        def parse_chunk(c: dict) -> ChunkResult:
            meta = c.get("metadata") or {}
            return ChunkResult(
                chunk_id=str(c.get("id", c.get("chunk_id", "unknown"))),
                document_id=str(meta.get("document_id", "unknown")),
                document_name=str(meta.get("document_name", "unknown")),
                chunk_index=int(meta.get("chunk_index", 0)),
                text=str(c.get("text", "")),
                similarity_score=float(c.get("score", c.get("similarity_score", 0.0))),
                rerank_score=float(c.get("rerank_score")) if c.get("rerank_score") is not None else None,
                page_number=int(meta.get("page_number", 0)) if meta.get("page_number") else None
            )

        formatted_retrieved = [parse_chunk(c) for c in raw_results]
        formatted_reranked = [parse_chunk(c) for c in final_context_chunks]

        # 3. Generate Answer
        answer, citations, confidence, llm_ms = await self.llm.answer(request.question, final_context_chunks)
        
        # 4. Save to DB (Use model_dump() to ensure JSON serialization compatibility)
        log_id = ""
        try:
            log = QueryLog(
                user_id=user_id, 
                collection_id=request.collection_id, 
                question=request.question,
                answer=answer, 
                retrieved_chunks=[c.model_dump() for c in formatted_retrieved[:3]],
                citations=[c.model_dump() for c in citations] if citations else [],
                reranked_chunks=[c.model_dump() for c in formatted_reranked[:3]],
                confidence_score=confidence, 
                retrieval_time_ms=retrieval_ms, 
                rerank_time_ms=rerank_ms,
                llm_time_ms=llm_ms, 
                total_time_ms=(time.time() - start_time) * 1000, 
                used_reranker=request.use_reranker, 
                used_hybrid=request.use_hybrid
            )
            self.db.add(log)
            await self.db.commit()
            await self.db.refresh(log)
            log_id = str(log.id)
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Log error: {e}")

        # 5. Return the STRICTly formatted response
        return AskResponse(
            question=request.question, 
            answer=answer, 
            retrieved_chunks=formatted_retrieved, 
            reranked_chunks=formatted_reranked,
            citations=citations, 
            confidence_score=confidence, 
            retrieval_time_ms=retrieval_ms,
            rerank_time_ms=rerank_ms, 
            llm_time_ms=llm_ms, 
            total_time_ms=(time.time() - start_time) * 1000, 
            query_log_id=log_id
        )
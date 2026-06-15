"""
RAG Forge – Ask AI Router
"""
from __future__ import annotations

import json
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.models import Collection, QueryLog, User
from app.schemas.schemas import AskRequest, AskResponse, QueryLogOut, QueryLogDetailOut
from app.services.rag_pipeline import RAGPipelineService

router = APIRouter(prefix="/rag", tags=["RAG Pipeline"])

async def _verify_collection(collection_id: str, user_id: str, db: AsyncSession) -> Collection:
    """Ensure the user owns the collection they are querying."""
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.owner_id == user_id)
    )
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(404, "Collection not found")
    return col

@router.post("/ask", response_model=AskResponse)
async def ask(
    payload: AskRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Full RAG pipeline — returns complete response with citations & scores."""
    await _verify_collection(payload.collection_id, current.id, db)
    pipeline = RAGPipelineService(db)
    
    # Standard endpoint ALWAYS saves the log
    return await pipeline.query(payload, current.id)

@router.post("/ask/stream")
async def ask_stream(
    payload: AskRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Streaming RAG response using Server-Sent Events."""
    await _verify_collection(payload.collection_id, current.id, db)
    pipeline = RAGPipelineService(db)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # save_log=False prevents database bloat on partial streaming runs
            async for token in pipeline.stream_query(payload, current.id, save_log=False):
                data = json.dumps({"token": token, "done": False})
                yield f"data: {data}\n\n"
            yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.get("/logs", response_model=list[QueryLogOut])
async def get_query_logs(
    collection_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Fetch paginated query history for the current user."""
    query = select(QueryLog).where(QueryLog.user_id == current.id)
    if collection_id:
        query = query.where(QueryLog.collection_id == collection_id)
    
    query = query.order_by(QueryLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.delete("/logs/purge")
async def purge_all_query_logs(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Permanently deletes all query history from the database."""
    try:
        # Execute the SQL DELETE command on the QueryLog table
        await db.execute(delete(QueryLog))
        await db.commit()
        return {"message": "All query logs purged successfully."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to purge logs: {str(e)}")

@router.get("/logs/{log_id}", response_model=QueryLogDetailOut)
async def get_query_log_detail(
    log_id: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Fetch full details of a specific query, including retrieved/reranked chunks."""
    result = await db.execute(
        select(QueryLog).where(QueryLog.id == log_id, QueryLog.user_id == current.id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(404, "Log not found")
    return log
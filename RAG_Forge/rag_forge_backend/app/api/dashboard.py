"""
RAG Forge – Dashboard Router
GET /dashboard/stats → KPIs, charts data
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.models import Collection, Document, QueryLog, User
from app.schemas.schemas import DashboardStats, QueryLogOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Get user's collection IDs
    col_result = await db.execute(
        select(Collection.id).where(Collection.owner_id == current.id)
    )
    collection_ids = [r[0] for r in col_result.all()]

    if not collection_ids:
        return DashboardStats(
            total_documents=0, total_chunks=0, total_embeddings=0,
            total_queries=0, avg_retrieval_time_ms=0.0,
            avg_confidence_score=0.0, collections_count=0,
            recent_queries=[], docs_by_type={},
        )

    # Documents
    doc_result = await db.execute(
        select(
            func.count(Document.id),
            func.coalesce(func.sum(Document.chunk_count), 0),
            func.coalesce(func.sum(Document.embedding_count), 0),
        ).where(Document.collection_id.in_(collection_ids))
    )
    total_docs, total_chunks, total_embeddings = doc_result.one()

    # Docs by file type
    type_result = await db.execute(
        select(Document.file_type, func.count(Document.id))
        .where(Document.collection_id.in_(collection_ids))
        .group_by(Document.file_type)
    )
    docs_by_type = {row[0]: row[1] for row in type_result.all()}

    # Queries
    query_result = await db.execute(
        select(
            func.count(QueryLog.id),
            func.coalesce(func.avg(QueryLog.retrieval_time_ms), 0.0),
            func.coalesce(func.avg(QueryLog.confidence_score), 0.0),
        ).where(QueryLog.user_id == current.id)
    )
    total_queries, avg_retrieval, avg_confidence = query_result.one()

    # Recent queries
    recent_result = await db.execute(
        select(QueryLog)
        .where(QueryLog.user_id == current.id)
        .order_by(QueryLog.created_at.desc())
        .limit(10)
    )
    recent = recent_result.scalars().all()

    return DashboardStats(
        total_documents=total_docs or 0,
        total_chunks=total_chunks or 0,
        total_embeddings=total_embeddings or 0,
        total_queries=total_queries or 0,
        avg_retrieval_time_ms=round(float(avg_retrieval or 0), 2),
        avg_confidence_score=round(float(avg_confidence or 0), 1),
        collections_count=len(collection_ids),
        recent_queries=[QueryLogOut.model_validate(q) for q in recent],
        docs_by_type=docs_by_type,
    )


@router.get("/activity")
async def get_activity(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Query activity over last N days for charts."""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import cast, Date

    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(QueryLog.created_at).label("date"),
            func.count(QueryLog.id).label("count"),
        )
        .where(QueryLog.user_id == current.id, QueryLog.created_at >= since)
        .group_by(func.date(QueryLog.created_at))
        .order_by(func.date(QueryLog.created_at))
    )
    return [{"date": str(r.date), "count": r.count} for r in result.all()]
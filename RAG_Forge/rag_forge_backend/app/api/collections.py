"""
RAG Forge – Collections Router
CRUD for document collections.
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Collection, User
from app.schemas.schemas import CollectionCreate, CollectionOut, CollectionUpdate
from app.services.vector_store import VectorStoreService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/collections", tags=["Collections"])


def _collection_out(col: Collection) -> CollectionOut:
    """Helper method to map a DB collection model to a structured schema output."""
    return CollectionOut(
        id=col.id,
        name=col.name,
        description=col.description,
        owner_id=col.owner_id,
        embedding_model=col.embedding_model,
        chunk_size=col.chunk_size,
        chunk_overlap=col.chunk_overlap,
        total_chunks=sum(d.chunk_count for d in col.documents) if col.documents else 0,
        total_embeddings=sum(d.embedding_count for d in col.documents) if col.documents else 0,
        document_count=len(col.documents) if col.documents else 0,
        created_at=col.created_at,
        updated_at=col.updated_at,
    )


@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Safety Validation Guard
    if payload.chunk_overlap >= payload.chunk_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Chunk overlap must be strictly less than the total chunk size."
        )

    col = Collection(
        name=payload.name,
        description=payload.description,
        owner_id=current.id,
        embedding_model=payload.embedding_model,
        chunk_size=payload.chunk_size,
        chunk_overlap=payload.chunk_overlap,
    )
    db.add(col)
    await db.commit()
    
    # Eagerly load relationship parameters immediately post-commit 
    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.documents))
        .where(Collection.id == col.id)
    )
    return _collection_out(result.scalar_one())


@router.get("", response_model=list[CollectionOut])
async def list_collections(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.documents))
        .where(Collection.owner_id == current.id)
        .order_by(Collection.created_at.desc())
    )
    return [_collection_out(c) for c in result.scalars().all()]


@router.get("/{collection_id}", response_model=CollectionOut)
async def get_collection(
    collection_id: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.documents))
        .where(Collection.id == collection_id, Collection.owner_id == current.id)
    )
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    return _collection_out(col)


@router.patch("/{collection_id}", response_model=CollectionOut)
async def update_collection(
    collection_id: str,
    payload: CollectionUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Collection)
        .options(selectinload(Collection.documents))
        .where(Collection.id == collection_id, Collection.owner_id == current.id)
    )
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    # Update valid model fields dynamically
    update_data = payload.model_dump(exclude_none=True)
    
    # Cross-field business logic validation checks during updates
    new_size = update_data.get("chunk_size", col.chunk_size)
    new_overlap = update_data.get("chunk_overlap", col.chunk_overlap)
    if new_overlap >= new_size:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Updated chunk overlap must be less than the chunk size."
        )

    for field, val in update_data.items():
        setattr(col, field, val)
        
    await db.commit()

    # Re-fetch the clean record state along with its documents relationship
    result2 = await db.execute(
        select(Collection)
        .options(selectinload(Collection.documents))
        .where(Collection.id == col.id)
    )
    return _collection_out(result2.scalar_one())


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.owner_id == current.id)
    )
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    # Defensive Vector Store drop layer
    try:
        vs = VectorStoreService()
        chroma_name = f"{settings.chroma_collection_prefix}_{collection_id}"
        vs.delete_collection(chroma_name)
    except Exception as e:
        # If the index is missing, log the event and bypass to prevent orphaned records in the SQL database
        logger.warning(f"Vector store collection cleanup skipped or failed for {collection_id}: {e}")

    # ─── THE FIX: Delete associated query logs to satisfy Foreign Key constraints ───
    await db.execute(
        text("DELETE FROM query_logs WHERE collection_id = :col_id"),
        {"col_id": collection_id}
    )
    # ────────────────────────────────────────────────────────────────────────────────

    await db.delete(col)
    await db.commit()
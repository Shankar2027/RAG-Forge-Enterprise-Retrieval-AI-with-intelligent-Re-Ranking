"""
RAG Forge – Documents Router
Upload files, trigger ingestion, view status & chunks.
"""
from __future__ import annotations

import asyncio
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Chunk, Collection, Document, User
from app.schemas.schemas import DocumentOut
from app.services.ingestion import IngestionService

router = APIRouter(prefix="/documents", tags=["Documents"])


def _ext(filename: str) -> str:
    return Path(filename).suffix.lower().lstrip(".")


async def _run_ingestion(document_id: str) -> None:
    """Background task wrapper for ingestion."""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        service = IngestionService(db)
        # Load document with collection relationship
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Document)
            .options(selectinload(Document.collection))
            .where(Document.id == document_id)
        )
        doc = result.scalar_one_or_none()
        if doc:
            await service.process_document(document_id)


@router.post("/upload", response_model=list[DocumentOut], status_code=201)
async def upload_documents(
    collection_id: str,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Verify collection belongs to user
    result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.owner_id == current.id)
    )
    col = result.scalar_one_or_none()
    if not col:
        raise HTTPException(404, "Collection not found")

    documents = []
    for file in files:
        ext = _ext(file.filename or "")
        if ext not in [e.lstrip(".") for e in settings.allowed_ext_list]:
            raise HTTPException(400, f"File type .{ext} not allowed")

        # Read content
        content = await file.read()
        size = len(content)
        if size > settings.max_file_size_mb * 1024 * 1024:
            raise HTTPException(400, f"File {file.filename} exceeds {settings.max_file_size_mb}MB limit")

        # Save to disk
        file_id = str(uuid.uuid4())
        safe_name = f"{file_id}.{ext}"
        file_path = settings.upload_path / safe_name
        file_path.write_bytes(content)

        doc = Document(
            collection_id=collection_id,
            filename=safe_name,
            original_name=file.filename or safe_name,
            file_type=ext,
            file_size=size,
            file_path=str(file_path),
            status="uploaded",
        )
        db.add(doc)
        documents.append(doc)

    await db.commit()
    for doc in documents:
        await db.refresh(doc)

    # Kick off background ingestion for each document
    for doc in documents:
        background_tasks.add_task(_run_ingestion, doc.id)

    return documents


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    collection_id: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Verify collection ownership
    col_result = await db.execute(
        select(Collection).where(Collection.id == collection_id, Collection.owner_id == current.id)
    )
    if not col_result.scalar_one_or_none():
        raise HTTPException(404, "Collection not found")

    result = await db.execute(
        select(Document)
        .where(Document.collection_id == collection_id)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .options(selectinload(Document.collection))
        .where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc or doc.collection.owner_id != current.id:
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/{document_id}/chunks")
async def get_chunks(
    document_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).options(selectinload(Document.collection)).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc or doc.collection.owner_id != current.id:
        raise HTTPException(404, "Document not found")

    chunks_result = await db.execute(
        select(Chunk)
        .where(Chunk.document_id == document_id)
        .order_by(Chunk.chunk_index)
        .offset(skip)
        .limit(limit)
    )
    chunks = chunks_result.scalars().all()
    return {
        "document_id": document_id,
        "document_name": doc.original_name,
        "total_chunks": doc.chunk_count,
        "chunks": [
            {
                "id": c.id,
                "chunk_index": c.chunk_index,
                "text": c.text,
                "char_count": c.char_count,
                "token_count": c.token_count,
            }
            for c in chunks
        ],
    }


@router.post("/{document_id}/reindex", response_model=DocumentOut)
async def reindex_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Re-run ingestion for a document (e.g., after settings change)."""
    result = await db.execute(
        select(Document).options(selectinload(Document.collection)).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc or doc.collection.owner_id != current.id:
        raise HTTPException(404, "Document not found")

    # Delete existing chunks & vectors
    from sqlalchemy import delete as sql_delete
    await db.execute(sql_delete(Chunk).where(Chunk.document_id == document_id))
    svc = IngestionService(db)
    await svc.delete_document_vectors(document_id, doc.collection_id)
    doc.status = "uploaded"
    doc.chunk_count = 0
    doc.embedding_count = 0
    doc.error_message = None
    await db.commit()
    await db.refresh(doc)
    background_tasks.add_task(_run_ingestion, document_id)
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).options(selectinload(Document.collection)).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if not doc or doc.collection.owner_id != current.id:
        raise HTTPException(404, "Document not found")

    svc = IngestionService(db)
    await svc.delete_document_vectors(document_id, doc.collection_id)
    await db.delete(doc)
    await db.commit()
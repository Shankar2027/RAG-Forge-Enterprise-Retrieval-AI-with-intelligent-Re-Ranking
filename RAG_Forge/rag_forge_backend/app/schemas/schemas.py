"""
RAG Forge – Pydantic Schemas
"""
from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

# ── Auth ─────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(min_length=8)

class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @field_validator('confirm_password')
    def passwords_must_match(cls, v: str, info: Any) -> str:
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v

class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    model_config = {"from_attributes": True}

# ── Collection ───────────────────────────────────────────────────
class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = Field(default=512, ge=128, le=2048)
    # Increased overlap to 150 to bridge logical gaps between chunks
    chunk_overlap: int = Field(default=150, ge=0, le=512)

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    chunk_size: Optional[int] = Field(default=None, ge=128, le=2048)
    chunk_overlap: Optional[int] = Field(default=None, ge=0, le=512)

class CollectionOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    owner_id: str
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    total_chunks: int
    total_embeddings: int
    document_count: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}

# ── Document ─────────────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: str
    collection_id: str
    filename: str
    original_name: str
    file_type: str
    file_size: int
    status: str
    error_message: Optional[str]
    page_count: Optional[int]
    chunk_count: int
    embedding_count: int
    created_at: datetime
    indexed_at: Optional[datetime]
    model_config = {"from_attributes": True}

# ── RAG / Chat ────────────────────────────────────────────────────
class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    collection_id: str
    top_k: int = Field(default=15, ge=1, le=50)
    rerank_top_n: int = Field(default=5, ge=1, le=20)
    use_reranker: bool = True
    use_hybrid: bool = False
    stream: bool = False

class ChunkResult(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    chunk_index: int
    text: str
    similarity_score: float
    rerank_score: Optional[float] = None
    page_number: Optional[int] = None

class Citation(BaseModel):
    document_name: str
    chunk_id: str
    chunk_index: int
    page_number: Optional[int] = None

class AskResponse(BaseModel):
    question: str
    answer: str
    citations: list[Citation]
    retrieved_chunks: list[ChunkResult]
    reranked_chunks: list[ChunkResult]
    confidence_score: float
    retrieval_time_ms: float
    rerank_time_ms: float
    llm_time_ms: float
    total_time_ms: float
    query_log_id: str

# ── Query Logs ────────────────────────────────────────────────────
class QueryLogOut(BaseModel):
    id: str
    question: str
    answer: Optional[str]
    citations: Optional[list]
    confidence_score: Optional[float]
    retrieval_time_ms: Optional[float]
    rerank_time_ms: Optional[float]
    total_time_ms: Optional[float]
    used_reranker: bool
    used_hybrid: bool
    top_k: int
    rerank_top_n: int
    created_at: datetime
    model_config = {"from_attributes": True}

class QueryLogDetailOut(QueryLogOut):
    retrieved_chunks: list[ChunkResult]
    reranked_chunks: list[ChunkResult]
    final_context: Optional[str]

# ── Dashboard KPIs ────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_embeddings: int
    total_queries: int
    avg_retrieval_time_ms: float
    avg_confidence_score: float
    collections_count: int
    recent_queries: list[QueryLogOut]
    docs_by_type: dict[str, int]

# ── Settings ─────────────────────────────────────────────────────
class PipelineSettings(BaseModel):
    embedding_model: str = "all-MiniLM-L6-v2"
    chunk_size: int = Field(default=512, ge=128, le=2048)
    chunk_overlap: int = Field(default=150, ge=0, le=512)
    top_k: int = Field(default=15, ge=1, le=50)
    rerank_top_n: int = Field(default=5, ge=1, le=20)
    llm_provider: str = "ollama"
    llm_model: str = "llama3.2"
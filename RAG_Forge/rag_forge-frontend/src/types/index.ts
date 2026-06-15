// ── Auth ──────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  full_name: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// ── Collections ───────────────────────────────────────────────────
export interface Collection {
  id: string
  name: string
  description: string | null
  owner_id: string
  embedding_model: string
  chunk_size: number
  chunk_overlap: number
  total_chunks: number
  total_embeddings: number
  document_count: number
  created_at: string
  updated_at: string
}

export interface CollectionCreate {
  name: string
  description?: string
  embedding_model?: string
  chunk_size?: number
  chunk_overlap?: number
}

// ── Documents ─────────────────────────────────────────────────────
export type DocumentStatus = 'uploaded' | 'parsing' | 'chunking' | 'embedding' | 'ready' | 'error'

export interface Document {
  id: string
  collection_id: string
  filename: string
  original_name: string
  file_type: string
  file_size: number
  status: DocumentStatus
  error_message: string | null
  page_count: number | null
  chunk_count: number
  embedding_count: number
  created_at: string
  indexed_at: string | null
}

export interface Chunk {
  id: string
  chunk_index: number
  text: string
  char_count: number
  token_count: number | null
}

// ── RAG ───────────────────────────────────────────────────────────
export interface ChunkResult {
  chunk_id: string
  document_id: string
  document_name: string
  chunk_index: number
  text: string
  similarity_score: number
  rerank_score: number | null
  page_number: number | null
}

export interface Citation {
  document_name: string
  chunk_id: string
  chunk_index: number
  page_number: number | null
}

export interface AskRequest {
  question: string
  collection_id: string
  top_k?: number
  rerank_top_n?: number
  use_reranker?: boolean
  use_hybrid?: boolean
  stream?: boolean
}

export interface AskResponse {
  question: string
  answer: string
  citations: Citation[]
  retrieved_chunks: ChunkResult[]
  reranked_chunks: ChunkResult[]
  confidence_score: number
  retrieval_time_ms: number
  rerank_time_ms: number
  llm_time_ms: number
  total_time_ms: number
  query_log_id: string
}

// ── Query Logs ────────────────────────────────────────────────────
export interface QueryLog {
  id: string
  question: string
  answer: string | null
  citations: Citation[] | null
  confidence_score: number | null
  retrieval_time_ms: number | null
  rerank_time_ms: number | null
  total_time_ms: number | null
  used_reranker: boolean
  used_hybrid: boolean
  top_k: number
  rerank_top_n: number
  created_at: string
}

// ── Dashboard ─────────────────────────────────────────────────────
export interface DashboardStats {
  total_documents: number
  total_chunks: number
  total_embeddings: number
  total_queries: number
  avg_retrieval_time_ms: number
  avg_confidence_score: number
  collections_count: number
  recent_queries: QueryLog[]
  docs_by_type: Record<string, number>
}

export interface ActivityPoint {
  date: string
  count: number
}

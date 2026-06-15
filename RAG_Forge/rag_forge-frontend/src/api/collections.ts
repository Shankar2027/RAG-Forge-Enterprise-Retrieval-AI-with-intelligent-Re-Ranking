import apiClient from './client'

// ── TYPE DEFINITIONS (Ensure these match your @/types file) ───────
export interface CollectionCreate {
  name: string;
  description?: string | null;
  embedding_model?: string; // Defaults to "all-MiniLM-L6-v2" on backend
  chunk_size?: number;      // Defaults to 512
  chunk_overlap?: number;   // Defaults to 50
}

export interface CollectionUpdate {
  name?: string | null;
  description?: string | null;
  chunk_size?: number | null;
  chunk_overlap?: number | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  total_chunks: number;
  total_embeddings: number;
  document_count: number;
  created_at: string; // ISO DateTime string
  updated_at: string; // ISO DateTime string
}

// ── API CONNECTOR METHODS ─────────────────────────────────────────
export const collectionsApi = {
  /**
   * Retrieves all document collections owned by the authenticated user.
   * Maps to: GET /api/collections
   */
  list: async (): Promise<Collection[]> => {
    const { data } = await apiClient.get<Collection[]>('/collections')
    return data
  },

  /**
   * Retrieves detailed configuration and metadata for a specific collection.
   * Maps to: GET /api/collections/{collection_id}
   */
  get: async (id: string): Promise<Collection> => {
    const { data } = await apiClient.get<Collection>(`/collections/${id}`)
    return data
  },

  /**
   * Provisions a brand new collection layer and locks in its hardware model configuration.
   * Maps to: POST /api/collections
   */
  create: async (payload: CollectionCreate): Promise<Collection> => {
    const { data } = await apiClient.post<Collection>('/collections', payload)
    return data
  },

  /**
   * Updates non-destructive parameters (like name or metadata details) of an existing collection.
   * Maps to: PATCH /api/collections/{collection_id}
   */
  update: async (id: string, payload: CollectionUpdate): Promise<Collection> => {
    const { data } = await apiClient.patch<Collection>(`/collections/${id}`, payload)
    return data
  },

  /**
   * Drops the collection, its underlying parsed file records, and its vector database index entirely.
   * Maps to: DELETE /api/collections/{collection_id}
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/collections/${id}`)
  },
}
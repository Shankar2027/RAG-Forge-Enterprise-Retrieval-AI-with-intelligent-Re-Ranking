import apiClient from './client'
import type { Document, Chunk } from '@/types'

export const documentsApi = {
  list: async (collection_id: string): Promise<Document[]> => {
    const { data } = await apiClient.get<Document[]>('/documents', {
      params: { collection_id },
    })
    return data
  },

  get: async (id: string): Promise<Document> => {
    const { data } = await apiClient.get<Document>(`/documents/${id}`)
    return data
  },

  upload: async (collection_id: string, files: File[], onProgress?: (pct: number) => void): Promise<Document[]> => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    const { data } = await apiClient.post<Document[]>(`/documents/upload?collection_id=${collection_id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
    return data
  },

  getChunks: async (id: string, skip = 0, limit = 50) => {
    const { data } = await apiClient.get(`/documents/${id}/chunks`, { params: { skip, limit } })
    return data as { document_id: string; document_name: string; total_chunks: number; chunks: Chunk[] }
  },

  reindex: async (id: string): Promise<Document> => {
    const { data } = await apiClient.post<Document>(`/documents/${id}/reindex`)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`)
  },
}

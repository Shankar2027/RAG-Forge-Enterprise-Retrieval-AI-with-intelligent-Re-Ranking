import apiClient from './client'
import type { AskRequest, AskResponse, QueryLog } from '@/types'

const BASE = import.meta.env.VITE_API_URL || '/api'

export const ragApi = {
  ask: async (payload: AskRequest): Promise<AskResponse> => {
    const { data } = await apiClient.post<AskResponse>('/rag/ask', payload)
    return data
  },

  streamAsk: (_payload: AskRequest): EventSource => {
    // For SSE we need to POST — use fetch with ReadableStream
    throw new Error('Use ragApi.streamAskFetch instead')
  },

  streamAskFetch: async function* (payload: AskRequest, token: string): AsyncGenerator<string> {
    // Failsafe check
    if (!token) {
      console.error("No token provided to streamAskFetch!");
      throw new Error("Authentication token missing.");
    }

    const response = await fetch(`${BASE}/rag/ask/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Session expired. Please log out and log back in.')
      }
      throw new Error(`HTTP ${response.status}`)
    }
    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // Keep the last partial line in the buffer
      buffer = lines.pop() ?? ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.token) yield parsed.token
            if (parsed.done) return
          } catch {
            // skip malformed chunks
          }
        }
      }
    }
  },

  getLogs: async (collection_id?: string, skip = 0, limit = 50): Promise<QueryLog[]> => {
    const { data } = await apiClient.get<QueryLog[]>('/rag/logs', {
      params: { collection_id, skip, limit },
    })
    return data
  },

  getLogDetail: async (id: string) => {
    const { data } = await apiClient.get(`/rag/logs/${id}`)
    return data
  },

  // THE NEW ADDITION: Hooking up the purge function to the backend DELETE route
  purgeLogs: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.delete<{ message: string }>('/rag/logs/purge')
    return data
  },
}
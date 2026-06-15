import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles, Send, Loader2, ChevronDown, ChevronRight,
  FileText, Zap, Database, Clock, Target, SlidersHorizontal, User
} from 'lucide-react'
import { collectionsApi } from '@/api/collections'
import { ragApi } from '@/api/rag'
import { useAuthStore } from '@/stores/authStore'
import { formatMs } from '@/components/ui'
import type { AskResponse, ChunkResult } from '@/types'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

// BULLETPROOF ID GENERATOR: Works on all HTTP/Mobile network connections
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AskResponse
  streaming?: boolean
  timestamp: Date
}

export default function AskPage() {
  const [searchParams] = useSearchParams()
  const defaultCollection = searchParams.get('collection') || ''

  const { accessToken } = useAuthStore()
  const [collectionId, setCollectionId] = useState(defaultCollection)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    top_k: 15,
    rerank_top_n: 5,
    use_reranker: true,
    use_hybrid: false,
    stream: true,
  })
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
  })

  useEffect(() => {
    if (!collectionId && collections.length > 0) {
      setCollectionId(collections[0].id)
    }
  }, [collections, collectionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!question.trim() || !collectionId || loading) return

    const userMsg: Message = { id: generateId(), role: 'user', content: question, timestamp: new Date() }
    const assistantId = generateId()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', streaming: settings.stream, timestamp: new Date() }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setQuestion('')
    setLoading(true)

    const payload = { question: userMsg.content, collection_id: collectionId, ...settings }

    try {
      if (settings.stream && accessToken) {
        let fullText = ''
        for await (const token of ragApi.streamAskFetch(payload, accessToken)) {
          fullText += token
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m))
        }
        // Note: For future optimization, returning the full response object directly 
        // from the stream closure would eliminate this second fetch.
        const fullResponse = await ragApi.ask({ ...payload, stream: false })
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullResponse.answer, response: fullResponse, streaming: false } : m))
      } else {
        const response = await ragApi.ask(payload)
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: response.answer, response, streaming: false } : m))
      }
    } catch (err: any) {
      const errMsg = err?.message || 'An error occurred'
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${errMsg}`, streaming: false } : m))
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const toggleSources = (id: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-bg-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <Database className="w-5 h-5 text-brand-indigo" />
          <select
            className="bg-bg-card border border-bg-border rounded-lg text-text-primary text-sm font-semibold focus:outline-none focus:border-brand-indigo py-2 px-3 cursor-pointer w-full md:w-auto shadow-sm"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
          >
            {collections.length === 0 && <option value="">No collections</option>}
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
            showSettings ? 'bg-brand-indigo text-white shadow-glow-indigo' : 'bg-bg-card border border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" /> Config
        </button>
      </div>

      {showSettings && (
        <div className="px-4 md:px-6 py-5 bg-bg-secondary border-b border-bg-border shadow-inner animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl">
            <SettingSlider label="Top-K" value={settings.top_k} min={1} max={50} onChange={(v: number) => setSettings((s) => ({ ...s, top_k: v }))} />
            <SettingSlider label="Rerank Top-N" value={settings.rerank_top_n} min={1} max={20} onChange={(v: number) => setSettings((s) => ({ ...s, rerank_top_n: v }))} />
            <SettingToggle label="Neural Re-ranker" value={settings.use_reranker} onChange={(v: boolean) => setSettings((s) => ({ ...s, use_reranker: v }))} />
            <SettingToggle label="Hybrid Search" value={settings.use_hybrid} onChange={(v: boolean) => setSettings((s) => ({ ...s, use_hybrid: v }))} />
            <SettingToggle label="Token Streaming" value={settings.stream} onChange={(v: boolean) => setSettings((s) => ({ ...s, stream: v }))} />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 md:py-16 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center mb-6 shadow-glow-indigo">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-3 tracking-tight">Ask your Knowledge Base</h2>
            <p className="text-text-secondary text-sm max-w-md leading-relaxed">
              Query your documents. RAG Forge will retrieve, re-rank, and synthesize an accurate response with exact citations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 max-w-2xl w-full">
              {['What are the main topics covered?', 'Summarize the key findings', 'What are the technical requirements?', 'Identify potential risks mentioned'].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-left p-4 rounded-xl bg-bg-card border border-bg-border hover:border-brand-indigo hover:shadow-glow-indigo transition-all duration-300 text-sm font-medium text-text-secondary hover:text-brand-indigo-light"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          let displayChunks: ChunkResult[] = [];
          // THE FIX: Trust the backend's accurate confidence score entirely
          let confPct = msg.response?.confidence_score || 0;

          if (msg.response && !msg.streaming) {
            displayChunks = msg.response.reranked_chunks?.length > 0 
              ? msg.response.reranked_chunks 
              : (msg.response.retrieved_chunks || []);
          }

          return (
            <div key={msg.id} className={clsx('flex gap-3 md:gap-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              )}

              <div className={clsx('max-w-[85%] md:max-w-3xl', msg.role === 'user' ? 'w-fit' : 'flex-1')}>
                {msg.role === 'user' ? (
                  <div className="bg-brand-indigo px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm font-medium text-white shadow-md">
                    {msg.content}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-bg-secondary border border-bg-border/60 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 md:px-6 md:py-5">
                      {msg.content ? (
                        <div className={clsx('prose prose-sm prose-invert max-w-none text-text-primary leading-relaxed', msg.streaming && 'cursor-blink')}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-brand-indigo-light text-sm font-semibold tracking-wide animate-pulse">
                          <Loader2 className="w-5 h-5 animate-spin" /> Analyzing knowledge base...
                        </div>
                      )}
                    </div>

                    {msg.response && !msg.streaming && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex flex-wrap gap-2">
                          <MetricChip icon={Target} label="CONF" value={`${confPct.toFixed(0)}%`} color={confPct >= 70 ? 'green' : confPct >= 40 ? 'amber' : 'red'} />
                          <MetricChip icon={Clock} label="RETRIEVE" value={formatMs(msg.response.retrieval_time_ms)} color="cyan" />
                          <MetricChip icon={Zap} label="RERANK" value={formatMs(msg.response.rerank_time_ms)} color="purple" />
                          <MetricChip icon={Sparkles} label="GENERATE" value={formatMs(msg.response.llm_time_ms)} color="indigo" />
                        </div>

                        {displayChunks.length > 0 && (
                          <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden shadow-sm">
                            <button
                              onClick={() => toggleSources(msg.id)}
                              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover transition-colors"
                            >
                              <div className="flex items-center gap-2 text-text-secondary">
                                <FileText className="w-4 h-4 text-brand-cyan" />
                                <span className="font-semibold">{displayChunks.length} Grounding Sources</span>
                              </div>
                              {expandedSources.has(msg.id) ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                            </button>

                            {expandedSources.has(msg.id) && (
                              <div className="border-t border-bg-border divide-y divide-bg-border/50">
                                {displayChunks.map((chunk, i) => (
                                  <ChunkCard key={chunk.chunk_id || i} chunk={chunk} rank={i + 1} />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-bg-card border border-bg-border flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-text-muted" />
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} className="h-4" />
      </div>

      <div className="p-4 md:p-6 border-t border-bg-border bg-bg-secondary/80 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto relative">
          <div className="flex-1 relative bg-bg-primary border border-bg-border focus-within:border-brand-indigo rounded-xl shadow-inner transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full bg-transparent text-text-primary text-sm resize-none py-3.5 pl-4 pr-12 min-h-[52px] max-h-32 overflow-y-auto focus:outline-none rounded-xl"
              placeholder={collectionId ? 'Ask anything about your documents...' : 'Select a collection first...'}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
              }}
              onKeyDown={handleKeyDown}
              disabled={!collectionId || loading}
            />
          </div>
          <button
            type="submit"
            className="btn-primary h-[52px] w-[52px] flex items-center justify-center rounded-xl flex-shrink-0 shadow-glow-indigo transition-transform active:scale-95"
            disabled={!question.trim() || !collectionId || loading}
          >
            {loading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white ml-1" />}
          </button>
        </form>
        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold text-center mt-3 max-w-4xl mx-auto">
          AI generated content may be inaccurate. Verify important information.
        </p>
      </div>
    </div>
  )
}

function ChunkCard({ chunk, rank }: { chunk: ChunkResult; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  
  // Safe extraction of document name and index to prevent validation crashes
  const docName = chunk.document_name || "Unknown Document";
  const chunkID = chunk.chunk_id || chunk.chunk_index?.toString() || "N/A";

  // THE FIX: Calibrated Platt Scaling for MS-MARCO logits
  let pct = 0;
  if (chunk.rerank_score !== undefined && chunk.rerank_score !== null) {
    // Shift logit by +5 and scale by 0.5 to normalize negative MS-MARCO biases
    const adjustedLogit = (chunk.rerank_score + 5) * 0.5;
    const normalized = 1 / (1 + Math.exp(-adjustedLogit));
    pct = normalized * 100;
  } else {
    pct = Math.min(100, Math.max(0, (chunk.similarity_score || 0) * 100));
  }

  return (
    <div className="px-5 py-4 bg-bg-primary/30 hover:bg-bg-hover transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-cyan/10 text-brand-cyan text-xs font-bold flex items-center justify-center border border-brand-cyan/20">
            {rank}
          </span>
          <span className="text-text-primary text-sm font-semibold truncate max-w-[200px] md:max-w-xs">{docName}</span>
          <span className="text-text-muted text-[10px] font-mono bg-bg-secondary px-1.5 py-0.5 rounded border border-bg-border">ID: {chunkID}</span>
        </div>
        <span className="text-xs font-mono font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded-md border border-brand-green/20 flex-shrink-0">
          {pct.toFixed(1)}% Match
        </span>
      </div>
      <p className={clsx('text-text-secondary text-sm leading-relaxed font-mono bg-bg-secondary/50 p-3 rounded-lg border border-bg-border/50', !expanded && 'line-clamp-3')}>
        {chunk.text}
      </p>
      {chunk.text.length > 150 && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold uppercase tracking-wider text-brand-indigo hover:text-brand-indigo-light mt-2 transition-colors">
          {expanded ? 'Collapse Text' : 'Expand Text'}
        </button>
      )}
    </div>
  )
}

function MetricChip({ icon: Icon, label, value, color }: any) {
  const COLORS: Record<string, string> = {
    green: 'text-brand-green bg-brand-green/10 border-brand-green/20',
    amber: 'text-brand-amber bg-brand-amber/10 border-brand-amber/20',
    red: 'text-brand-red bg-brand-red/10 border-brand-red/20',
    cyan: 'text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20',
    purple: 'text-brand-purple bg-brand-purple/10 border-brand-purple/20',
    indigo: 'text-brand-indigo-light bg-brand-indigo/10 border-brand-indigo/20',
  }
  return (
    <span className={clsx('badge border font-mono gap-1.5 py-1 px-2.5 shadow-sm', COLORS[color])}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-current opacity-60 text-[10px] tracking-widest">{label}</span>
      <span className="font-bold text-xs">{value}</span>
    </span>
  )
}

function SettingSlider({ label, value, min, max, onChange }: any) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono font-bold text-brand-cyan bg-brand-cyan/10 px-1.5 py-0.5 rounded">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand-indigo" />
    </div>
  )
}

function SettingToggle({ label, value, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</span>
      <button onClick={() => onChange(!value)} className={clsx('w-10 h-6 rounded-full transition-colors relative shadow-inner', value ? 'bg-brand-indigo' : 'bg-bg-hover border border-bg-border')}>
        <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-md', value ? 'left-5' : 'left-1')} />
      </button>
    </div>
  )
}
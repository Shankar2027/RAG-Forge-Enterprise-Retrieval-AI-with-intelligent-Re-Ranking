import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, ChevronDown, ChevronRight, Clock, Target, Zap, Database } from 'lucide-react'
import { ragApi } from '@/api/rag'
import { collectionsApi } from '@/api/collections'
import { PageHeader, EmptyState, SkeletonRows, ConfidenceBar, formatMs } from '@/components/ui'
import { formatLocalTime } from '@/utils/date'
import clsx from 'clsx'
import type { Citation } from '@/types'

export default function HistoryPage() {
  const [collectionFilter, setCollectionFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
  })

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['query-logs', collectionFilter],
    queryFn: () => ragApi.getLogs(collectionFilter || undefined, 0, 100),
    refetchInterval: 30_000,
  })

  const { data: logDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['log-detail', expandedId],
    queryFn: () => ragApi.getLogDetail(expandedId!),
    enabled: !!expandedId,
  })

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Query History"
        subtitle={`${logs.length} queries logged`}
        action={
          <select
            className="input w-48 text-sm bg-bg-secondary"
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
          >
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        }
      />

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No queries yet"
          description="Ask questions about your documents and they'll appear here with full metadata."
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id
            return (
              <div key={log.id} className={clsx('card transition-all duration-300', isExpanded && 'border-brand-indigo/40 shadow-glow-indigo')}>
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors", isExpanded ? "bg-brand-indigo text-white" : "bg-brand-indigo-dim text-brand-indigo-light")}>
                      <Zap className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-text-primary font-semibold text-sm leading-snug">{log.question}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-text-muted text-xs flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {formatLocalTime(log.created_at)}
                        </span>
                        {log.total_time_ms && (
                          <span className="text-text-muted text-xs font-mono">{formatMs(log.total_time_ms)}</span>
                        )}
                        {log.used_reranker && (
                          <span className="badge bg-brand-cyan-dim text-brand-cyan border border-brand-cyan/20 text-xs">reranked</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0 pt-1">
                      {log.confidence_score != null && (
                        <div className="w-24 hidden md:block">
                          <ConfidenceBar score={log.confidence_score} />
                        </div>
                      )}
                      <div className={clsx("p-1.5 rounded-md transition-colors", isExpanded ? "bg-bg-hover" : "hover:bg-bg-hover")}>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-text-primary" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-5 pt-5 border-t border-bg-border space-y-5 animate-in fade-in slide-in-from-top-2">
                    {detailLoading ? (
                      <SkeletonRows rows={3} />
                    ) : logDetail ? (
                      <>
                        {/* Answer */}
                        <div>
                          <p className="text-xs text-text-muted font-bold mb-2 uppercase tracking-wider">Generated Answer</p>
                          <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 text-text-primary text-sm leading-relaxed shadow-inner">
                            {logDetail.answer || <span className="text-text-muted italic">No answer recorded</span>}
                          </div>
                        </div>

                        {/* Pipeline Timing */}
                        <div>
                          <p className="text-xs text-text-muted font-bold mb-2 uppercase tracking-wider">Pipeline Telemetry</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Retrieval', value: logDetail.retrieval_time_ms },
                              { label: 'Rerank', value: logDetail.rerank_time_ms },
                              { label: 'LLM Synthesis', value: logDetail.llm_time_ms },
                              { label: 'Total Latency', value: logDetail.total_time_ms },
                            ].map(({ label, value }) => (
                              <div key={label} className="bg-bg-secondary border border-bg-border rounded-xl px-4 py-3 text-center transition-colors hover:border-brand-indigo/30">
                                <div className="text-brand-indigo-light font-mono font-bold text-lg">
                                  {value ? formatMs(value) : '—'}
                                </div>
                                <div className="text-text-muted text-xs mt-1 font-medium">{label}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Citations */}
                        {logDetail.citations?.length > 0 && (
                          <div>
                            <p className="text-xs text-text-muted font-bold mb-2 uppercase tracking-wider">
                              Citations ({logDetail.citations.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {logDetail.citations.map((c: Citation, i: number) => (
                                <span key={i} className="badge bg-bg-secondary border border-bg-border text-text-secondary text-xs py-1.5 px-3">
                                  <Database className="w-3 h-3 text-brand-indigo-light mr-1.5" />
                                  {c.document_name} <span className="text-text-muted ml-1">· chunk_{c.chunk_index}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
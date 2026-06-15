import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { collectionsApi } from '@/api/collections'
import { documentsApi } from '@/api/documents'
import { ChevronRight, Database, FileText, Layers, Settings, Sparkles } from 'lucide-react'
import { SkeletonRows, StatusBadge, FileTypeIcon, formatBytes, formatNumber } from '@/components/ui'
import { formatLocalTime } from '@/utils/date'

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: collection, isLoading: colLoading } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsApi.get(id!),
    enabled: !!id,
  })

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id,
    // FIX: Safely extract the data array whether using React Query v4 or v5
    refetchInterval: (queryOrData: any) => {
      const docs = Array.isArray(queryOrData) ? queryOrData : (queryOrData?.state?.data || []);
      return docs.some((d: any) => ['parsing', 'chunking', 'embedding', 'uploaded'].includes(d.status)) ? 3000 : false;
    },
  })

  if (colLoading) {
    return <div className="p-8 max-w-7xl mx-auto"><SkeletonRows rows={6} /></div>
  }

  if (!collection) {
    return <div className="p-8 text-center text-text-muted">Collection not found</div>
  }

  const readyDocs = documents.filter((d) => d.status === 'ready').length
  const processingDocs = documents.filter((d) => ['parsing', 'chunking', 'embedding', 'uploaded'].includes(d.status)).length

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <Link to="/collections" className="hover:text-text-secondary transition-colors">Collections</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary font-medium">{collection.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-indigo-dim flex items-center justify-center shadow-glow-indigo">
            <Database className="w-7 h-7 text-brand-indigo-light" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{collection.name}</h1>
            {collection.description && (
              <p className="text-text-secondary text-sm mt-1">{collection.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link to={`/ask?collection=${id}`} className="btn-primary flex-1 md:flex-none justify-center flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Ask AI
          </Link>
          <Link to={`/collections/${id}/documents`} className="btn-secondary flex-1 md:flex-none justify-center flex items-center gap-2">
            <FileText className="w-4 h-4" /> Manage Docs
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Documents', value: collection.document_count, icon: FileText, color: 'text-brand-indigo-light' },
          { label: 'Total Chunks', value: formatNumber(collection.total_chunks), icon: Layers, color: 'text-brand-cyan' },
          { label: 'Embeddings', value: formatNumber(collection.total_embeddings), icon: Database, color: 'text-brand-purple' },
          { label: 'Ready / Total', value: `${readyDocs}/${documents.length}`, icon: FileText, color: 'text-brand-green' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center py-6">
            <div className={`text-3xl font-bold mb-2 ${color}`}>{value}</div>
            <div className="text-text-muted text-xs flex items-center justify-center gap-1.5 uppercase tracking-wide font-medium">
              <Icon className="w-3.5 h-3.5" /> {label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Documents list */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-text-primary text-lg">Indexed Documents</h2>
            {processingDocs > 0 && (
              <span className="badge bg-brand-amber/10 text-brand-amber border border-brand-amber/20">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-amber status-pulse" />
                {processingDocs} processing
              </span>
            )}
          </div>

          {docsLoading ? (
            <SkeletonRows rows={4} />
          ) : documents.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-text-muted text-sm mb-4">No documents in this collection</p>
              <Link to={`/collections/${id}/documents`} className="btn-secondary text-sm px-6">
                Upload Documents
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-bg-border">
              {documents.map((doc) => (
                <div key={doc.id} className="py-4 flex items-center gap-4">
                  <FileTypeIcon type={doc.file_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-semibold truncate">{doc.original_name}</p>
                    <p className="text-text-muted text-xs mt-1 font-mono">
                      {formatBytes(doc.file_size)}
                      {doc.chunk_count > 0 && ` · ${doc.chunk_count} chunks`}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings panel */}
        <div className="card h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-bg-border pb-4">
            <Settings className="w-5 h-5 text-brand-indigo-light" />
            <h2 className="font-semibold text-text-primary">Configuration</h2>
          </div>
          <div className="space-y-5">
            {[
              { label: 'Embedding Model', value: collection.embedding_model },
              { label: 'Chunk Size', value: `${collection.chunk_size} tokens` },
              { label: 'Chunk Overlap', value: `${collection.chunk_overlap} tokens` },
              { label: 'Created', value: formatLocalTime(collection.created_at, 'MMM d, yyyy') },
              { label: 'Updated', value: formatLocalTime(collection.updated_at, 'MMM d, yyyy') },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-text-muted text-sm">{label}</span>
                <span className="text-text-primary text-sm font-medium font-mono bg-bg-secondary px-2 py-1 rounded-md border border-bg-border">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-bg-border text-center">
            <p className="text-text-muted text-xs">
              Collection ID: <br/> <span className="font-mono text-text-secondary text-[10px]">{collection.id}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
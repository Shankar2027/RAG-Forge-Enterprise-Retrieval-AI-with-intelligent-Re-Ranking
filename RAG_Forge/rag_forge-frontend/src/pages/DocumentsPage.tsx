import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Trash2, RefreshCw, ChevronRight,
  Loader2, AlertCircle, Eye, FileUp, Database, Layers
} from 'lucide-react'
import { documentsApi } from '@/api/documents'
import { collectionsApi } from '@/api/collections'
import {
  PageHeader, StatusBadge, FileTypeIcon, Modal, SkeletonRows,
  formatBytes, formatNumber,
} from '@/components/ui'
import { formatLocalTime } from '@/utils/date'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import type { Chunk } from '@/types'

export default function DocumentsPage() {
  const { id: collectionId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewChunksId, setViewChunksId] = useState<string | null>(null)
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])

  const { data: collection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => collectionsApi.get(collectionId!),
    enabled: !!collectionId,
  })

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', collectionId],
    queryFn: () => documentsApi.list(collectionId!),
    enabled: !!collectionId,
    refetchInterval: (queryOrData: any) => {
      const docs = Array.isArray(queryOrData) ? queryOrData : (queryOrData?.state?.data || []);
      return docs.some((d: any) => ['parsing', 'chunking', 'embedding', 'uploaded'].includes(d.status)) ? 3000 : false;
    },
  })

  const { data: chunksData, isLoading: chunksLoading } = useQuery({
    queryKey: ['chunks', viewChunksId],
    queryFn: () => documentsApi.getChunks(viewChunksId!),
    enabled: !!viewChunksId,
  })

  const deleteMut = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', collectionId] })
      qc.invalidateQueries({ queryKey: ['collection', collectionId] })
      setDeleteId(null)
      toast.success('Document purged from vector store')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const reindexMut = useMutation({
    mutationFn: documentsApi.reindex,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', collectionId] })
      toast.success('Re-indexing pipeline initiated')
    },
    onError: () => toast.error('Failed to start re-indexing'),
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setDroppedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const newFiles = acceptedFiles.filter((f) => !existingNames.has(f.name))
      return [...prev, ...newFiles]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/html': ['.html'],
    },
    multiple: true,
  })

  const handleUpload = async () => {
    if (!droppedFiles.length || !collectionId) return
    setUploading(true)
    setUploadProgress(0)
    try {
      await documentsApi.upload(collectionId, droppedFiles, setUploadProgress)
      qc.invalidateQueries({ queryKey: ['documents', collectionId] })
      qc.invalidateQueries({ queryKey: ['collection', collectionId] })
      setDroppedFiles([])
      toast.success(`${droppedFiles.length} payload(s) uploaded — ingestion started`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const removeDropped = (name: string) =>
    setDroppedFiles((f) => f.filter((x) => x.name !== name))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full box-border">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6 font-medium flex-wrap">
        <Link to="/collections" className="hover:text-text-primary transition-colors">Collections</Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
        <Link to={`/collections/${collectionId}`} className="hover:text-text-primary transition-colors truncate max-w-[120px] sm:max-w-xs">
          {collection?.name || collectionId}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
        <span className="text-brand-indigo-light">Documents</span>
      </nav>

      <PageHeader
        title="Knowledge Documents"
        subtitle={`${documents.length} document${documents.length !== 1 ? 's' : ''} currently in this collection`}
      />

      {/* Upload zone */}
      <div className="card mb-8 shadow-sm w-full max-w-full overflow-hidden">
        <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileUp className="w-5 h-5 text-brand-indigo-light flex-shrink-0" /> Ingest New Documents
        </h2>

        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-6 md:p-10 text-center cursor-pointer transition-all duration-300 relative overflow-hidden w-full',
            isDragActive
              ? 'border-brand-indigo bg-brand-indigo/10 shadow-[inset_0_0_20px_rgba(79,70,229,0.15)]'
              : 'border-bg-border hover:border-brand-indigo/50 hover:bg-brand-indigo/5'
          )}
        >
          <input {...getInputProps()} />
          <div className={clsx("absolute inset-0 bg-brand-indigo/5 translate-y-full transition-transform duration-500", isDragActive && "translate-y-0")} />
          <Upload className={clsx('w-10 h-10 mx-auto mb-4 relative z-10 transition-colors', isDragActive ? 'text-brand-indigo-light' : 'text-text-muted')} />
          <p className="text-text-primary font-semibold text-sm sm:text-base relative z-10 px-2">
            {isDragActive ? 'Drop payloads to commence ingestion' : 'Drag & drop files here, or click to browse'}
          </p>
          <p className="text-text-muted text-[10px] sm:text-xs mt-2 font-mono relative z-10 px-2">
            Supported formats: PDF, DOCX, TXT, HTML · Max 100MB per file
          </p>
        </div>

        {/* Pending files staging area */}
        {droppedFiles.length > 0 && (
          <div className="mt-5 space-y-2 animate-in fade-in slide-in-from-top-2 w-full">
            {droppedFiles.map((f) => (
              <div key={f.name} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl border border-bg-border shadow-sm w-full overflow-hidden">
                <FileTypeIcon type={f.name.split('.').pop() || 'txt'} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-semibold truncate max-w-full">{f.name}</p>
                  <p className="text-text-muted text-xs font-mono mt-0.5">{formatBytes(f.size)}</p>
                </div>
                <button 
                  onClick={() => removeDropped(f.name)} 
                  className="p-2 flex-shrink-0 rounded-lg text-text-muted hover:text-brand-red hover:bg-brand-red/10 transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-bg-border/60 mt-4">
              <button
                className="btn-primary w-full sm:w-auto flex-1 flex items-center justify-center gap-2"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ingesting {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Vectorize {droppedFiles.length} file{droppedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
              {!uploading && (
                <button className="btn-secondary w-full sm:w-auto" onClick={() => setDroppedFiles([])}>
                  Clear Queue
                </button>
              )}
            </div>

            {uploading && (
              <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden mt-3 w-full">
                <div
                  className="h-full bg-brand-indigo rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Documents Data Table */}
      <div className="card shadow-sm w-full max-w-full overflow-hidden">
        <h2 className="font-semibold text-text-primary mb-5 flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-cyan flex-shrink-0" /> Indexed Corpus
        </h2>

        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : documents.length === 0 ? (
          <div className="py-12 px-4 text-center text-text-muted text-sm border-2 border-dashed border-bg-border rounded-xl">
            No documents ingested yet. Upload payloads above to populate the vector store.
          </div>
        ) : (
          <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-bg-border">
                  {['Document', 'Format', 'Size', 'Chunks', 'Status', 'Indexed On', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-text-secondary text-[10px] font-bold uppercase tracking-wider py-3 pr-4 last:pr-0 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border/50">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-bg-hover/40 transition-colors group">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <FileTypeIcon type={doc.file_type} />
                        <div className="min-w-0">
                          <p className="text-text-primary font-semibold truncate max-w-[150px] sm:max-w-[200px] lg:max-w-[250px]">{doc.original_name}</p>
                          {doc.error_message && (
                            <p className="text-brand-red text-[10px] uppercase font-bold flex items-center gap-1 mt-1 tracking-wider truncate max-w-[150px] sm:max-w-[200px]">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" /> FAILED: {doc.error_message.slice(0, 40)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="font-mono text-brand-indigo-light bg-brand-indigo-dim border border-brand-indigo/20 px-2 py-1 rounded text-[10px] uppercase font-bold">
                        {doc.file_type}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-text-secondary font-mono text-xs whitespace-nowrap">{formatBytes(doc.file_size)}</td>
                    <td className="py-3.5 pr-4">
                      <span className="text-text-primary text-xs font-mono font-semibold bg-bg-secondary px-2 py-1 rounded border border-bg-border whitespace-nowrap">
                        {doc.chunk_count > 0 ? formatNumber(doc.chunk_count) : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap"><StatusBadge status={doc.status} /></td>
                    <td className="py-3.5 pr-4 text-text-muted text-xs font-mono whitespace-nowrap">
                      {doc.indexed_at ? formatLocalTime(doc.indexed_at, 'MMM d, h:mm a') : '—'}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        {doc.status === 'ready' && (
                          <button
                            onClick={() => setViewChunksId(doc.id)}
                            className="p-2 rounded-lg text-text-muted hover:text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
                            title="Inspect Vector Chunks"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => reindexMut.mutate(doc.id)}
                          disabled={reindexMut.isPending}
                          className="p-2 rounded-lg text-text-muted hover:text-brand-indigo-light hover:bg-brand-indigo-dim transition-colors"
                          title="Force Re-index"
                        >
                          <RefreshCw className={clsx("w-4 h-4", reindexMut.isPending && "animate-spin")} />
                        </button>
                        <button
                          onClick={() => setDeleteId(doc.id)}
                          className="p-2 rounded-lg text-text-muted hover:text-brand-red hover:bg-brand-red/10 transition-colors"
                          title="Purge Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Purge Document">
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          This will permanently remove the document and all of its associated vector embeddings from the active knowledge base. <strong className="text-brand-red">This cannot be undone.</strong>
        </p>
        <div className="flex gap-3">
          <button
            className="btn-danger flex-1 flex items-center justify-center gap-2 font-semibold"
            onClick={() => deleteId && deleteMut.mutate(deleteId)}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleteMut.isPending ? 'Purging...' : 'Confirm Purge'}
          </button>
          <button className="btn-secondary font-semibold" onClick={() => setDeleteId(null)}>Cancel</button>
        </div>
      </Modal>

      {/* Vector Chunks Inspector Modal */}
      <Modal
        open={!!viewChunksId}
        onClose={() => setViewChunksId(null)}
        title={chunksData ? `Vector Chunks: ${chunksData.document_name}` : 'Vector Chunks Inspector'}
        maxWidth="max-w-3xl"
      >
        {chunksLoading ? (
          <SkeletonRows rows={4} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-bg-border/60">
              <p className="text-text-muted text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-cyan" />
                {chunksData?.total_chunks} Total Vector Embeddings
              </p>
              <p className="text-text-muted text-[10px] italic">Showing preview of stored text</p>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
              {chunksData?.chunks.map((chunk: Chunk) => (
                <div key={chunk.id} className="bg-bg-secondary border border-bg-border rounded-xl p-5 shadow-sm hover:border-brand-indigo/30 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-1 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded-md text-[10px] font-bold font-mono uppercase">
                      Chunk_{chunk.chunk_index}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest bg-bg-primary px-2 py-1 rounded">
                      {chunk.char_count} Chars
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed font-mono bg-bg-primary/50 p-4 rounded-lg border border-bg-border/50 break-words">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
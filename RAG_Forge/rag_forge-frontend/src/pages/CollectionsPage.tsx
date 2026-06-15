import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Database, Plus, Trash2, ChevronRight, Loader2, FileText, Layers, Clock } from 'lucide-react'
import { collectionsApi } from '@/api/collections'
import { PageHeader, EmptyState, Modal, SkeletonRows, formatNumber } from '@/components/ui'
import { formatLocalTime } from '@/utils/date'
import toast from 'react-hot-toast'
import type { CollectionCreate } from '@/types'

const DEFAULT_FORM: CollectionCreate = {
  name: '',
  description: '',
  embedding_model: 'all-MiniLM-L6-v2',
  chunk_size: 512,
  chunk_overlap: 50,
}

export default function CollectionsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<CollectionCreate>(DEFAULT_FORM)

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
  })

  const createMut = useMutation({
    mutationFn: collectionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      setShowCreate(false)
      setForm(DEFAULT_FORM)
      toast.success('Collection initialized successfully')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to initialize collection'),
  })

  const deleteMut = useMutation({
    mutationFn: collectionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] })
      setDeleteId(null)
      toast.success('Collection decommissioned')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to decommission'),
  })

  const set = (k: keyof CollectionCreate) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: k === 'chunk_size' || k === 'chunk_overlap' ? Number(e.target.value) : e.target.value }))

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full box-border">
      <PageHeader
        title="Knowledge Collections"
        subtitle="Organize your documents into searchable vector databases"
        action={
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 shadow-glow-indigo">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Collection</span><span className="sm:hidden">New</span>
          </button>
        }
      />

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : collections.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No collections found"
          description="Initialize your first vector collection to start uploading documents and querying your knowledge base."
          action={
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" /> Initialize Collection
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {collections.map((col) => (
            <div key={col.id} className="card-hover group relative overflow-hidden w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-indigo/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <Link to={`/collections/${col.id}`} className="block relative z-10 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-indigo-dim flex items-center justify-center shadow-glow-indigo transition-transform group-hover:scale-105 duration-300">
                    <Database className="w-6 h-6 text-brand-indigo-light" />
                  </div>
                  <div className="p-2 rounded-lg bg-bg-hover opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                    <ChevronRight className="w-4 h-4 text-brand-indigo-light" />
                  </div>
                </div>

                <h3 className="text-text-primary font-bold text-lg mb-1.5 truncate pr-8">{col.name}</h3>
                {col.description && (
                  <p className="text-text-secondary text-sm line-clamp-2 mb-5 h-10">{col.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-bg-border/60">
                  <div className="text-center bg-bg-secondary/50 rounded-lg py-2 border border-bg-border/30">
                    <div className="text-text-primary font-bold text-sm truncate">{col.document_count}</div>
                    <div className="text-text-muted text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 mt-1">
                      <FileText className="w-3 h-3" /> Docs
                    </div>
                  </div>
                  <div className="text-center bg-bg-secondary/50 rounded-lg py-2 border border-bg-border/30">
                    <div className="text-text-primary font-bold text-sm truncate">{formatNumber(col.total_chunks)}</div>
                    <div className="text-text-muted text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 mt-1">
                      <Layers className="w-3 h-3" /> Chunks
                    </div>
                  </div>
                  <div className="text-center bg-bg-secondary/50 rounded-lg py-2 border border-bg-border/30">
                    <div className="text-brand-cyan font-bold text-sm font-mono truncate">{col.chunk_size}</div>
                    <div className="text-text-muted text-[10px] uppercase tracking-wider mt-1">Token Sz</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-4 text-text-muted text-xs font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  Updated {formatLocalTime(col.updated_at, 'MMM d, yyyy')}
                </div>
              </Link>

              <button
                onClick={(e) => { e.preventDefault(); setDeleteId(col.id) }}
                className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-white hover:bg-brand-red opacity-0 group-hover:opacity-100 transition-all duration-200 z-20"
                title="Decommission Collection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Initialize New Collection" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="label">Collection Name *</label>
            <input className="input text-base" placeholder="e.g. HR Guidelines" value={form.name} onChange={set('name')} autoFocus />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input text-base resize-none" rows={3} value={form.description || ''} onChange={set('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Chunk Size</label>
              <input type="number" className="input text-base font-mono" value={form.chunk_size} onChange={set('chunk_size')} />
            </div>
            <div>
              <label className="label">Overlap</label>
              <input type="number" className="input text-base font-mono" value={form.chunk_overlap} onChange={set('chunk_overlap')} />
            </div>
          </div>

          <button
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
            onClick={() => createMut.mutate(form)}
            disabled={!form.name || createMut.isPending}
          >
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {createMut.isPending ? 'Initializing…' : 'Initialize Collection'}
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Decommission Collection">
        <p className="text-text-secondary text-sm mb-5">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button className="btn-danger flex-1" onClick={() => deleteId && deleteMut.mutate(deleteId)}>Decommission</button>
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
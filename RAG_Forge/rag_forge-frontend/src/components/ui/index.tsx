import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin text-brand-indigo', className || 'w-5 h-5')} />
}

// ── Page header ───────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">{title}</h1>
        {subtitle && <p className="text-text-secondary text-sm md:text-base mt-1.5 font-medium">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 w-full sm:w-auto">{action}</div>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center card border-dashed border-2">
      <div className="w-16 h-16 rounded-2xl bg-bg-secondary border border-bg-border flex items-center justify-center mb-5 shadow-sm">
        <Icon className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-text-primary font-bold text-xl mb-2">{title}</h3>
      <p className="text-text-secondary text-sm max-w-sm mb-6 leading-relaxed">{description}</p>
      {action}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  ready: 'bg-brand-green/10 text-brand-green border-brand-green/30',
  uploaded: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30',
  parsing: 'bg-brand-amber/10 text-brand-amber border-brand-amber/30',
  chunking: 'bg-brand-amber/10 text-brand-amber border-brand-amber/30',
  embedding: 'bg-brand-indigo/10 text-brand-indigo-light border-brand-indigo/30',
  error: 'bg-brand-red/10 text-brand-red border-brand-red/30',
}

const STATUS_DOTS: Record<string, string> = {
  ready: 'bg-brand-green',
  uploaded: 'bg-brand-cyan',
  parsing: 'bg-brand-amber status-pulse',
  chunking: 'bg-brand-amber status-pulse',
  embedding: 'bg-brand-indigo status-pulse',
  error: 'bg-brand-red',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('badge border font-bold tracking-wider uppercase text-[10px] px-2 py-1 shadow-sm', STATUS_STYLES[status] || 'bg-bg-hover text-text-secondary border-bg-border')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full mr-1.5', STATUS_DOTS[status] || 'bg-text-muted')} />
      {status}
    </span>
  )
}

// ── Confidence bar ────────────────────────────────────────────────
export function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score))
  const color = pct >= 70 ? 'bg-brand-green' : pct >= 40 ? 'bg-brand-amber' : 'bg-brand-red'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden border border-bg-border">
        <div className={clsx('h-full rounded-full score-bar transition-all duration-1000', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-text-secondary w-10 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────
export function MetricCard({ label, value, sub, icon: Icon, accent = 'indigo' }: any) {
  const ACCENT: Record<string, { bg: string; icon: string; glow: string }> = {
    indigo: { bg: 'bg-brand-indigo-dim', icon: 'text-brand-indigo-light', glow: 'shadow-glow-indigo' },
    cyan: { bg: 'bg-brand-cyan/10', icon: 'text-brand-cyan', glow: '' },
    green: { bg: 'bg-brand-green/10', icon: 'text-brand-green', glow: '' },
    amber: { bg: 'bg-brand-amber/10', icon: 'text-brand-amber', glow: '' },
    purple: { bg: 'bg-brand-purple/10', icon: 'text-brand-purple', glow: '' },
  }
  const a = ACCENT[accent]
  return (
    <div className="card flex items-center gap-4 hover:border-text-muted/20 transition-colors">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-transparent', a.bg, a.glow)}>
        <Icon className={clsx('w-5 h-5', a.icon)} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-text-primary leading-none tracking-tight">{value}</div>
        <div className="text-xs font-bold text-text-secondary mt-1.5 uppercase tracking-wide">{label}</div>
        {sub && <div className="text-[10px] font-mono text-text-muted mt-1">{sub}</div>}
      </div>
    </div>
  )
}

// ── Skeleton rows ─────────────────────────────────────────────────
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

// ── Modal (MOBILE SCROLL FIX) ─────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className={clsx('relative w-full bg-bg-primary border border-bg-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]', maxWidth)}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-bg-border bg-bg-secondary/50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5 rounded-lg bg-bg-hover hover:bg-bg-border transition-colors">
            <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto scrollbar-hide">{children}</div>
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────
export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium bg-bg-primary border border-bg-border shadow-xl rounded-lg text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50">
        {text}
      </div>
    </div>
  )
}

// ── File type icon ────────────────────────────────────────────────
const FILE_COLORS: Record<string, string> = {
  pdf: 'text-brand-red bg-brand-red/10 border border-brand-red/20',
  docx: 'text-brand-indigo-light bg-brand-indigo-dim border border-brand-indigo/20',
  txt: 'text-text-secondary bg-bg-secondary border border-bg-border',
  html: 'text-brand-amber bg-brand-amber/10 border border-brand-amber/20',
}

export function FileTypeIcon({ type }: { type: string }) {
  const style = FILE_COLORS[type] || 'text-text-muted bg-bg-hover border border-bg-border'
  return (
    <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold font-mono uppercase shadow-sm', style)}>
      {type.slice(0, 3)}
    </div>
  )
}

// ── Format helpers ────────────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}
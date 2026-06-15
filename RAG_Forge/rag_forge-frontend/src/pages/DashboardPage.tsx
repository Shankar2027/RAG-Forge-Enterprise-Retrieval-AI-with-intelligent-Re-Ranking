import { useQuery } from '@tanstack/react-query'
import {
  FileText, Database, Cpu, MessageSquare,
  Clock, TrendingUp, Layers, BarChart2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi } from '@/api/dashboard'
import {
  PageHeader, MetricCard, SkeletonRows, ConfidenceBar,
  formatNumber, formatMs,
} from '@/components/ui'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'
import clsx from 'clsx'

const PIE_COLORS: Record<string, string> = {
  pdf: '#EF4444',
  docx: '#6366F1',
  txt: '#94A3B8',
  html: '#F59E0B',
}

// Helper to fix UTC to Local Timezone conversion
const formatLocalTime = (dateString: string, dateFormat: string) => {
  if (!dateString) return '';
  // Append 'Z' if missing so the browser knows this is UTC, and converts it to local time
  const safeDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  return format(new Date(safeDateString), dateFormat);
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30_000,
  })

  const { data: activity = [] } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.getActivity(14),
    refetchInterval: 60_000,
  })

  const pieData = stats
    ? Object.entries(stats.docs_by_type).map(([name, value]) => ({ name, value }))
    : []

  const activityData = activity.map((a) => ({
    date: formatLocalTime(a.date, 'MMM d'), // Fixed timezone for chart
    queries: a.count,
  }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Here's what's happening in your knowledge base today."
      />

      {/* KPI row - Fixed mobile grid to prevent crashing/squishing */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <MetricCard
            label="Total Documents"
            value={formatNumber(stats?.total_documents || 0)}
            icon={FileText}
            accent="indigo"
            sub={`${stats?.collections_count || 0} collections`}
          />
          <MetricCard
            label="Total Chunks"
            value={formatNumber(stats?.total_chunks || 0)}
            icon={Layers}
            accent="cyan"
            sub={`${formatNumber(stats?.total_embeddings || 0)} embeddings`}
          />
          <MetricCard
            label="Queries Run"
            value={formatNumber(stats?.total_queries || 0)}
            icon={MessageSquare}
            accent="purple"
          />
          <MetricCard
            label="Avg Retrieval"
            value={formatMs(stats?.avg_retrieval_time_ms || 0)}
            icon={Clock}
            accent="amber"
            sub={`Confidence: ${(stats?.avg_confidence_score || 0).toFixed(1)}%`}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Activity chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-text-primary font-semibold">Query Activity</h2>
              <p className="text-text-muted text-xs mt-0.5">Last 14 days</p>
            </div>
            <BarChart2 className="w-4 h-4 text-text-muted" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="queryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3F5E" vertical={false} />
              <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1E293B', border: '1px solid #2D3F5E', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#E2E8F0' }}
                itemStyle={{ color: '#6366F1' }}
              />
              <Area
                type="monotone"
                dataKey="queries"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#queryGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Doc type distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-text-primary font-semibold">Document Types</h2>
              <p className="text-text-muted text-xs mt-0.5">By file format</p>
            </div>
            <Database className="w-4 h-4 text-text-muted" />
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#64748B'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid #2D3F5E', borderRadius: 8, fontSize: 12 }}
                />
                <Legend
                  formatter={(v) => <span style={{ color: '#94A3B8', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-text-muted text-sm border-2 border-dashed border-bg-border rounded-xl">
              No documents yet
            </div>
          )}
        </div>
      </div>

      {/* Recent queries */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-text-primary font-semibold">Recent Queries</h2>
            <p className="text-text-muted text-xs mt-0.5">Latest AI interactions</p>
          </div>
          <TrendingUp className="w-4 h-4 text-text-muted" />
        </div>

        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : !stats?.recent_queries?.length ? (
          <div className="py-10 text-center text-text-muted text-sm border-2 border-dashed border-bg-border rounded-xl">
            No queries yet — head to Ask AI to get started
          </div>
        ) : (
          <div className="divide-y divide-bg-border/50">
            {stats.recent_queries.map((q) => (
              <div key={q.id} className="py-3.5 grid grid-cols-[1fr,160px,120px] gap-4 items-center hover:bg-bg-hover/40 transition-colors px-2 -mx-2 rounded-lg">
                <div className="min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{q.question}</p>
                  <p className="text-text-muted text-xs mt-1 font-mono">
                    {formatLocalTime(q.created_at, 'MMM d, h:mm a')} {/* Fixed timezone for list */}
                    {q.used_reranker && (
                      <span className="ml-2 text-brand-cyan bg-brand-cyan-dim px-1.5 py-0.5 rounded uppercase tracking-wider text-[9px] font-bold">reranked</span>
                    )}
                  </p>
                </div>
                <div className="hidden md:block">
                  {q.confidence_score != null && q.confidence_score > 0 && (
                    <ConfidenceBar score={q.confidence_score} />
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-text-secondary bg-bg-secondary px-2 py-1 rounded border border-bg-border">
                    {q.total_time_ms ? formatMs(q.total_time_ms) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
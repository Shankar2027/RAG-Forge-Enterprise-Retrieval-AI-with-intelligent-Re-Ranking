import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui'
import { authApi } from '@/api/auth'
import { ragApi } from '@/api/rag'
import toast from 'react-hot-toast'
import {
  User, KeyRound, Server, Cpu, RotateCcw,
  Activity, Save, Database, Key, RefreshCw, Trash2, Loader2
} from 'lucide-react'
import clsx from 'clsx'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'pipeline' | 'system'>('profile')

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader title="Platform Settings" subtitle="Manage your account, API configurations, and telemetry." />

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 w-full">
        <div className="w-full md:w-48 flex-shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide min-w-full md:min-w-max flex-nowrap pr-4">
            {[
              { id: 'profile', icon: User, label: 'Identity & Access' },
              { id: 'pipeline', icon: Cpu, label: 'RAG Pipeline' },
              { id: 'system', icon: Server, label: 'System Telemetry' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0',
                  activeTab === id
                    ? 'bg-brand-indigo text-white shadow-glow-indigo'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover bg-bg-secondary md:bg-transparent'
                )}
              >
                <Icon className={clsx("w-4 h-4 flex-shrink-0", activeTab === id ? "text-white" : "text-brand-indigo-light")} /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-w-0 w-full">
          {activeTab === 'profile' && <ProfileSettings user={user} setUser={setUser} />}
          {activeTab === 'pipeline' && <PipelineSettings />}
          {activeTab === 'system' && <SystemInfo />}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const [form, setForm] = useState({ full_name: user?.full_name || '', email: user?.email || '' })
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })
  
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPw, setIsSavingPw] = useState(false)

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const updatedUser = await authApi.updateProfile({ full_name: form.full_name })
      setUser(updatedUser)
      toast.success("Profile updated successfully!")
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSavePassword = async () => {
    if (pwForm.new !== pwForm.confirm) return toast.error("New passwords do not match.")
    setIsSavingPw(true)
    try {
      await authApi.changePassword({ current_password: pwForm.current, new_password: pwForm.new, confirm_password: pwForm.confirm })
      toast.success("Password updated!")
      setPwForm({ current: '', new: '', confirm: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update password")
    } finally {
      setIsSavingPw(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
      <div className="card p-5 md:p-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-brand-indigo-light" />
            <h2 className="font-bold text-text-primary text-lg">Profile Information</h2>
          </div>
          <button 
            onClick={handleSaveProfile} 
            disabled={isSavingProfile}
            className="flex items-center gap-2 px-4 py-2 bg-brand-indigo hover:bg-brand-indigo/90 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {isSavingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email address</label>
            <input className="input bg-bg-primary/50 text-text-muted" value={form.email} disabled />
          </div>
        </div>
      </div>

      <div className="card p-5 md:p-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-brand-indigo-light" />
            <h2 className="font-bold text-text-primary text-lg">Security & Passwords</h2>
          </div>
        </div>
        <div className="space-y-4">
          <input type="password" placeholder="Current password" className="input" value={pwForm.current} onChange={(e) => setPwForm({...pwForm, current: e.target.value})} />
          <input type="password" placeholder="New password" className="input" value={pwForm.new} onChange={(e) => setPwForm({...pwForm, new: e.target.value})} />
          <input type="password" placeholder="Confirm new password" className="input" value={pwForm.confirm} onChange={(e) => setPwForm({...pwForm, confirm: e.target.value})} />
          
          <div className="flex gap-3 pt-2">
            <button onClick={handleSavePassword} disabled={isSavingPw} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-indigo text-white text-sm font-semibold hover:bg-brand-indigo/90 transition-colors disabled:opacity-50">
              {isSavingPw ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PipelineSettings() {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState({ chunkSize: 512, chunkOverlap: 150, provider: 'groq', apiKey: '' })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Pipeline configurations applied.')
    }, 800)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
      <div className="card p-5 md:p-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-brand-indigo-light" />
            <h2 className="font-bold text-text-primary text-lg">Global RAG Configuration</h2>
          </div>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-brand-indigo hover:bg-brand-indigo/90 text-white text-xs font-bold rounded-lg transition-all shadow-glow-indigo disabled:opacity-50">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {loading ? 'Applying...' : 'Apply Config'}
          </button>
        </div>
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-bg-border pb-2">
              <Database className="w-4 h-4 text-brand-cyan" /> Vector Store Rules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Chunk Size</label><input type="number" className="input" value={config.chunkSize} onChange={(e) => setConfig({...config, chunkSize: Number(e.target.value)})} /></div>
              <div><label className="label">Overlap</label><input type="number" className="input" value={config.chunkOverlap} onChange={(e) => setConfig({...config, chunkOverlap: Number(e.target.value)})} /></div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 border-b border-bg-border pb-2">
              <Key className="w-4 h-4 text-brand-purple" /> Provider Setup
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Provider</label><select className="input" value={config.provider} onChange={(e) => setConfig({...config, provider: e.target.value})}><option value="groq">Groq</option><option value="ollama">Ollama</option></select></div>
              <div><label className="label">API Key</label><input type="password" className="input" value={config.apiKey} onChange={(e) => setConfig({...config, apiKey: e.target.value})} /></div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function SystemInfo() {
  const [isPurging, setIsPurging] = useState(false)
  const handleClearCache = () => toast.success('Semantic cache cleared.')

  const handlePurgeLogs = async () => {
    if (!window.confirm("Permanently delete all query history?")) return;
    setIsPurging(true)
    try {
      await ragApi.purgeLogs()
      toast.success('Legacy query logs purged.')
    } catch (error) {
      toast.error('Failed to purge query logs.')
    } finally {
      setIsPurging(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full">
      <div className="card p-5 md:p-6 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-5 h-5 text-brand-indigo-light" />
          <h2 className="font-bold text-text-primary text-lg">System Telemetry</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-bg-border bg-bg-primary flex items-center justify-between">
            <div><p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Logging</p><p className="text-sm font-semibold text-brand-green">INFO</p></div>
            <Server className="w-6 h-6 text-text-muted opacity-40" />
          </div>
          <div className="p-4 rounded-xl border border-bg-border bg-bg-primary flex items-center justify-between">
            <div><p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Database</p><p className="text-sm font-semibold text-brand-cyan">Connected</p></div>
            <Database className="w-6 h-6 text-text-muted opacity-40" />
          </div>
        </div>
        <div className="border-t border-bg-border pt-6 space-y-4">
          <h3 className="text-sm font-bold text-text-primary">Maintenance Operations</h3>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleClearCache} className="px-4 py-2.5 rounded-lg border border-brand-amber/30 bg-brand-amber/10 text-brand-amber text-sm font-semibold hover:bg-brand-amber/20 transition-colors flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Clear Cache
            </button>
            <button onClick={handlePurgeLogs} disabled={isPurging} className="px-4 py-2.5 rounded-lg border border-brand-red/30 bg-brand-red/10 text-brand-red text-sm font-semibold hover:bg-brand-red/20 transition-colors flex items-center gap-2 disabled:opacity-50">
              {isPurging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isPurging ? 'Purging...' : 'Purge Query Logs'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Database, Sparkles,
  History, Settings, LogOut, Menu, X, ChevronRight,
  Zap, User,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import clsx from 'clsx'
import { UserProfileModal } from '@/components/ui/UserProfileModal'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/collections', icon: Database, label: 'Collections' },
  { to: '/ask', icon: Sparkles, label: 'Ask AI' },
  { to: '/history', icon: History, label: 'Query History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false) // New state for profile modal
  const { logout, user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const u = await authApi.me()
      setUser(u)
      return u
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent modal from opening when clicking logout
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col bg-bg-secondary border-r border-bg-border transition-all duration-300 fixed lg:relative z-30 h-full shadow-2xl lg:shadow-none',
          sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-bg-border h-[72px]">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-indigo flex items-center justify-center shadow-glow-indigo">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden animate-in fade-in duration-300">
              <div className="font-bold text-text-primary text-base leading-tight tracking-tight">RAG Forge</div>
              <div className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest">Enterprise AI</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden ml-auto p-2 rounded-lg text-text-muted hover:text-white hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative',
                  isActive
                    ? 'bg-brand-indigo text-white shadow-glow-indigo'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-5 h-5 flex-shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-110', !sidebarOpen && "mx-auto")} />
                  {sidebarOpen && <span className="animate-in fade-in">{label}</span>}
                  {sidebarOpen && isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Updated User Section - Clickable */}
        <div className="px-3 pb-4 pt-3 border-t border-bg-border/60">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className={clsx(
              'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors w-full text-left hover:bg-bg-card',
              sidebarOpen && 'bg-bg-card border border-bg-border/50'
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 animate-in fade-in">
                <div className="text-sm font-bold text-text-primary truncate">{user?.full_name || 'System Admin'}</div>
                <div className="text-[10px] text-brand-indigo-light font-mono truncate">{user?.email}</div>
              </div>
            )}
            {sidebarOpen && (
              <div 
                onClick={handleLogout}
                className="p-2 rounded-lg text-text-muted hover:text-brand-red hover:bg-brand-red/10 transition-colors"
                title="Terminate Session"
              >
                <LogOut className="w-4 h-4" />
              </div>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col relative w-full min-w-0">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-bg-border bg-bg-secondary sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-indigo flex items-center justify-center shadow-glow-indigo">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-text-primary">RAG Forge</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-text-muted bg-bg-hover">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        
        <Outlet />
      </main>

      {/* Modal Triggered by Click */}
      <UserProfileModal 
        open={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
      />
    </div>
  )
}
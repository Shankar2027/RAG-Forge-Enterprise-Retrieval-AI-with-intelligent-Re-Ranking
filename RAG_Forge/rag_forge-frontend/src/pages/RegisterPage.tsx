import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Loader2, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'

const passwordChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.register(form.email, form.full_name, form.password)
      toast.success('Account provisioned! Please authenticate.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      {/* Premium Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-indigo/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center mb-5 shadow-glow-indigo">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">Initialize Identity</h1>
          <p className="text-text-secondary text-sm mt-2 font-medium">Provision your enterprise knowledge environment</p>
        </div>

        <div className="card shadow-2xl border-bg-border/50 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                className="input py-3"
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={set('full_name')}
                required
                minLength={2}
                autoFocus
              />
            </div>

            <div>
              <label className="label">Work email</label>
              <input
                type="email"
                className="input py-3"
                placeholder="jane@enterprise.com"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>

            <div>
              <label className="label">Security Key (Password)</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input py-3 pr-11"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {form.password && (
                <div className="mt-3 space-y-1.5 bg-bg-secondary/50 p-3 rounded-lg border border-bg-border/50">
                  {passwordChecks.map(({ label, test }) => (
                    <div key={label} className="flex items-center gap-2">
                      <CheckCircle2
                        className={`w-3.5 h-3.5 transition-colors ${test(form.password) ? 'text-brand-green' : 'text-text-muted'}`}
                      />
                      <span className={`text-xs font-medium transition-colors ${test(form.password) ? 'text-brand-green' : 'text-text-muted'}`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold text-base" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {loading ? 'Provisioning…' : 'Initialize Account'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-bg-border/50 text-center">
            <p className="text-text-muted text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-indigo hover:text-brand-indigo-light font-medium transition-colors">
                Authenticate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
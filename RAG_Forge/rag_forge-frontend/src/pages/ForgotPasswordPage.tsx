import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Zap, Loader2, Mail, CheckCircle2, Lock, AlertCircle } from 'lucide-react'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  const [isRequested, setIsRequested] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [done, setDone] = useState(false)

  // 1. Initial Request (The "Forgot Password" Email Flow)
  const sendResetLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email || "") // This needs an email input first
      toast.success('Check your inbox for the secure reset link')
      setIsRequested(true)
    } catch {
      toast.error('Unable to send link. Check your email.')
    } finally {
      setLoading(false)
    }
  }

  // 2. The Reset Flow (If user arrived via Email Link)
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !token) return toast.error("Invalid reset link")
    
    setLoading(true)
    try {
      await authApi.resetPassword({
        email: email,
        token: token,
        new_password: newPassword
      })
      setDone(true)
      toast.success('Password updated successfully!')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  // If the URL has a token, show the "Set New Password" form immediately
  if (token && email) {
    return (
      <div className="auth-bg min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md card shadow-2xl p-8 space-y-6">
          {done ? (
             <div className="text-center py-6">
               <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-5 border border-brand-green/20">
                 <CheckCircle2 className="w-8 h-8 text-brand-green" />
               </div>
               <p className="text-xl font-bold text-text-primary mb-2">Password Secured!</p>
               <Link to="/login" className="btn-primary w-full mt-6 py-3 block text-center">Return to Login</Link>
             </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="text-center space-y-2">
                <Lock className="w-10 h-10 text-brand-indigo mx-auto mb-2" />
                <h2 className="text-2xl font-bold">Set New Password</h2>
              </div>
              <input
                type="password"
                className="input w-full py-3"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Save Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Default view: Email Entry
  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md card shadow-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Recover Access</h1>
          <p className="text-sm text-text-muted">Enter your email to receive a magic reset link.</p>
        </div>
        <form onSubmit={sendResetLink} className="space-y-4">
          <input
            type="email"
            className="input w-full"
            placeholder="admin@enterprise.ai"
            onChange={(e) => searchParams.set('email', e.target.value)}
            required
          />
          <button className="btn-primary w-full py-3" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : 'Send Magic Link'}
          </button>
        </form>
      </div>
    </div>
  )
}
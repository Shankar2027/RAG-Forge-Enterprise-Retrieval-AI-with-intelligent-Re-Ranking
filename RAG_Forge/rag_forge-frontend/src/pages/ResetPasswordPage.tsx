import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import toast from 'react-hot-toast'
import { AlertCircle, Lock } from 'lucide-react'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  const [form, setForm] = useState({ new: '', confirm: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Show error if user arrived here without the magic link parameters
  if (!email || !token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bg-base">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Invalid Reset Link</h2>
          <p className="text-text-muted text-sm">
            This password reset link is invalid or expired. Please request a new one.
          </p>
          <button 
            onClick={() => navigate('/login')} 
            className="w-full mt-4 py-2.5 rounded-xl border border-bg-border text-text-secondary hover:bg-bg-hover transition-colors font-semibold"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (form.new.length < 8) {
      toast.error("Password must be at least 8 characters long.")
      return
    }
    if (form.new !== form.confirm) {
      toast.error("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      // Calls the new backend route /auth/reset-password
      await authApi.resetPassword({
        email: String(email).trim(),
        token: String(token).trim(),
        new_password: String(form.new)
      })
      
      toast.success("Password reset successfully!")
      navigate('/login')
    } catch (error: any) {
      const detail = error.response?.data?.detail
      if (Array.isArray(detail)) {
        toast.error(`Error: ${detail[0].msg}`)
      } else {
        toast.error(detail || "Failed to reset password. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-bg-base">
      <div className="card p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-brand-indigo/10 text-brand-indigo rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Set New Password</h2>
          <p className="text-sm text-text-muted">
            Securely update your password for <span className="font-semibold text-text-secondary">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="label">New Password</label>
            <input
              type="password"
              required
              className="input w-full"
              placeholder="••••••••"
              value={form.new}
              onChange={(e) => setForm({ ...form, new: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              required
              className="input w-full"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-brand-indigo text-white font-semibold hover:bg-brand-indigo/90 transition-all shadow-glow-indigo disabled:opacity-70 mt-4"
          >
            {isSubmitting ? 'Updating...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
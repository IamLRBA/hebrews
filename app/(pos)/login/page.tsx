'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBanner } from '@/components/pos/ErrorBanner'
import { setStaffRole, clearStaffSession } from '@/lib/pos-client'
import { User, Lock, LogIn } from 'lucide-react'

export default function UnifiedLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        const msg = data.error || (res.status === 500 
          ? 'Server error. Check that the database is running and seeded.' 
          : 'Login failed')
        throw new Error(msg)
      }

      // Store staff ID and role
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_staff_id', data.staffId)
        setStaffRole(data.role)
      }

      // Redirect based on role
      const role = data.role
      switch (role) {
        case 'admin':
          router.replace('/admin/dashboard')
          break
        case 'manager':
          router.replace('/manager/dashboard')
          break
        case 'kitchen':
          router.replace('/kitchen')
          break
        case 'cashier':
        default:
          router.replace('/pos/start')
          break
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
      clearStaffSession()
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="pos-page flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-neutral-900 dark:to-neutral-800">
      <div className="pos-page-container w-full max-w-md px-4">
        <div className="pos-card shadow-2xl">
          <div className="text-center mb-8">
            <div className="relative w-[84px] h-[84px] mx-auto mb-4">
              <img
                src="/Light.jpg"
                alt="Cafe Havilah Logo"
                className="w-[84px] h-[84px] object-contain dark:hidden"
              />
              <img
                src="/Dark.jpg"
                alt="Cafe Havilah Logo"
                className="hidden w-[84px] h-[84px] object-contain dark:block"
                style={{ backgroundColor: 'transparent', mixBlendMode: 'normal' }}
              />
            </div>
            <h1 className="pos-section-title text-3xl mb-2">Cafe Havilah POS</h1>
            <p className="pos-section-subtitle text-neutral-600 dark:text-neutral-400">
              Sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="pos-label flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pos-input mt-1 w-full"
                placeholder="Enter your username"
                autoComplete="username"
                aria-label="Username"
                disabled={loading}
                autoFocus
              />
            </label>
            
            <label className="block">
              <span className="pos-label flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pos-input mt-1 w-full"
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-label="Password"
                disabled={loading}
              />
            </label>

            {error && (
              <ErrorBanner 
                message={error} 
                onDismiss={() => setError(null)} 
              />
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
              Access is restricted to authorized staff only
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

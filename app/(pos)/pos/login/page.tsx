'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ErrorBanner } from '@/components/pos/ErrorBanner'

export default function PosLoginPage() {
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
        throw new Error(data.error || 'Login failed')
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_staff_id', data.staffId)
      }
      router.replace('/pos/start')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="pos-page flex items-center justify-center min-h-screen">
      <div className="pos-page-container w-full max-w-md">
        <div className="pos-card">
          <h1 className="pos-section-title text-2xl mb-2">POS Login</h1>
          <p className="pos-section-subtitle mb-6">Sign in with your staff account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="pos-label">Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pos-input mt-1 w-full"
                placeholder="Enter username"
                autoComplete="username"
                aria-label="Username"
              />
            </label>
            <label className="block">
              <span className="pos-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pos-input mt-1 w-full"
                placeholder="Enter password"
                autoComplete="current-password"
                aria-label="Password"
              />
            </label>
            {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn btn-primary w-full py-3 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

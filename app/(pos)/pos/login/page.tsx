'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PosLoginPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to unified login
    router.replace('/login')
  }, [router])
  
  return null

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

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type StaffMember = { id: string; name: string }

export default function PosLoginPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/staff')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load staff')
        return res.json()
      })
      .then((data) => {
        setStaff(data)
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load staff'))
      .finally(() => setLoading(false))
  }, [])

  function handleStartSession() {
    if (!selectedId) return
    if (typeof window === 'undefined') return
    localStorage.setItem('pos_staff_id', selectedId)
    router.push('/pos')
  }

  if (loading) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300">Loading…</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="pos-page flex items-center justify-center">
        <div className="pos-card max-w-sm w-full">
          <p className="pos-alert pos-alert-error">{error}</p>
          <Link href="/pos/login" className="pos-link mt-4 inline-block">
            Try again
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="pos-page flex items-center justify-center min-h-screen">
      <div className="pos-page-container w-full max-w-md">
        <div className="pos-card">
          <h1 className="pos-section-title text-2xl mb-2">POS — Staff</h1>
          <p className="pos-section-subtitle">Select your account to start your session</p>

          <label className="pos-label">
            Staff member
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="pos-select mt-1 mb-6"
            aria-label="Select staff member"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleStartSession}
            disabled={!selectedId}
            className="btn btn-primary w-full"
          >
            Start Session
          </button>
        </div>
      </div>
    </main>
  )
}

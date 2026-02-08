'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

  if (loading) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Loading…</p></main>
  if (error) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p style={{ color: 'red' }}>{error}</p></main>

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif', maxWidth: '20rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>POS — Staff</h1>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Staff
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '100%' }}
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={handleStartSession}
        disabled={!selectedId}
        style={{ marginTop: '0.5rem', padding: '0.5rem 1rem' }}
      >
        Start Session
      </button>
    </main>
  )
}

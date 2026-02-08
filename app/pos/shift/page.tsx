'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStaffId, posFetch } from '@/lib/pos-client'

type ShiftSummary = {
  shiftId: string
  staffId: string
  terminalId: string
  startTime: string
  endTime: string | null
  totalOrders: number
  servedOrders: number
  cancelledOrders: number
  grossSalesUgx: number
  totalPaymentsUgx: number
  cashPaymentsUgx: number
  nonCashPaymentsUgx: number
}

type ActiveShift = {
  shiftId: string
  staffId: string
  terminalId: string
  startTime: string
  endTime: string | null
}

export default function ShiftPage() {
  const router = useRouter()
  const [staffOk, setStaffOk] = useState(false)
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [declaredCashUgx, setDeclaredCashUgx] = useState('')
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(false)
  const [closeResult, setCloseResult] = useState<{ summary: ShiftSummary; cashVarianceUgx?: number } | null>(null)

  async function fetchActiveShift() {
    try {
      const res = await posFetch('/api/shifts/active')
      if (!res.ok) {
        if (res.status === 404) {
          setError('No active shift')
          setActiveShift(null)
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setActiveShift(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load active shift')
      setActiveShift(null)
    }
  }

  async function fetchShiftSummary(shiftId: string) {
    try {
      const res = await posFetch(`/api/shifts/${shiftId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSummary(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shift summary')
      setSummary(null)
    }
  }

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/pos/login')
      return
    }
    setStaffOk(true)
  }, [router])

  useEffect(() => {
    if (!staffOk) return
    setLoading(true)
    setError(null)
    fetchActiveShift().finally(() => setLoading(false))
  }, [staffOk])

  useEffect(() => {
    if (activeShift?.shiftId) {
      fetchShiftSummary(activeShift.shiftId)
    } else {
      setSummary(null)
    }
  }, [activeShift?.shiftId])

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault()
    if (!activeShift?.shiftId) return
    const amount = declaredCashUgx.trim() === '' ? undefined : parseFloat(declaredCashUgx)
    if (amount !== undefined && (isNaN(amount) || amount < 0)) {
      alert('Enter a valid cash amount')
      return
    }
    setClosing(true)
    try {
      const res = await posFetch(`/api/shifts/${activeShift.shiftId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedByStaffId: getStaffId(),
          declaredCashUgx: amount,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setCloseResult({ summary: data.summary, cashVarianceUgx: data.cashVarianceUgx })
      setClosed(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to close shift')
    } finally {
      setClosing(false)
    }
  }

  if (!staffOk || loading) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p>Loading…</p></main>
  if (error && !activeShift) return <main style={{ padding: '1.5rem', fontFamily: 'system-ui' }}><p style={{ color: 'red' }}>{error}</p><Link href="/pos">← Back to POS</Link></main>

  return (
    <main style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <p><Link href="/pos" style={{ textDecoration: 'none' }}>← Back to POS</Link></p>
      <h1>Shift Summary</h1>

      {activeShift && (
        <section style={{ marginBottom: '1.5rem' }}>
          <p><strong>Shift ID:</strong> {activeShift.shiftId}</p>
          <p><strong>Start:</strong> {new Date(activeShift.startTime).toLocaleString()}</p>
          <p><strong>End:</strong> {activeShift.endTime ? new Date(activeShift.endTime).toLocaleString() : '—'}</p>
        </section>
      )}

      {summary && (
        <section style={{ marginBottom: '1.5rem' }}>
          <p><strong>Gross Sales:</strong> {summary.grossSalesUgx.toLocaleString()} UGX</p>
          <p><strong>Total Payments:</strong> {summary.totalPaymentsUgx.toLocaleString()} UGX</p>
          <p><strong>Cash Payments:</strong> {summary.cashPaymentsUgx.toLocaleString()} UGX</p>
        </section>
      )}

      {!closed && activeShift && (
        <form onSubmit={handleCloseShift} style={{ marginBottom: '1rem' }}>
          <label>
            Declared Cash (UGX):{' '}
            <input
              type="number"
              min="0"
              step="100"
              placeholder="Optional"
              value={declaredCashUgx}
              onChange={(e) => setDeclaredCashUgx(e.target.value)}
              style={{ padding: '0.25rem', width: '10rem', marginRight: '0.5rem' }}
            />
          </label>
          <button type="submit" disabled={closing}>Close Shift</button>
        </form>
      )}

      {closed && closeResult && (
        <section style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p><strong>Shift closed.</strong></p>
          <p>Gross Sales: {closeResult.summary.grossSalesUgx.toLocaleString()} UGX</p>
          <p>Total Payments: {closeResult.summary.totalPaymentsUgx.toLocaleString()} UGX</p>
          <p>Cash Payments: {closeResult.summary.cashPaymentsUgx.toLocaleString()} UGX</p>
          {closeResult.cashVarianceUgx !== undefined && (
            <p>Cash Variance: {closeResult.cashVarianceUgx.toLocaleString()} UGX</p>
          )}
        </section>
      )}
    </main>
  )
}

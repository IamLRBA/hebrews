'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { getStaffId, posFetch } from '@/lib/pos-client'
import CafeHavilahWord from '@/components/ui/CafeHavilahWord'

const PLACEHOLDER_IMAGE = '/pos-images/placeholder.svg'

const receiptPrintStyles = `
  @media print {
    body * { visibility: hidden; }
    .receipt-print-area, .receipt-print-area * { visibility: visible; }
    .receipt-print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm;
      max-width: 80mm;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.3;
      padding: 4mm;
      margin: 0;
      background: white;
      color: black;
    }
    .receipt-print-area h1,
    .receipt-print-area p,
    .receipt-print-area .receipt-line { margin: 2px 0; }
    .receipt-divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
    .receipt-row { display: flex; justify-content: space-between; gap: 8px; }
    .receipt-row span:last-child { text-align: right; }
  }
`

type ReceiptItem = {
  name: string
  imageUrl?: string | null
  quantity: number
  unitPriceUgx: number
  totalUgx: number
}

type ReceiptPayment = {
  method: string
  amountUgx: number
}

type Receipt = {
  orderId: string
  status: string
  createdAt: string
  servedAt: string | null
  staffName: string
  tableLabel: string | null
  items: ReceiptItem[]
  totalUgx: number
  payments: ReceiptPayment[]
}

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    mtn_momo: 'MTN MoMo',
    airtel_money: 'Airtel Money',
    card: 'Card',
  }
  return labels[method] ?? method
}

export default function OrderPrintPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const orderId = params.orderId as string
  const autoPrintDone = useRef(false)

  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getStaffId()) {
      router.replace('/login')
      return
    }
  }, [router])

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }
    let cancelled = false
    posFetch(`/api/orders/${orderId}/receipt`)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) throw new Error('Failed to load receipt')
        return res.json()
      })
      .then((data: Receipt | undefined) => {
        if (cancelled || !data?.orderId) return
        setReceipt(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [orderId])

  // Auto-print when opened with ?autoPrint=1 (e.g. from Bar/Kitchen "Print Order")
  useEffect(() => {
    if (!receipt || autoPrintDone.current) return
    if (searchParams.get('autoPrint') !== '1') return
    autoPrintDone.current = true
    const t = setTimeout(() => window.print(), 500)
    return () => clearTimeout(t)
  }, [receipt, searchParams])

  if (loading) {
    return (
      <main className="pos-page flex items-center justify-center min-h-screen">
        <div className="pos-card max-w-sm w-full text-center">
          <p className="text-primary-600 dark:text-primary-300 m-0">Loading…</p>
        </div>
      </main>
    )
  }

  if (error || !receipt) {
    return (
      <main className="pos-page">
        <div className="pos-page-container max-w-md mx-auto p-6">
          <div className="pos-alert pos-alert-error mb-4">{error || 'Receipt not found'}</div>
          <button type="button" onClick={() => window.close()} className="btn btn-outline">
            Close
          </button>
        </div>
      </main>
    )
  }

  const dateStr = receipt.servedAt
    ? new Date(receipt.servedAt).toLocaleString()
    : new Date(receipt.createdAt).toLocaleString()
  const tableLabel = receipt.tableLabel ?? 'Takeaway'

  return (
    <main className="pos-page min-h-screen flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: receiptPrintStyles }} />
      <div className="flex-1 p-6 flex flex-col items-center">
        <div className="pos-card w-full max-w-md p-6 receipt-print-area receipt-content font-mono text-sm">
          <h1 className="text-center mb-2 text-base font-bold">
            <CafeHavilahWord />
          </h1>
          <p className="text-center m-0">{dateStr}</p>
          <p className="text-center m-0">Staff: {receipt.staffName}</p>
          <p className="text-center m-0">Table: {tableLabel}</p>
          <hr className="receipt-divider border-neutral-200 dark:border-neutral-600 my-4" />

          <div className="receipt-row font-medium mb-1">
            <span>Item</span>
            <span>Qty</span>
            <span>Total</span>
          </div>
          <hr className="receipt-divider border-neutral-200 dark:border-neutral-600 my-1" />
          {receipt.items.map((item, i) => {
            const imgSrc = item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? item.imageUrl : PLACEHOLDER_IMAGE
            return (
              <div key={i}>
                <div className="receipt-row receipt-line flex items-center gap-2">
                  <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 print:w-6 print:h-6">
                    <Image src={imgSrc} alt="" fill className="object-cover" sizes="32px" />
                  </div>
                  <span className="flex-1 truncate">{item.name}</span>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <span className="w-20 text-right">{item.totalUgx.toLocaleString()}</span>
                </div>
                {i < receipt.items.length - 1 && <div className="pos-order-item-divider my-1" aria-hidden />}
              </div>
            )
          })}
          <hr className="receipt-divider border-neutral-200 dark:border-neutral-600 my-2" />
          <div className="receipt-row font-semibold text-base">
            <span>TOTAL:</span>
            <span></span>
            <span className="w-20 text-right">{receipt.totalUgx.toLocaleString()}</span>
          </div>

          <p className="font-medium mt-4 mb-1">Payments:</p>
          {receipt.payments.map((p, i) => (
            <div key={i} className="receipt-row receipt-line">
              <span>{methodLabel(p.method)}</span>
              <span></span>
              <span className="w-20 text-right">{p.amountUgx.toLocaleString()}</span>
            </div>
          ))}

          <hr className="receipt-divider border-neutral-200 dark:border-neutral-600 my-4" />
          <p className="text-center font-medium m-0">Thank you!</p>
        </div>

        <div className="flex gap-4 mt-6 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-primary py-3 px-6"
          >
            Print
          </button>
          <button type="button" onClick={() => window.close()} className="btn btn-outline py-3 px-6">
            Close
          </button>
        </div>
      </div>
    </main>
  )
}

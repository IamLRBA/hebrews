import { NextRequest, NextResponse } from 'next/server'
import { recordExternalPayment, type ExternalPaymentMethod } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

const STAFF_ID_SYSTEM = 'system'

function mapPesapalMethod(payment_method: string): ExternalPaymentMethod {
  const normalized = (payment_method || '').toUpperCase()
  if (normalized === 'MTN') return 'mtn_momo'
  if (normalized === 'AIRTEL') return 'airtel_money'
  if (normalized === 'VISA' || normalized === 'MASTERCARD') return 'card'
  return 'card'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { orderId, amount, payment_method } = body

    if (typeof orderId !== 'string' || !orderId) {
      return NextResponse.json({ error: 'orderId is required (string)' }, { status: 400 })
    }
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'amount is required (number >= 0)' }, { status: 400 })
    }

    const method = mapPesapalMethod(typeof payment_method === 'string' ? payment_method : '')

    await recordExternalPayment({
      orderId,
      amountUgx: amount,
      method,
      staffId: STAFF_ID_SYSTEM,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return toPosApiResponse(error)
  }
}

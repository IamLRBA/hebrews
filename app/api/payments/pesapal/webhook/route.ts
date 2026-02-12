import { NextRequest, NextResponse } from 'next/server'
import { recordExternalPayment, type ExternalPaymentMethod } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import crypto from 'crypto'

const STAFF_ID_SYSTEM = 'system'

function mapPesapalMethod(payment_method: string): ExternalPaymentMethod {
  const normalized = (payment_method || '').toUpperCase()
  if (normalized === 'MTN') return 'mtn_momo'
  if (normalized === 'AIRTEL') return 'airtel_money'
  if (normalized === 'VISA' || normalized === 'MASTERCARD') return 'card'
  return 'card'
}

/**
 * Verifies webhook signature using HMAC SHA256.
 * Uses constant-time comparison to prevent timing attacks.
 */
function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex')

  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  )
}

export async function POST(request: NextRequest) {
  try {
    // PART 1: Webhook Authentication
    const webhookSecret = process.env.PESAPAL_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('PESAPAL_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const signature = request.headers.get('x-pesapal-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing x-pesapal-signature header' }, { status: 401 })
    }

    // Get raw body for signature verification
    const rawBody = await request.text()
    
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse body after verification
    const body = JSON.parse(rawBody)
    const { orderId, amount, payment_method, transaction_tracking_id } = body

    if (typeof orderId !== 'string' || !orderId) {
      return NextResponse.json({ error: 'orderId is required (string)' }, { status: 400 })
    }
    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'amount is required (number >= 0)' }, { status: 400 })
    }
    if (typeof transaction_tracking_id !== 'string' || !transaction_tracking_id) {
      return NextResponse.json({ error: 'transaction_tracking_id is required (string)' }, { status: 400 })
    }

    const method = mapPesapalMethod(typeof payment_method === 'string' ? payment_method : '')

    // PART 2 & 3: Idempotency and race condition protection handled in recordExternalPayment
    await recordExternalPayment({
      orderId,
      amountUgx: amount,
      method,
      staffId: STAFF_ID_SYSTEM,
      externalReference: transaction_tracking_id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return toPosApiResponse(error)
  }
}

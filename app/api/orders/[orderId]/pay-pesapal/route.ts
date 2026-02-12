import { NextRequest, NextResponse } from 'next/server'
import { createPesapalPaymentSession } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'
import { config } from '@/lib/config'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const appBaseUrl =
      config.appBaseUrl ||
      (typeof request.url === 'string' ? new URL(request.url).origin : '')
    if (!appBaseUrl) {
      return NextResponse.json(
        { error: 'APP_BASE_URL or NEXT_PUBLIC_APP_ORIGIN required for Pesapal callback' },
        { status: 500 }
      )
    }

    const { paymentUrl } = await createPesapalPaymentSession({ orderId, appBaseUrl })
    return NextResponse.json({ paymentUrl })
  } catch (error) {
    return toPosApiResponse(error)
  }
}

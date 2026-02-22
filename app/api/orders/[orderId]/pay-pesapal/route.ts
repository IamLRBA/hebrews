import { NextRequest, NextResponse } from 'next/server'

/** Pesapal (Card / Airtel Money) payment is disabled; POS uses cash only. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }
  return NextResponse.json(
    { error: 'Card and Airtel Money payments are disabled. Use cash only.' },
    { status: 410 }
  )
}

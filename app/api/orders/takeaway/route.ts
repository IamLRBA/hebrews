import { NextRequest, NextResponse } from 'next/server'
import { createTakeawayOrder } from '@/lib/pos-service'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { staffId, orderNumber } = body

    if (typeof staffId !== 'string' || !staffId) {
      return NextResponse.json({ error: 'staffId is required (string)' }, { status: 400 })
    }
    if (typeof orderNumber !== 'string' || !orderNumber) {
      return NextResponse.json({ error: 'orderNumber is required (string)' }, { status: 400 })
    }

    const order = await createTakeawayOrder({ staffId, orderNumber })
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}

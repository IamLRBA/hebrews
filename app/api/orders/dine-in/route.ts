import { NextRequest, NextResponse } from 'next/server'
import { createDineInOrder } from '@/lib/domain/orders'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tableId, createdByStaffId } = body

    if (typeof tableId !== 'string' || !tableId) {
      return NextResponse.json({ error: 'tableId is required (string)' }, { status: 400 })
    }
    if (typeof createdByStaffId !== 'string' || !createdByStaffId) {
      return NextResponse.json({ error: 'createdByStaffId is required (string)' }, { status: 400 })
    }

    const order = await createDineInOrder({ tableId, createdByStaffId })
    return NextResponse.json(order)
  } catch (error) {
    return toPosApiResponse(error)
  }
}

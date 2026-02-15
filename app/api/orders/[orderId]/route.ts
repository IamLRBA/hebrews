import { NextRequest, NextResponse } from 'next/server'
import { getOrderDetail } from '@/lib/read-models'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const result = await getOrderDetail(orderId)

    if (result === null) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      orderType: result.orderType,
      tableId: result.tableId,
      tableCode: result.tableCode,
      status: result.status,
      totalUgx: result.totalUgx,
      items: result.items,
      payments: result.payments,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

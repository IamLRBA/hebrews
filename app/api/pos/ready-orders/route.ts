import { NextResponse } from 'next/server'
import { getReadyOrders } from '@/lib/read-models'

export async function GET() {
  const orders = await getReadyOrders()
  return NextResponse.json(orders)
}

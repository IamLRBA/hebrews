import { NextResponse } from 'next/server'
import { getKdsOrders } from '@/lib/read-models'

export async function GET() {
  const orders = await getKdsOrders()
  return NextResponse.json(orders)
}

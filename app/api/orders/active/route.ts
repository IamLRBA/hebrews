import { NextResponse } from 'next/server'
import { getActiveOrdersForPos } from '@/lib/read-models'

export async function GET() {
  try {
    const orders = await getActiveOrdersForPos()
    return NextResponse.json(orders)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch active orders' },
      { status: 500 }
    )
  }
}

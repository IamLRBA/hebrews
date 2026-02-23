import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Returns the count of orders with status 'ready' or 'awaiting_payment'.
 * Used for the Ready nav badge on the cashier POS.
 */
export async function GET() {
  const count = await prisma.order.count({
    where: { status: { in: ['ready', 'awaiting_payment'] } },
  })
  return NextResponse.json({ count })
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * Returns the count of orders in the kitchen queue that are still pending
 * (sent to kitchen but not yet "Start Preparing") in any active shift.
 * Used for the Pending nav badge on the kitchen display.
 */
export async function GET() {
  try {
    const count = await prisma.order.count({
      where: {
        shift: { endTime: null },
        status: 'pending',
        sentToKitchenAt: { not: null },
      },
    })
    return NextResponse.json({ count })
  } catch (error) {
    return toPosApiResponse(error)
  }
}

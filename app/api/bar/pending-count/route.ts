import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { toPosApiResponse } from '@/lib/pos-api-errors'

/**
 * Returns the count of orders in the bar queue that are still pending
 * (sent to bar but not yet "Start Preparing") in any active shift.
 * Used for the Pending nav badge on the bar display.
 */
export async function GET() {
  try {
    const count = await prisma.order.count({
      where: {
        shift: { endTime: null },
        sentToBarAt: { not: null },
        status: 'pending',
      },
    })
    return NextResponse.json({ count })
  } catch (error) {
    return toPosApiResponse(error)
  }
}

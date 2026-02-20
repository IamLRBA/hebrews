import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedStaff } from '@/lib/pos-auth'
import { toPosApiResponse } from '@/lib/pos-api-errors'

export async function GET(request: NextRequest) {
  try {
    const { staffId } = await getAuthenticatedStaff(request)

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, fullName: true, role: true },
    })
    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    }

    return NextResponse.json({
      staffId: staff.id,
      fullName: staff.fullName,
      role: staff.role,
    })
  } catch (e) {
    return toPosApiResponse(e)
  }
}

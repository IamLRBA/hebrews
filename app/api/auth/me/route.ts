import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const STAFF_ID_HEADER = 'x-staff-id'

export async function GET(request: NextRequest) {
  const staffId = request.headers.get(STAFF_ID_HEADER)?.trim()
  if (!staffId) {
    return NextResponse.json({ error: 'Staff session required' }, { status: 401 })
  }

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
}

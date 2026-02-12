import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Returns active staff with kitchen, manager, or admin roles only.
 * Used for kitchen login dropdown.
 */
export async function GET() {
  const staff = await prisma.staff.findMany({
    where: {
      isActive: true,
      role: { in: ['kitchen', 'manager', 'admin'] },
    },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true },
  })
  return NextResponse.json(
    staff.map((s) => ({ id: s.id, name: s.fullName }))
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { getTableStatuses } from '@/lib/read-models'

export async function GET(request: NextRequest) {
  const shiftId = request.nextUrl.searchParams.get('shiftId')
  if (!shiftId) {
    return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
  }
  const tables = await getTableStatuses(shiftId)
  return NextResponse.json(tables)
}

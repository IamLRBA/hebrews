import { NextRequest, NextResponse } from 'next/server'
import { getShiftSummary } from '@/lib/read-models'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    const result = await getShiftSummary(shiftId)

    if (result === null) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch shift' },
      { status: 500 }
    )
  }
}

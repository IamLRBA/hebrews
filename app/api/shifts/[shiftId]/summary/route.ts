import { NextResponse } from 'next/server'
import { getShiftPaymentSummary } from '@/lib/read-models'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  const { shiftId } = await params
  if (!shiftId) {
    return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
  }
  const summary = await getShiftPaymentSummary(shiftId)
  return NextResponse.json(summary)
}

import { NextResponse } from 'next/server'
import { getActiveStaff } from '@/lib/read-models'

export async function GET() {
  const staff = await getActiveStaff()
  return NextResponse.json(staff)
}

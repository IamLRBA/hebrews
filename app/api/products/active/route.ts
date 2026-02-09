import { NextResponse } from 'next/server'
import { getActiveProductsForPos } from '@/lib/read-models'

export async function GET() {
  try {
    const products = await getActiveProductsForPos()
    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

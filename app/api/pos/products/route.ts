import { NextResponse } from 'next/server'
import { getPosProducts } from '@/lib/read-models'

export async function GET() {
  const products = await getPosProducts()
  return NextResponse.json(products)
}

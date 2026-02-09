'use client'

import Link from 'next/link'
import { Coffee } from 'lucide-react'

const CAFE_NAME = 'Cafe Havilah & Pizzeria'

export default function PosLandingPage() {
  return (
    <div className="pos-landing">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-800 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Coffee className="w-10 h-10 text-primary-600 dark:text-primary-300" aria-hidden />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-primary-800 dark:text-primary-100 tracking-tight mb-2">
          {CAFE_NAME}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mb-8">
          Point of Sale
        </p>
        <Link
          href="/pos"
          className="btn btn-primary w-full sm:w-auto min-w-[200px] px-8 py-3.5 no-underline"
        >
          Enter POS
        </Link>
      </div>
    </div>
  )
}

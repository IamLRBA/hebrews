'use client'

import Link from 'next/link'
import Image from 'next/image'
import CafeHavilahWord from '@/components/ui/CafeHavilahWord'

export default function PosLandingPage() {
  return (
    <div className="pos-landing pos-page">
      <div className="max-w-md mx-auto">
        <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mx-auto mb-0">
          <Image
            src="/Light.jpg"
            alt="Cafe Havilah & Pizzeria"
            width={384}
            height={384}
            className="w-full h-full object-contain dark:hidden"
            priority
          />
          <Image
            src="/Dark.jpg"
            alt="Cafe Havilah & Pizzeria"
            width={384}
            height={384}
            className="w-full h-full object-contain hidden dark:block"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-primary-800 dark:text-primary-100 tracking-tight mb-1 mt-1">
          <CafeHavilahWord />
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm sm:text-base mb-3">
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

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PosLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to unified login
    router.replace('/login')
  }, [router])

  return null
}

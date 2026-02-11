'use client'

import { useState, useEffect } from 'react'

const SCROLL_THRESHOLD = 300

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setVisible(typeof window !== 'undefined' && window.scrollY > SCROLL_THRESHOLD)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="pos-back-to-top"
      aria-label="Back to top"
    >
      <span className="pos-back-to-top-arrow" aria-hidden>⇑</span>
    </button>
  )
}

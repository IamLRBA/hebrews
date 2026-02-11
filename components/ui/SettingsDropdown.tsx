'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Settings, LogIn } from 'lucide-react'
import ThemeSwitcher from '@/components/ThemeSwitcher'

export default function SettingsDropdown() {
  const [open, setOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  function handleButtonClick() {
    setSpinning(true)
    setOpen((prev) => !prev)
    const t = setTimeout(() => setSpinning(false), 400)
    return () => clearTimeout(t)
  }

  return (
    <div className="pos-settings-dropdown" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleButtonClick}
        className={`pos-settings-dropdown-trigger ${spinning ? 'pos-settings-dropdown-trigger-spin' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Settings"
      >
        <Settings className="w-5 h-5" aria-hidden />
      </button>
      {open && (
        <div className="pos-settings-dropdown-panel" role="menu">
          <ThemeSwitcher />
          <div className="pos-settings-dropdown-divider" />
          <Link
            href="/pos/login"
            className="pos-settings-dropdown-link"
            onClick={() => setOpen(false)}
          >
            <LogIn className="w-4 h-4" aria-hidden />
            <span>Staff login</span>
          </Link>
        </div>
      )}
    </div>
  )
}

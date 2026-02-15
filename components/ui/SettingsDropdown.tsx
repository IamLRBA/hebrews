'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Settings, LogIn } from 'lucide-react'
import ThemeSwitcher from '@/components/ThemeSwitcher'

export default function SettingsDropdown() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [spinDirection, setSpinDirection] = useState<'cw' | 'ccw'>('cw')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    setSpinDirection('cw')
    setSpinning(true)
    setClosing(true)
    setTimeout(() => {
      setOpen(false)
      setClosing(false)
      setSpinning(false)
    }, 280)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && open && !closing) {
        handleClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, closing, handleClose])

  function handleButtonClick() {
    if (closing) return
    const willOpen = !open
    setSpinDirection(willOpen ? 'ccw' : 'cw')
    setSpinning(true)
    if (willOpen) {
      setOpen(true)
    } else {
      handleClose()
      return
    }
    setTimeout(() => setSpinning(false), 400)
  }

  const showPanel = open || closing

  return (
    <div className="pos-settings-dropdown" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleButtonClick}
        className={`pos-settings-dropdown-trigger ${spinning ? (spinDirection === 'ccw' ? 'pos-settings-dropdown-trigger-spin-ccw' : 'pos-settings-dropdown-trigger-spin') : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Settings"
      >
        <Settings className="w-5 h-5" aria-hidden />
      </button>
      {showPanel && (
        <div className={`pos-settings-dropdown-panel ${closing ? 'pos-settings-dropdown-panel-close' : ''}`} role="menu">
          <ThemeSwitcher />
          <div className="pos-settings-dropdown-divider" />
          <Link
            href="/pos/login"
            className="pos-settings-dropdown-link"
            onClick={() => handleClose()}
          >
            <LogIn className="w-4 h-4" aria-hidden />
            <span>Staff login</span>
          </Link>
        </div>
      )}
    </div>
  )
}

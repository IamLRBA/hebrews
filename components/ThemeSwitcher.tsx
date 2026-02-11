'use client'

import { useTheme } from '@/components/layout/ThemeProvider'
import { Monitor, Sun, Moon } from 'lucide-react'

type Theme = 'system' | 'light' | 'dark'

export default function ThemeSwitcher() {
  const { theme, setTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <div className="pos-theme-switcher" aria-hidden>
        <span className="pos-theme-switcher-label">Theme</span>
        <div className="pos-theme-switcher-options" />
      </div>
    )
  }

  const options: { value: Theme; label: string; icon: typeof Monitor }[] = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ]

  return (
    <div className="pos-theme-switcher">
      <span className="pos-theme-switcher-label">Theme</span>
      <div className="pos-theme-switcher-options" role="radiogroup" aria-label="Theme">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            title={label}
            onClick={() => setTheme(value)}
            className={`pos-theme-switcher-btn ${theme === value ? 'pos-theme-switcher-btn-active' : ''}`}
          >
            <Icon className="w-4 h-4" aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

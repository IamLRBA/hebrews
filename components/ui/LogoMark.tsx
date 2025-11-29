'use client'

import { useEffect, useState, useRef } from 'react'
import { useTheme } from '@/components/layout/ThemeProvider'

type LogoMarkProps = {
  className?: string
  animated?: boolean
  size?: number
}

const LIGHT_LOGO_SRC = '/assets/images/branding/logo-light.png'
const DARK_LOGO_SRC = '/assets/images/branding/logo-dark.png'

export default function LogoMark({ className, animated = false, size = 120 }: LogoMarkProps) {
  const { theme, mounted } = useTheme()
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (!mounted) return
    
    // Determine theme based on user preference
    let newTheme: 'light' | 'dark'
    if (theme === 'system') {
      newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      newTheme = theme === 'dark' ? 'dark' : 'light'
    }
    
    setResolvedTheme(newTheme)
  }, [theme, mounted])

  const currentLogo = resolvedTheme === 'dark' ? DARK_LOGO_SRC : LIGHT_LOGO_SRC
  const classes = ['logo-mark', animated ? 'logo-mark--animated' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      aria-hidden="true"
    >
      <img
        key={mounted ? `logo-${resolvedTheme}` : 'logo-ssr'}
        src={mounted ? currentLogo : LIGHT_LOGO_SRC}
        alt="Mystical PIECES® logo"
        width={size}
        height={size}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        loading="eager"
      />
    </div>
  )
}


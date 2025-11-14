'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/layout/ThemeProvider'

type LogoMarkProps = {
  className?: string
  animated?: boolean
  size?: number
}

const LIGHT_LOGO_SRC = '/assets/images/branding/logo-light.svg'
const DARK_LOGO_SRC = '/assets/images/branding/logo-dark.svg'

export default function LogoMark({ className, animated = false, size = 120 }: LogoMarkProps) {
  const { theme, mounted } = useTheme()
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (!mounted) return
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setResolvedTheme(prefersDark ? 'dark' : 'light')
    } else {
      setResolvedTheme(theme === 'dark' ? 'dark' : 'light')
    }
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
      }}
      aria-hidden="true"
    >
      <Image
        src={currentLogo}
        alt="Mystical PIECES® logo"
        width={size}
        height={size}
        priority={false}
        draggable={false}
      />
    </div>
  )
}


'use client'

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
  const [imageError, setImageError] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)

  // Function to determine current theme from DOM
  const getCurrentTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    const root = document.documentElement
    if (root.classList.contains('dark')) return 'dark'
    if (root.classList.contains('light')) return 'light'
    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  useEffect(() => {
    // Set initial theme immediately for SSR/hydration
    if (typeof window !== 'undefined') {
      const initialTheme = getCurrentTheme()
      setResolvedTheme(initialTheme)
    }
    
    if (!mounted) return
    
    // Determine theme based on user preference
    let newTheme: 'light' | 'dark'
    if (theme === 'system') {
      newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      newTheme = theme === 'dark' ? 'dark' : 'light'
    }
    
    setResolvedTheme(newTheme)
    
    // Reset error state when theme changes to allow retry
    setImageError(false)
    setLogoLoaded(false)
  }, [theme, mounted])

  // Listen to DOM class changes for immediate updates
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observer = new MutationObserver(() => {
      const currentTheme = getCurrentTheme()
      if (currentTheme !== resolvedTheme) {
        setResolvedTheme(currentTheme)
        setImageError(false)
        setLogoLoaded(false)
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [resolvedTheme])

  const currentLogo = resolvedTheme === 'dark' ? DARK_LOGO_SRC : LIGHT_LOGO_SRC

  const classes = ['logo-mark', animated ? 'logo-mark--animated' : '', className]
    .filter(Boolean)
    .join(' ')

  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = () => {
    setLogoLoaded(true)
  }

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
      {!imageError ? (
        <>
          <img
            key={currentLogo}
            src={currentLogo}
            alt="Mystical PIECES® logo"
            width={size}
            height={size}
            draggable={false}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              visibility: logoLoaded ? 'visible' : 'visible',
              opacity: logoLoaded ? 1 : 0.3,
              transition: 'opacity 0.3s ease-in-out',
            }}
            loading="eager"
          />
          {!logoLoaded && (
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
              }}
            />
          )}
        </>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.3,
            fontWeight: 'bold',
            color: 'currentColor',
          }}
        >
          MP
        </div>
      )}
    </div>
  )
}


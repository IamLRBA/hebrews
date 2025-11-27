'use client'

import { useEffect, useState, useRef } from 'react'
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
  const imgRef = useRef<HTMLImageElement>(null)
  const retryCountRef = useRef(0)

  // Function to determine current theme from DOM
  const getCurrentTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    const root = document.documentElement
    if (root.classList.contains('dark')) return 'dark'
    if (root.classList.contains('light')) return 'light'
    // Fallback to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Preload both logos for faster switching
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const preloadLight = document.createElement('link')
    preloadLight.rel = 'preload'
    preloadLight.as = 'image'
    preloadLight.href = LIGHT_LOGO_SRC
    
    const preloadDark = document.createElement('link')
    preloadDark.rel = 'preload'
    preloadDark.as = 'image'
    preloadDark.href = DARK_LOGO_SRC
    
    document.head.appendChild(preloadLight)
    document.head.appendChild(preloadDark)
    
    return () => {
      try {
        if (preloadLight.parentNode) {
          document.head.removeChild(preloadLight)
        }
        if (preloadDark.parentNode) {
          document.head.removeChild(preloadDark)
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }, [])

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
    retryCountRef.current = 0
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
        retryCountRef.current = 0
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

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget
    // Retry loading once with a fresh request
    if (retryCountRef.current === 0 && img) {
      retryCountRef.current = 1
      // Force reload by creating new image object
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = ''
          imgRef.current.src = currentLogo
        }
      }, 100)
    } else {
      // After retry, show fallback only if still failing
      setImageError(true)
    }
  }

  const handleImageLoad = () => {
    setLogoLoaded(true)
    setImageError(false)
    retryCountRef.current = 0
  }
  
  // Ensure image loads when mounted or logo changes
  useEffect(() => {
    if (mounted && imgRef.current && !logoLoaded && !imageError) {
      // Ensure image source is set
      if (imgRef.current.src !== window.location.origin + currentLogo) {
        imgRef.current.src = currentLogo
      }
    }
  }, [currentLogo, mounted, logoLoaded, imageError])

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
        ref={imgRef}
        key={`${currentLogo}-${resolvedTheme}`}
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
          display: imageError ? 'none' : 'block',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
        loading="eager"
        decoding="async"
      />
      {imageError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.3,
            fontWeight: 'bold',
            color: 'currentColor',
            zIndex: 1,
          }}
        >
          MP
        </div>
      )}
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Settings, Sun, Moon, Monitor, Palette, User, LogOut } from 'lucide-react'
import { AuthManager } from '@/lib/auth'
import ThemeSwitcher from '@/components/ui/ThemeSwitcher'

type Theme = 'light' | 'dark' | 'system'

export default function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('fusioncraft-theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }
    setIsAuthenticated(AuthManager.isAuthenticated())

    const handleAuthChange = () => {
      setIsAuthenticated(AuthManager.isAuthenticated())
    }

    window.addEventListener('authStateChanged', handleAuthChange)
    return () => window.removeEventListener('authStateChanged', handleAuthChange)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const activeTheme = theme === 'system' ? systemTheme : theme

    root.classList.remove('light', 'dark')
    root.classList.add(activeTheme)
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', activeTheme === 'dark' ? '#191919' : '#FEFEFE')
    }

    localStorage.setItem('fusioncraft-theme', theme)
  }, [theme, mounted])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(mediaQuery.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    setIsThemeOpen(false)
  }

  const handleLogout = () => {
    AuthManager.logout()
    setIsOpen(false)
    router.push('/')
  }

  if (!mounted) return null

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun, description: 'Bright and clean interface' },
    { value: 'dark' as const, label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
    { value: 'system' as const, label: 'System', icon: Monitor, description: 'Follows your system preference' }
  ]

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 text-neutral-600 hover:text-primary-700 transition-all duration-200 flex items-center justify-center"
        aria-label="Settings"
        aria-expanded={isOpen}
      >
        <Settings className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 w-64 bg-white dark:bg-primary-800 rounded-xl shadow-xl border border-gray-200 dark:border-primary-700 z-50 overflow-hidden"
            >
              {/* Theme Section */}
              <div className="p-2">
                <button
                  onClick={() => setIsThemeOpen(!isThemeOpen)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-primary-300 hover:bg-gray-50 dark:hover:bg-primary-700/50 transition-colors"
                >
                  <Palette className="w-5 h-5" />
                  <span className="font-medium">Theme</span>
                  <span className="ml-auto text-xs text-gray-500">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                </button>

                <AnimatePresence>
                  {isThemeOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pb-2 space-y-1">
                        {themes.map((themeOption) => {
                          const Icon = themeOption.icon
                          const isActive = theme === themeOption.value
                          
                          return (
                            <motion.button
                              key={themeOption.value}
                              whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleThemeChange(themeOption.value)}
                              className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-all ${
                                isActive 
                                  ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-300' 
                                  : 'text-gray-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-primary-700/50'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{themeOption.label}</span>
                              {isActive && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="w-2 h-2 bg-primary-500 rounded-full ml-auto"
                                />
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border-t border-gray-200 dark:border-primary-700"></div>

              {/* Account Section */}
              <div className="p-2">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        router.push('/account')
                      }}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-primary-300 hover:bg-gray-50 dark:hover:bg-primary-700/50 transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span className="font-medium">Account</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      router.push('/login')
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-primary-300 hover:bg-gray-50 dark:hover:bg-primary-700/50 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">Login / Sign Up</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}


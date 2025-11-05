'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { X, User, AlertCircle } from 'lucide-react'
import { AuthManager } from '@/lib/auth'
import Link from 'next/link'

export default function AccountPromptPopup() {
  const [showPopup, setShowPopup] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const isAuthenticated = AuthManager.isAuthenticated()
    
    // Check if popup was dismissed (with expiration)
    const dismissedTime = localStorage.getItem('account-prompt-dismissed')
    const dismissedUntil = dismissedTime ? parseInt(dismissedTime) : 0
    const isDismissed = Date.now() < dismissedUntil
    
    // Show popup if user is not logged in and hasn't dismissed recently (24 hours)
    if (!isAuthenticated && !isDismissed) {
      // Delay showing popup by 3 seconds
      const timer = setTimeout(() => {
        setShowPopup(true)
      }, 3000)
      
      return () => clearTimeout(timer)
    }

    // Listen for auth changes
    const handleAuthChange = () => {
      if (AuthManager.isAuthenticated()) {
        setShowPopup(false)
      }
    }

    window.addEventListener('authStateChanged', handleAuthChange)
    return () => window.removeEventListener('authStateChanged', handleAuthChange)
  }, [])

  const handleDismiss = () => {
    setShowPopup(false)
    setDismissed(true)
    // Store dismissal for 24 hours
    localStorage.setItem('account-prompt-dismissed', (Date.now() + 24 * 60 * 60 * 1000).toString())
  }

  const handleSignUp = () => {
    setShowPopup(false)
    router.push('/login')
  }

  return (
    <AnimatePresence>
      {showPopup && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-6 max-w-md z-50 border border-neutral-200 dark:border-neutral-700"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-primary-600 dark:text-primary-300" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-primary-800 dark:text-primary-100">
                    Create an Account
                  </h3>
                </div>
                
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Sign up to save your information, track orders, write reviews, and get personalized recommendations!
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    href="/login"
                    onClick={handleSignUp}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg text-center transition-colors"
                  >
                    Sign Up Now
                  </Link>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}


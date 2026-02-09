'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/** Normalize thrown value to Error so we never display "[object Event]" or other non-useful strings. */
function normalizeError(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown
  if (thrown && typeof thrown === 'object' && 'message' in thrown && typeof (thrown as { message: unknown }).message === 'string') {
    return new Error((thrown as { message: string }).message)
  }
  // Event or other object: avoid "[object Event]"
  const str = typeof thrown === 'string' ? thrown : String(thrown)
  return new Error(str === '[object Event]' ? 'An unexpected error occurred' : str)
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: unknown): State {
    const err = normalizeError(error)
    // Don't catch hydration errors - they're usually harmless and resolve on retry
    if (err.message && (err.message.includes('hydration') || err.message.includes('Hydration'))) {
      console.warn('Hydration mismatch detected (non-fatal):', err.message)
      return { hasError: false, error: null }
    }
    return { hasError: true, error: err }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const err = normalizeError(error)
    console.error('ErrorBoundary caught an error:', err, errorInfo)

    if (typeof window !== 'undefined') {
      console.error('Error name:', err.name)
      console.error('Error message:', err.message)
      console.error('Error stack:', err.stack)
      console.error('Component stack:', errorInfo.componentStack)
      if (err.message.includes('hydration') || err.message.includes('Hydration')) {
        console.warn('Hydration error detected - this is usually harmless and will resolve on retry')
      }
    }
    
    // Here you could log to an error reporting service
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-unified p-4">
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-primary-600 dark:text-primary-300 mb-6">
              We encountered an unexpected error. Please try again or return to the homepage.
            </p>
            {(process.env.NODE_ENV === 'development' || typeof window !== 'undefined') && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all mb-2">
                  {this.state.error.message || this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn btn-primary inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link href="/" className="btn btn-secondary">
                Go Home
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}


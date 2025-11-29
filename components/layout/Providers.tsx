'use client'

import { ReactNode } from 'react'
import ThemeProvider from '@/components/layout/ThemeProvider'
import { NotificationProvider } from '@/components/layout/NotificationSystem'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </ThemeProvider>
  )
}


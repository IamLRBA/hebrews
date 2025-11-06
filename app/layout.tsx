import type { Metadata } from 'next'
import '../styles/globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { NotificationProvider } from '@/components/layout/NotificationSystem'
import ThemeProvider from '@/components/layout/ThemeProvider'
import AccountPromptPopup from '@/components/ui/AccountPromptPopup'
import BackToTop from '@/components/ui/BackToTop'
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts'

export const metadata: Metadata = {
  title: 'MysteryPieces - Curated Fashion & Style Curators',
  description: 'Discover hidden treasures in fashion. We curate exceptional pieces that reveal timeless style through sustainable practices.',
  keywords: 'thrifted fashion, vintage clothing, sustainable style, fashion curation, unique finds, style consultation, wardrobe styling, fashion shopping',
  authors: [{ name: 'LRBA', url: 'https://mysterypieces.com' }],
  creator: 'MysteryPieces',
  publisher: 'MysteryPieces',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://mysterypieces.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'MysteryPieces - Curated Fashion & Style Curators',
    description: 'Discover hidden treasures in fashion. We curate exceptional pieces that reveal timeless style through sustainable practices.',
    url: 'https://mysterypieces.com',
    siteName: 'MysteryPieces',
    images: [
      {
        url: '/assets/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'MysteryPieces',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MysteryPieces - Curated Fashion & Style Curators',
    description: 'Discover hidden treasures in fashion. We curate exceptional pieces that reveal timeless style through sustainable practices.',
    images: ['/assets/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏗️</text></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏗️</text></svg>" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <NotificationProvider>
            <Navbar />
            <main>
              {children}
            </main>
            <Footer />
            <AccountPromptPopup />
            <BackToTop />
            <KeyboardShortcuts />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 
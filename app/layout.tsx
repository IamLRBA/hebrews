import type { Metadata } from 'next'
import '../styles/globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { NotificationProvider } from '@/components/layout/NotificationSystem'
import ThemeProvider from '@/components/layout/ThemeProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import StructuredData from '@/components/StructuredData'
import SkipToContent from '@/components/ui/SkipToContent'
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6F4E37" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <StructuredData />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <SkipToContent />
              <Navbar />
              <main id="main-content">
                {children}
              </main>
              <Footer />
              <AccountPromptPopup />
              <BackToTop />
              <KeyboardShortcuts />
            </ErrorBoundary>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
} 
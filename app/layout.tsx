import type { Metadata } from 'next'
import '../styles/globals.css'
import Providers from '@/components/layout/Providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import StructuredData from '@/components/StructuredData'
import ConditionalShell from '@/components/layout/ConditionalShell'

export const metadata: Metadata = {
  title: 'Cafe Havilah & Pizzeria — Luxury Destination Cafe',
  description: 'A luxury destination cafe offering exquisite culinary experiences, artisanal beverages, and refined atmosphere where every moment is crafted with elegance and sophistication.',
  keywords: 'luxury cafe, destination cafe, premium dining, artisanal coffee, gourmet cuisine, elegant dining experience, luxury restaurant, fine dining cafe, Cafe Havilah & Pizzeria',
  authors: [{ name: 'LRBA', url: 'https://mysticalpieces.com' }],
  creator: 'Cafe Havilah & Pizzeria',
  publisher: 'Cafe Havilah & Pizzeria',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://mysticalpieces.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Cafe Havilah & Pizzeria — Luxury Destination Cafe',
    description: 'A luxury destination cafe offering exquisite culinary experiences, artisanal beverages, and refined atmosphere where every moment is crafted with elegance and sophistication.',
    url: 'https://mysticalpieces.com',
    siteName: 'Cafe Havilah & Pizzeria',
    images: [
      {
        url: '/assets/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Cafe Havilah & Pizzeria',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cafe Havilah & Pizzeria — Luxury Destination Cafe',
    description: 'A luxury destination cafe offering exquisite culinary experiences, artisanal beverages, and refined atmosphere where every moment is crafted with elegance and sophistication.',
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
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=MuseoModerno:wght@100;200;300;400;500;600;700;800;900&family=Mrs+Saint+Delafield&family=Zen+Dots&display=swap"
          rel="stylesheet"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {/* Favicons - multiple formats for browser compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6F4E37" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <StructuredData />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <ErrorBoundary>
            <ConditionalShell>{children}</ConditionalShell>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
} 
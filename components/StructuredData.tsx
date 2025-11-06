'use client'

export default function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MysteryPieces',
    url: 'https://mysterypieces.com',
    logo: 'https://mysterypieces.com/assets/images/logo.png',
    description: 'Curated fashion pieces that reveal timeless style through sustainable practices.',
    sameAs: [
      'https://www.instagram.com/mysterypieces',
      'https://www.facebook.com/mysterypieces',
      'https://twitter.com/mysterypieces',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      availableLanguage: 'English',
    },
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MysteryPieces',
    url: 'https://mysterypieces.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://mysterypieces.com/products?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'MysteryPieces',
    image: 'https://mysterypieces.com/assets/images/og-image.jpg',
    description: 'Curated fashion pieces that reveal timeless style through sustainable practices.',
    url: 'https://mysterypieces.com',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema) }}
      />
    </>
  )
}


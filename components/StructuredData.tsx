export default function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cafe Hebrews',
    url: 'https://mysticalpieces.com',
    logo: 'https://mysticalpieces.com/assets/images/logo.png',
    description: 'A luxury destination cafe offering exquisite culinary experiences, artisanal beverages, and refined atmosphere where every moment is crafted with elegance and sophistication.',
    sameAs: [
      'https://www.instagram.com/mysticalpieces',
      'https://www.facebook.com/mysticalpieces',
      'https://twitter.com/mysticalpieces',
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
    name: 'Cafe Hebrews',
    url: 'https://mysticalpieces.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://mysticalpieces.com/products?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const storeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Cafe Hebrews',
    image: 'https://mysticalpieces.com/assets/images/og-image.jpg',
    description: 'A luxury destination cafe offering exquisite culinary experiences, artisanal beverages, and refined atmosphere where every moment is crafted with elegance and sophistication.',
    url: 'https://mysticalpieces.com',
    priceRange: '$$$',
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


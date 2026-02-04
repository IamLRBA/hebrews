'use client'

import { ReactNode } from 'react'

interface MysticalPiecesWordProps {
  className?: string
  mysticalClassName?: string
  piecesClassName?: string
}

export default function MysticalPiecesWord({ className, mysticalClassName, piecesClassName }: MysticalPiecesWordProps) {
  const classes = ['mysticalpieces-word', className].filter(Boolean).join(' ')
  const mysticalClasses = ['mysticalpieces-word__m', mysticalClassName].filter(Boolean).join(' ')
  const piecesClasses = ['mysticalpieces-word__p', piecesClassName].filter(Boolean).join(' ')

  return (
    <span className={classes}>
      <span className={mysticalClasses}>Cafe</span>
      <span className="mysticalpieces-word__space">&nbsp;</span>
      <span className={piecesClasses}>
        Havilah & Pizzeria
        <span className="mysticalpieces-word__symbol" aria-hidden="true">®</span>
      </span>
    </span>
  )
}

export function renderWithMysticalPieces(content: ReactNode, keyPrefix = 'mysticalpieces'): ReactNode {
  // If content is already a React element, return it as-is
  if (typeof content !== 'string') {
    return content
  }

  // If content is a string, apply mystical styling
  const parts = content.split('MysticalPIECES')
  const elements: ReactNode[] = []

  parts.forEach((part, index) => {
    if (part) {
      elements.push(<span key={`${keyPrefix}-text-${index}`}>{part}</span>)
    }
    if (index < parts.length - 1) {
      elements.push(<MysticalPiecesWord key={`${keyPrefix}-brand-${index}`} />)
    }
  })

  // Also handle Cafe Havilah & Pizzeria variations
  const cafeBrandParts = typeof content === 'string' ? content.split('Cafe Havilah & Pizzeria') : []
  if (cafeBrandParts.length > 1) {
    const cafeElements: ReactNode[] = []
    cafeBrandParts.forEach((part, index) => {
      if (part) {
        cafeElements.push(<span key={`${keyPrefix}-cafe-text-${index}`}>{part}</span>)
      }
      if (index < cafeBrandParts.length - 1) {
        cafeElements.push(<MysticalPiecesWord key={`${keyPrefix}-cafe-brand-${index}`} />)
      }
    })
    return cafeElements.length > 0 ? cafeElements : elements
  }

  return elements
}


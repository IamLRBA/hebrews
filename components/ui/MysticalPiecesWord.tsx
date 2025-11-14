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
      <span className={mysticalClasses}>Mystical</span>
      <span className="mysticalpieces-word__space">&nbsp;</span>
      <span className={piecesClasses}>
        PIECE
        <span className="mysticalpieces-word__s">
          S
          <span className="mysticalpieces-word__symbol" aria-hidden="true">®</span>
        </span>
      </span>
    </span>
  )
}

export function renderWithMysticalPieces(text: string, keyPrefix = 'mysticalpieces'): ReactNode[] {
  const parts = text.split('MysticalPIECES')
  const elements: ReactNode[] = []

  parts.forEach((part, index) => {
    if (part) {
      elements.push(<span key={`${keyPrefix}-text-${index}`}>{part}</span>)
    }
    if (index < parts.length - 1) {
      elements.push(<MysticalPiecesWord key={`${keyPrefix}-brand-${index}`} />)
    }
  })

  return elements
}


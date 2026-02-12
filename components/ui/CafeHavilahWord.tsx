'use client'

type CafeHavilahWordProps = {
  className?: string
}

/**
 * Renders the cafe name "Cafe Havilah & Pizzeria" with stylized fonts:
 * - "Cafe Havilah" and "Pizzeria" in straight font (MuseoModerno)
 * - "&" in cursive (Mrs Saint Delafield)
 */
export default function CafeHavilahWord({ className }: CafeHavilahWordProps) {
  return (
    <span className={`cafe-havilah-word ${className ?? ''}`.trim()}>
      <span className="cafe-havilah-word__straight">Cafe Havilah</span>
      <span className="cafe-havilah-word__cursive">  &  </span>
      <span className="cafe-havilah-word__straight"> Pizzeria</span>
    </span>
  )
}

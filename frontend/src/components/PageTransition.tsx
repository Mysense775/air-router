import { useLayoutEffect, useRef, ReactNode } from 'react'
import { gsap } from 'gsap'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pageRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!pageRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      gsap.set(pageRef.current, { opacity: 1 })
      return
    }

    // Set initial state immediately (before paint)
    gsap.set(pageRef.current, { opacity: 0, y: 20 })

    // Animate entrance
    gsap.to(pageRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: 'power2.out'
    })
  }, [])

  return (
    <div ref={pageRef}>
      {children}
    </div>
  )
}

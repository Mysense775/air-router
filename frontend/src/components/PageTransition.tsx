import { useLayoutEffect, useRef, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
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
      duration: 0.5,
      ease: 'power2.out',
      delay: 0.1
    })
  }, [location.pathname])

  return (
    <div ref={pageRef}>
      {children}
    </div>
  )
}

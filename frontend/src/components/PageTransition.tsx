import { useEffect, useRef, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap } from 'gsap'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const pageRef = useRef<HTMLDivElement>(null)
  const prevLocation = useRef(location.pathname)

  useEffect(() => {
    if (!pageRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    // Animate entrance
    gsap.fromTo(
      pageRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    )

    prevLocation.current = location.pathname
  }, [location.pathname])

  return (
    <div ref={pageRef} style={{ opacity: 0 }}>
      {children}
    </div>
  )
}

import { useRef, useEffect, ReactNode } from 'react'
import { gsap } from 'gsap'

interface HoverCardProps {
  children: ReactNode
  className?: string
  glowColor?: string
}

export function HoverCard({
  children,
  className = '',
  glowColor = 'rgba(59, 130, 246, 0.15)', // blue glow
}: HoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleMouseEnter = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(card, {
        scale: 1.02,
        y: -4,
        boxShadow: `0 20px 40px ${glowColor}`,
        borderColor: '#3b82f6',
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(card, {
        scale: 1,
        y: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderColor: '#e5e7eb',
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
      tweenRef.current?.kill()
    }
  }, [glowColor])

  return (
    <div ref={cardRef} className={className}>
      {children}
    </div>
  )
}

interface HoverStatCardProps {
  children: ReactNode
  className?: string
  color?: 'blue' | 'green' | 'pink' | 'orange' | 'purple'
}

export function HoverStatCard({
  children,
  className = '',
  color = 'blue',
}: HoverStatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const glowColors = {
    blue: 'rgba(59, 130, 246, 0.15)',
    green: 'rgba(34, 197, 94, 0.15)',
    pink: 'rgba(236, 72, 153, 0.15)',
    orange: 'rgba(249, 115, 22, 0.15)',
    purple: 'rgba(168, 85, 247, 0.15)',
  }

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleMouseEnter = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(card, {
        scale: 1.02,
        y: -4,
        boxShadow: `0 20px 40px ${glowColors[color]}`,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(card, {
        scale: 1,
        y: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
      tweenRef.current?.kill()
    }
  }, [color])

  return (
    <div ref={cardRef} className={className}>
      {children}
    </div>
  )
}

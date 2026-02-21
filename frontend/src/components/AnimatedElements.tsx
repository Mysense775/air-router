import { useRef, useEffect, ReactNode } from 'react'
import { gsap } from 'gsap'

interface AnimatedButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  scale?: number
  glowColor?: string
}

export function AnimatedButton({
  children,
  className = '',
  onClick,
  scale = 1.02,
  glowColor = 'rgba(99, 102, 241, 0.2)',
}: AnimatedButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleMouseEnter = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(button, {
        scale,
        boxShadow: `0 8px 32px ${glowColor}`,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(button, {
        scale: 1,
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    button.addEventListener('mouseenter', handleMouseEnter)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter)
      button.removeEventListener('mouseleave', handleMouseLeave)
      tweenRef.current?.kill()
    }
  }, [scale, glowColor])

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  )
}

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  glowColor?: string
}

export function AnimatedCard({
  children,
  className = '',
  onClick,
  glowColor = 'rgba(99, 102, 241, 0.15)',
}: AnimatedCardProps) {
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
        boxShadow: `0 12px 40px ${glowColor}`,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(card, {
        scale: 1,
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
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

  if (onClick) {
    return (
      <div
        ref={cardRef}
        onClick={onClick}
        className={className}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>
    )
  }

  return (
    <div ref={cardRef} className={className}>
      {children}
    </div>
  )
}

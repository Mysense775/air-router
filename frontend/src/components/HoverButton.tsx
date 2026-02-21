import { useRef, useEffect, ReactNode } from 'react'
import { gsap } from 'gsap'

interface HoverButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  glowColor?: string
  lift?: number
  'aria-label'?: string
}

export function HoverButton({
  children,
  className = '',
  onClick,
  glowColor = 'rgba(59, 130, 246, 0.2)',
  lift = -4,
  'aria-label': ariaLabel,
}: HoverButtonProps) {
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
        scale: 1.03,
        y: lift,
        boxShadow: `0 12px 30px ${glowColor}`,
        duration: 0.25,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(button, {
        scale: 1,
        y: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        duration: 0.25,
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
  }, [glowColor, lift])

  return (
    <button ref={buttonRef} onClick={onClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  )
}

interface HoverPaymentCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  isSelected?: boolean
  color?: 'orange' | 'blue'
  'aria-pressed'?: boolean
  'aria-label'?: string
}

export function HoverPaymentCard({
  children,
  className = '',
  onClick,
  isSelected = false,
  color = 'blue',
  'aria-pressed': ariaPressed,
  'aria-label': ariaLabel,
}: HoverPaymentCardProps) {
  const cardRef = useRef<HTMLButtonElement>(null)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  const glowColors = {
    orange: 'rgba(249, 115, 22, 0.25)',
    blue: 'rgba(59, 130, 246, 0.25)',
  }

  useEffect(() => {
    const card = cardRef.current
    if (!card || isSelected) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleMouseEnter = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(card, {
        scale: 1.02,
        y: -4,
        boxShadow: `0 16px 40px ${glowColors[color]}`,
        duration: 0.25,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      tweenRef.current?.kill()
      tweenRef.current = gsap.to(card, {
        scale: 1,
        y: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        duration: 0.25,
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
  }, [color, isSelected])

  return (
    <button ref={cardRef} onClick={onClick} className={className} aria-pressed={ariaPressed} aria-label={ariaLabel}>
      {children}
    </button>
  )
}

import { useEffect, useRef, ReactNode } from 'react'
import { gsap } from 'gsap'

interface AnimatedModalProps {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function AnimatedModal({ children, isOpen, onClose, className = '' }: AnimatedModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overlayRef.current || !modalRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden'

      if (prefersReducedMotion) {
        gsap.set(overlayRef.current, { opacity: 1 })
        gsap.set(modalRef.current, { opacity: 1, scale: 1, y: 0 })
        return
      }

      // Animate in - overlay first
      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      })

      // Then modal with scale
      gsap.to(modalRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
        delay: 0.1
      })
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      style={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={className}
        style={{ opacity: 0, transform: 'scale(0.95) translateY(20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// Success checkmark animation
export function AnimatedCheckmark({ size = 64, animate = true }: { size?: number; animate?: boolean }) {
  const checkRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!checkRef.current || !animate) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const circle = checkRef.current.querySelector('.check-circle')
    const path = checkRef.current.querySelector('.check-path')

    if (prefersReducedMotion) {
      gsap.set([circle, path], { opacity: 1, strokeDashoffset: 0, scale: 1 })
      return
    }

    // Reset initial state
    gsap.set(circle, { opacity: 0, scale: 0 })
    gsap.set(path, { opacity: 0, strokeDashoffset: 50 })

    // Animate circle first
    gsap.to(circle, {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(2)',
      delay: 0.3
    })

    // Then animate check path
    if (path) {
      const length = (path as SVGPathElement).getTotalLength?.() || 50
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 })
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.5,
      })
    }
  }, [animate])

  return (
    <svg
      ref={checkRef}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        className="check-circle"
        cx="32"
        cy="32"
        r="28"
        stroke="#22c55e"
        strokeWidth="3"
        fill="none"
      />
      <path
        className="check-path"
        d="M20 32 L28 40 L44 24"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

// Shake animation for errors
export function useShake() {
  const elementRef = useRef<HTMLElement>(null)

  const shake = () => {
    if (!elementRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    gsap.to(elementRef.current, {
      x: "+=10",
      duration: 0.1,
      repeat: 5,
      yoyo: true,
      ease: 'power2.inOut',
    })
  }

  return { ref: elementRef, shake }
}

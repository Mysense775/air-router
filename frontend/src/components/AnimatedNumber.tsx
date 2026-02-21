import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

interface AnimatedNumberProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 1.5,
  className = '',
}: AnimatedNumberProps) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const [displayValue, setDisplayValue] = useState(value)
  const previousValue = useRef(value)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (value === previousValue.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setDisplayValue(value)
      previousValue.current = value
      return
    }

    // Kill previous animation
    tweenRef.current?.kill()

    const obj = { value: previousValue.current }

    tweenRef.current = gsap.to(obj, {
      value: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayValue(obj.value)
      },
      onComplete: () => {
        setDisplayValue(value)
        previousValue.current = value
      },
    })

    return () => {
      tweenRef.current?.kill()
    }
  }, [value, duration])

  const formattedValue = displayValue.toFixed(decimals)

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formattedValue}{suffix}
    </span>
  )
}

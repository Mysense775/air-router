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
  const [displayValue, setDisplayValue] = useState(0)
  const previousValue = useRef(0)
  const hasAnimated = useRef(false)
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setDisplayValue(value)
      previousValue.current = value
      hasAnimated.current = true
      return
    }

    // Kill previous animation
    tweenRef.current?.kill()

    const startValue = hasAnimated.current ? previousValue.current : 0
    const obj = { value: startValue }

    tweenRef.current = gsap.to(obj, {
      value: value,
      duration: hasAnimated.current ? 0.5 : duration,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayValue(obj.value)
      },
      onComplete: () => {
        setDisplayValue(value)
        previousValue.current = value
        hasAnimated.current = true
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

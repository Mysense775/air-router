import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export function useStaggerAnimation<T extends HTMLElement>(
  items: unknown[],
  options: {
    y?: number
    opacity?: number
    duration?: number
    stagger?: number
    delay?: number
  } = {}
) {
  const containerRef = useRef<T>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!containerRef.current || hasAnimated.current || items.length === 0) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (prefersReducedMotion) {
      hasAnimated.current = true
      return
    }

    const children = containerRef.current.children
    if (children.length === 0) return

    gsap.fromTo(
      children,
      {
        y: options.y ?? 30,
        opacity: options.opacity ?? 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: options.duration ?? 0.5,
        stagger: options.stagger ?? 0.05,
        delay: options.delay ?? 0.1,
        ease: 'power2.out',
        onComplete: () => {
          hasAnimated.current = true
        },
      }
    )

    return () => {
      // Cleanup only if animation is still running
      if (!hasAnimated.current) {
        gsap.killTweensOf(children)
      }
    }
  }, [items, options.y, options.opacity, options.duration, options.stagger, options.delay])

  return containerRef
}

export function useHoverAnimation<T extends HTMLElement>(
  scale: number = 1.02,
  shadow: string = '0 8px 32px rgba(99,102,241,0.2)'
) {
  const elementRef = useRef<T>(null)
  const animationRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const handleMouseEnter = () => {
      animationRef.current?.kill()
      animationRef.current = gsap.to(element, {
        scale,
        boxShadow: shadow,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      animationRef.current?.kill()
      animationRef.current = gsap.to(element, {
        scale: 1,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      animationRef.current?.kill()
    }
  }, [scale, shadow])

  return elementRef
}

export function useCountUp(
  endValue: number,
  duration: number = 1.5,
  delay: number = 0.2
) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!elementRef.current || hasAnimated.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    
    if (prefersReducedMotion) {
      elementRef.current.textContent = endValue.toFixed(2)
      hasAnimated.current = true
      return
    }

    const obj = { value: 0 }
    
    gsap.to(obj, {
      value: endValue,
      duration,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        if (elementRef.current) {
          elementRef.current.textContent = obj.value.toFixed(2)
        }
      },
      onComplete: () => {
        hasAnimated.current = true
        if (elementRef.current) {
          elementRef.current.textContent = endValue.toFixed(2)
        }
      },
    })

    return () => {
      gsap.killTweensOf(obj)
    }
  }, [endValue, duration, delay])

  return elementRef
}

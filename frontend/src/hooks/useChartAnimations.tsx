import { useEffect, useRef, ReactNode } from 'react'
import { gsap } from 'gsap'

export function useAnimatedLine() {
  const pathRef = useRef<SVGPathElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!pathRef.current || hasAnimated.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      hasAnimated.current = true
      return
    }

    const path = pathRef.current
    const length = path.getTotalLength()

    // Set initial state
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    })

    // Animate drawing
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.5,
      ease: 'power2.out',
      delay: 0.3,
      onComplete: () => {
        hasAnimated.current = true
      },
    })

    return () => {
      gsap.killTweensOf(path)
    }
  }, [])

  return pathRef
}

interface AnimatedBarProps {
  dataLength: number
}

export function useAnimatedBars({ dataLength }: AnimatedBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!containerRef.current || hasAnimated.current || dataLength === 0) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      hasAnimated.current = true
      return
    }

    // Find all rect elements (bars) in the chart
    const timer = setTimeout(() => {
      const bars = containerRef.current?.querySelectorAll('.recharts-bar-rectangle path')
      if (!bars || bars.length === 0) return

      // Set initial state
      gsap.set(bars, { scaleY: 0, transformOrigin: 'bottom' })

      // Animate bars growing up
      gsap.to(bars, {
        scaleY: 1,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power2.out',
        delay: 0.2,
        onComplete: () => {
          hasAnimated.current = true
        },
      })
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [dataLength])

  return containerRef
}

// Component wrapper for animated chart container
interface AnimatedChartContainerProps {
  children: ReactNode
  className?: string
  type: 'line' | 'bar'
  dataLength: number
}

export function AnimatedChartContainer({
  children,
  className = '',
  type,
  dataLength,
}: AnimatedChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!containerRef.current || hasAnimated.current || dataLength === 0) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      hasAnimated.current = true
      return
    }

    const container = containerRef.current

    // Set initial state - fade in container
    gsap.set(container, { opacity: 0, y: 20 })

    // Animate container appearing
    gsap.to(container, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        // After container appears, animate chart elements
        if (type === 'line') {
          const path = container.querySelector('.recharts-line-curve')
          if (path) {
            const length = (path as SVGPathElement).getTotalLength?.() || 1000
            gsap.set(path, {
              strokeDasharray: length,
              strokeDashoffset: length,
            })
            gsap.to(path, {
              strokeDashoffset: 0,
              duration: 1.5,
              ease: 'power2.out',
            })
          }
        } else if (type === 'bar') {
          const bars = container.querySelectorAll('.recharts-bar-rectangle path')
          if (bars.length > 0) {
            gsap.set(bars, { scaleY: 0, transformOrigin: 'bottom' })
            gsap.to(bars, {
              scaleY: 1,
              duration: 0.5,
              stagger: 0.05,
              ease: 'power2.out',
            })
          }
        }
        hasAnimated.current = true
      },
    })

    return () => {
      gsap.killTweensOf(container)
    }
  }, [type, dataLength])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

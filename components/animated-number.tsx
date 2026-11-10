"use client"

import { useEffect, useRef, useState } from "react"
import { animate, useReducedMotion } from "motion/react"

/** Número que conta até o novo valor quando muda (sem animação com "reduzir movimento"). */
export function AnimatedNumber({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (reduce) {
      from.current = value
      setDisplay(value)
      return
    }
    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    from.current = value
    return () => controls.stop()
  }, [value, reduce])

  return (
    <span className="tabular-nums" aria-label={format(value)}>
      <span aria-hidden="true">{format(display)}</span>
    </span>
  )
}

"use client"

import { useEffect, useRef, type RefObject } from "react"

// Pilha de modais abertos: Esc fecha só o do topo (modal sobre modal).
const stack: symbol[] = []

/**
 * Comportamento padrão de diálogo: Esc fecha, foco vai para o painel ao abrir e volta
 * para o elemento anterior ao fechar, e a página de fundo não rola.
 * Retorna a ref para colocar no painel (role="dialog").
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void): RefObject<T | null> {
  const panelRef = useRef<T | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const id = Symbol("modal")
    stack.push(id)
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel || panel.contains(document.activeElement)) return
      const autofocus = panel.querySelector<HTMLElement>("[autofocus], [data-autofocus]")
      ;(autofocus ?? panel).focus({ preventScroll: true })
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || stack[stack.length - 1] !== id) return
      e.preventDefault()
      onCloseRef.current()
    }
    document.addEventListener("keydown", onKey)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener("keydown", onKey)
      stack.splice(stack.indexOf(id), 1)
      if (stack.length === 0) document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [open])

  return panelRef
}

"use client"

import { useEffect, useRef } from "react"
import type { ViewId } from "./context"

/** Atalhos "g + tecla" para navegar. Mantido aqui para o painel de ajuda listar a mesma fonte. */
export const GOTO_KEYS: { key: string; view: ViewId; label: string }[] = [
  { key: "d", view: "dashboard", label: "Dashboard" },
  { key: "i", view: "inbox", label: "Caixa de entrada" },
  { key: "m", view: "my-tasks", label: "Minhas tarefas" },
  { key: "k", view: "kanban", label: "Quadro Kanban" },
  { key: "p", view: "projects", label: "Projetos" },
  { key: "u", view: "meetings", label: "Reuniões" },
  { key: "h", view: "time-log", label: "Registro de horas" },
  { key: "f", view: "closing", label: "Fechamento do dia" },
  { key: "r", view: "reports", label: "Relatórios" },
  { key: "c", view: "settings", label: "Configurações" },
]

export const ACTION_KEYS: { keys: string; label: string }[] = [
  { keys: "N", label: "Nova tarefa" },
  { keys: "T", label: "Iniciar / pausar o timer" },
  { keys: "/", label: "Buscar (ou Ctrl K)" },
  { keys: "?", label: "Mostrar atalhos" },
  { keys: "Esc", label: "Fechar janela" },
]

type Handlers = {
  go: (view: ViewId) => void
  search: () => void
  help: () => void
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
}

/** Atalhos globais. Não disparam enquanto se digita nem com uma janela (diálogo) aberta. */
export function useShortcuts(enabled: boolean, handlers: Handlers) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })

  useEffect(() => {
    if (!enabled) return
    let gPressedAt = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const dialogOpen = !!document.querySelector('[role="dialog"]')
      const key = e.key.toLowerCase()

      if (e.key === "?") {
        e.preventDefault()
        ref.current.help()
        return
      }
      if (dialogOpen) return

      if (Date.now() - gPressedAt < 1200) {
        gPressedAt = 0
        const target = GOTO_KEYS.find((g) => g.key === key)
        if (target) {
          e.preventDefault()
          ref.current.go(target.view)
        }
        return
      }
      if (key === "g") {
        gPressedAt = Date.now()
        return
      }
      if (key === "n") {
        e.preventDefault()
        window.dispatchEvent(new Event("octho:new-task"))
      } else if (key === "t") {
        e.preventDefault()
        window.dispatchEvent(new Event("octho:toggle-timer"))
      } else if (e.key === "/") {
        e.preventDefault()
        ref.current.search()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [enabled])
}

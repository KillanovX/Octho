"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Search, X } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useApp, timeAgo } from "@/lib/context"
import { Task, columns } from "@/lib/data"

interface SearchModalProps {
  open: boolean
  onClose: () => void
  onSelectTask: (task: Task) => void
}

const priorityLabels: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Urgente", color: "text-red-400", dot: "bg-red-400" },
  high: { label: "Alta", color: "text-orange-400", dot: "bg-orange-400" },
  medium: { label: "Média", color: "text-yellow-400", dot: "bg-yellow-400" },
  low: { label: "Baixa", color: "text-blue-400", dot: "bg-blue-400" },
  none: { label: "—", color: "text-muted-foreground", dot: "bg-muted-foreground" },
}

const avatarMap: Record<string, string> = {
  MA: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
  FA: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
  JS: "https://images.shadcnspace.com/assets/profiles/user-2.jpg",
  RP: "https://images.shadcnspace.com/assets/profiles/user-4.jpg",
}

export function SearchModal({ open, onClose, onSelectTask }: SearchModalProps) {
  const { userData } = useApp()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      const t = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // ESC key closes the modal
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Global Ctrl+K / Meta+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        if (open) {
          onClose()
        }
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  // Filter tasks
  const normalizedQuery = query.toLowerCase().trim()
  const filtered = userData.tasks.filter((task) => {
    if (!normalizedQuery) return true
    return (
      task.title.toLowerCase().includes(normalizedQuery) ||
      task.code.toLowerCase().includes(normalizedQuery)
    )
  })

  // Arrow key navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        const task = filtered[activeIndex]
        if (task) handleSelect(task)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, filtered, activeIndex])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const getColumnName = (columnId: string) =>
    columns.find((c) => c.id === columnId)?.name ?? columnId

  const handleSelect = useCallback(
    (task: Task) => {
      onSelectTask(task)
      onClose()
    },
    [onSelectTask, onClose]
  )

  // Highlight matching text
  const highlight = (text: string) => {
    if (!normalizedQuery) return <span>{text}</span>
    const idx = text.toLowerCase().indexOf(normalizedQuery)
    if (idx === -1) return <span>{text}</span>
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-primary rounded-sm px-0.5">{text.slice(idx, idx + normalizedQuery.length)}</mark>
        {text.slice(idx + normalizedQuery.length)}
      </span>
    )
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      aria-label="Fechar busca"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="mx-auto mt-[15vh] w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl shadow-black/25 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="size-5 shrink-0 text-primary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarefas pelo título ou código..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded-lg border border-border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tente outro termo de busca</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((task, i) => {
                const pConfig = priorityLabels[task.priority]
                const isActive = i === activeIndex
                return (
                  <button
                    key={task.id}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => handleSelect(task)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-100 ${
                      isActive ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    <Avatar className="size-7 shrink-0 border border-border">
                      {avatarMap[task.assignee] && <AvatarImage src={avatarMap[task.assignee]} alt={task.assignee} />}
                      <AvatarFallback style={{ backgroundColor: task.assigneeColor, color: "#fff" }} className="text-[10px] font-bold">
                        {task.assignee}
                      </AvatarFallback>
                    </Avatar>

                    {/* Task Info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-md">
                          {task.code}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {highlight(task.title)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{getColumnName(task.column)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <span className={`size-1.5 rounded-full ${pConfig?.dot}`} />
                          <span className={pConfig?.color}>{pConfig?.label}</span>
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-md border border-border bg-muted opacity-0 transition-opacity ${isActive ? "opacity-100" : "group-hover:opacity-100"}`}>
                      ↵
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground bg-muted/20">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              selecionar
            </span>
          </span>
          <span>{filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  )
}

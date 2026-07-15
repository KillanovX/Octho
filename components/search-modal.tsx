"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Search } from "lucide-react"
import { useApp, timeAgo } from "@/lib/context"
import { Task, columns } from "@/lib/data"

interface SearchModalProps {
  open: boolean
  onClose: () => void
  onSelectTask: (task: Task) => void
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "text-red-400" },
  high: { label: "Alta", color: "text-orange-400" },
  medium: { label: "Média", color: "text-yellow-400" },
  low: { label: "Baixa", color: "text-blue-400" },
  none: { label: "—", color: "text-muted-foreground" },
}

export function SearchModal({ open, onClose, onSelectTask }: SearchModalProps) {
  const { userData } = useApp()
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery("")
      // Small delay to ensure DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 50)
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

  const getColumnName = (columnId: string) =>
    columns.find((c) => c.id === columnId)?.name ?? columnId

  const handleSelect = useCallback(
    (task: Task) => {
      onSelectTask(task)
      onClose()
    },
    [onSelectTask, onClose]
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      aria-label="Fechar busca"
    >
      <div
        className="mx-auto mt-[20vh] w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarefas..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Nenhuma tarefa encontrada
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filtered.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleSelect(task)}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  {/* Assignee Avatar */}
                  <div
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: task.assigneeColor }}
                  >
                    {task.assignee}
                  </div>

                  {/* Task Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {task.code}
                      </span>
                      <span className="truncate text-sm text-foreground group-hover:text-accent-foreground">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{getColumnName(task.column)}</span>
                      <span>·</span>
                      <span className={priorityLabels[task.priority]?.color}>
                        {priorityLabels[task.priority]?.label}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>
            {filtered.length} tarefa{filtered.length !== 1 ? "s" : ""}
          </span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>{" "}
            selecionar
          </span>
        </div>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { Task, ColumnId, Priority, Label, columns } from "@/lib/data"
import { useApp } from "@/lib/context"

// ─── Available labels ───────────────────────────────────────
const availableLabels: Label[] = [
  { name: "Design", color: "#8b5cf6" },
  { name: "Frontend", color: "#3b82f6" },
  { name: "Backend", color: "#10b981" },
  { name: "Bug", color: "#ef4444" },
  { name: "Conteúdo", color: "#f59e0b" },
  { name: "Pesquisa", color: "#14b8a6" },
]

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
  { value: "none", label: "Sem" },
]

// ─── Props ──────────────────────────────────────────────────
type TaskModalProps = {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultColumn?: ColumnId
}

export default function TaskModal({ open, onClose, task, defaultColumn }: TaskModalProps) {
  const { addTask, updateTask, deleteTask, currentUser } = useApp()

  const isEdit = !!task

  // ── Form state ──
  const [title, setTitle] = useState("")
  const [column, setColumn] = useState<ColumnId>(defaultColumn ?? "backlog")
  const [priority, setPriority] = useState<Priority>("none")
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([])
  const [assignee, setAssignee] = useState("")
  const [estimate, setEstimate] = useState<number>(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Reset form when modal opens / task changes ──
  useEffect(() => {
    if (!open) {
      setConfirmDelete(false)
      return
    }
    if (task) {
      setTitle(task.title)
      setColumn(task.column)
      setPriority(task.priority)
      setSelectedLabels(task.labels)
      setAssignee(task.assignee)
      setEstimate(task.estimate)
    } else {
      setTitle("")
      setColumn(defaultColumn ?? "backlog")
      setPriority("none")
      setSelectedLabels([])
      setAssignee(currentUser.avatar)
      setEstimate(0)
    }
    setConfirmDelete(false)
  }, [open, task, defaultColumn, currentUser.avatar])

  // ── ESC key ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, handleKeyDown])

  // ── Label toggle ──
  const toggleLabel = (label: Label) => {
    setSelectedLabels((prev) => {
      const exists = prev.some((l) => l.name === label.name)
      return exists ? prev.filter((l) => l.name !== label.name) : [...prev, label]
    })
  }

  // ── Submit ──
  const handleSave = () => {
    if (!title.trim()) return

    if (isEdit && task) {
      updateTask(task.id, {
        title: title.trim(),
        column,
        priority,
        labels: selectedLabels,
        assignee: assignee.trim() || currentUser.avatar,
        estimate,
      })
    } else {
      addTask({
        title: title.trim(),
        column,
        priority,
        labels: selectedLabels,
        assignee: assignee.trim() || currentUser.avatar,
        assigneeColor: currentUser.avatarColor,
        hoursLogged: 0,
        estimate,
      })
    }
    onClose()
  }

  // ── Delete ──
  const handleDelete = () => {
    if (!task) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteTask(task.id)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* ── Card ── */}
        <div
          className="relative w-full max-w-lg mx-4 rounded-xl bg-card border border-border shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Title */}
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {isEdit ? "Editar tarefa" : "Nova tarefa"}
          </h2>

          {/* ── Form ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
            className="space-y-5"
          >
            {/* Título */}
            <div className="space-y-1.5">
              <label htmlFor="task-title" className="text-sm font-medium text-foreground">
                Título
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descreva a tarefa..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>

            {/* Coluna + Prioridade (row) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Coluna */}
              <div className="space-y-1.5">
                <label htmlFor="task-column" className="text-sm font-medium text-foreground">
                  Coluna
                </label>
                <select
                  id="task-column"
                  value={column}
                  onChange={(e) => setColumn(e.target.value as ColumnId)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow appearance-none"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div className="space-y-1.5">
                <label htmlFor="task-priority" className="text-sm font-medium text-foreground">
                  Prioridade
                </label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow appearance-none"
                >
                  {priorityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Labels</span>
              <div className="flex flex-wrap gap-2">
                {availableLabels.map((label) => {
                  const isSelected = selectedLabels.some((l) => l.name === label.name)
                  return (
                    <button
                      key={label.name}
                      type="button"
                      onClick={() => toggleLabel(label)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all duration-150 ${
                        isSelected
                          ? "border-transparent text-white shadow-sm"
                          : "border-border text-muted-foreground hover:text-foreground bg-background"
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: label.color }
                          : undefined
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Responsável + Horas (row) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Responsável */}
              <div className="space-y-1.5">
                <label htmlFor="task-assignee" className="text-sm font-medium text-foreground">
                  Responsável
                </label>
                <input
                  id="task-assignee"
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="FA"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow uppercase"
                />
              </div>

              {/* Horas estimadas */}
              <div className="space-y-1.5">
                <label htmlFor="task-estimate" className="text-sm font-medium text-foreground">
                  Horas estimadas
                </label>
                <input
                  id="task-estimate"
                  type="number"
                  min={0}
                  step={0.5}
                  value={estimate}
                  onChange={(e) => setEstimate(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-between pt-2">
              {/* Delete (edit mode only) */}
              <div>
                {isEdit && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className={`text-sm font-medium transition-colors ${
                      confirmDelete
                        ? "text-red-500 hover:text-red-400"
                        : "text-muted-foreground hover:text-red-500"
                    }`}
                  >
                    {confirmDelete ? "Tem certeza?" : "Excluir"}
                  </button>
                )}
              </div>

              {/* Save */}
              <button
                type="submit"
                className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

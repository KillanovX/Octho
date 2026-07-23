"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  X,
  AlertTriangle,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Minus,
  Tag as TagIconHeader,
  Plus,
  User as UserIcon,
} from "lucide-react"
import { Task, ColumnId, Priority, Tag, columns } from "@/lib/data"
import { useApp, UserProfile } from "@/lib/context"
import { Select, SelectOption } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { getRegisteredUsers } from "@/lib/auth-service"
import { getStoredTags, saveStoredTags, TagItem } from "@/lib/tags-service"
import { TagManagerModal, tagIconMap } from "@/components/tag-manager-modal"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const columnOptions: SelectOption<ColumnId>[] = columns.map((col) => ({
  value: col.id,
  label: col.name,
  icon: (
    <span
      className={cn(
        "size-2.5 rounded-full shrink-0",
        col.id === "backlog"
          ? "bg-muted-foreground"
          : col.id === "todo"
          ? "bg-chart-2"
          : col.id === "in_progress"
          ? "bg-chart-3"
          : "bg-chart-4"
      )}
    />
  ),
}))

const priorityOptionsList: SelectOption<Priority>[] = [
  {
    value: "urgent",
    label: "Urgente",
    icon: <AlertTriangle className="size-4 text-destructive shrink-0" />,
  },
  {
    value: "high",
    label: "Alta",
    icon: <SignalHigh className="size-4 text-chart-5 shrink-0" />,
  },
  {
    value: "medium",
    label: "Média",
    icon: <SignalMedium className="size-4 text-chart-3 shrink-0" />,
  },
  {
    value: "low",
    label: "Baixa",
    icon: <SignalLow className="size-4 text-chart-2 shrink-0" />,
  },
  {
    value: "none",
    label: "Sem prioridade",
    icon: <Minus className="size-4 text-muted-foreground shrink-0" />,
  },
]

type TaskModalProps = {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultColumn?: ColumnId
}

export function TaskModal({ open, onClose, task, defaultColumn }: TaskModalProps) {
  const { addTask, updateTask, deleteTask, currentUser, profilesList } = useApp()

  const isEdit = !!task

  // ── Form state ──
  const [title, setTitle] = useState("")
  const [column, setColumn] = useState<ColumnId>(defaultColumn ?? "backlog")
  const [priority, setPriority] = useState<Priority>("none")
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [assigneeEmail, setAssigneeEmail] = useState<string>("")
  const [estimate, setEstimate] = useState<number>(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Tags & Tag Manager Modal state ──
  const [availableTags, setAvailableTags] = useState<TagItem[]>([])
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false)

  // ── Users list for Responsável Select ──
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])

  const loadAllUsers = useCallback(() => {
    const map = new Map<string, UserProfile>()
    if (currentUser?.email) {
      map.set(currentUser.email.toLowerCase(), currentUser)
    }
    profilesList.forEach((p) => {
      if (p.email) map.set(p.email.toLowerCase(), p)
    })
    const registered = getRegisteredUsers()
    registered.forEach((u) => {
      if (u.email && !map.has(u.email.toLowerCase())) {
        map.set(u.email.toLowerCase(), {
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          avatarColor: u.avatarColor || "#6366f1",
          verified: true,
        })
      }
    })
    setAllUsers(Array.from(map.values()))
  }, [currentUser, profilesList])

  // ── Reset form when modal opens / task changes ──
  useEffect(() => {
    if (!open) {
      setConfirmDelete(false)
      return
    }

    loadAllUsers()
    setAvailableTags(getStoredTags())

    if (task) {
      setTitle(task.title)
      setColumn(task.column)
      setPriority(task.priority)
      setSelectedTags(task.labels || [])
      setAssigneeEmail(task.assignee || currentUser.name)
      setEstimate(task.estimate)
    } else {
      setTitle("")
      setColumn(defaultColumn ?? "backlog")
      setPriority("none")
      setSelectedTags([])
      setAssigneeEmail(currentUser.name || currentUser.email)
      setEstimate(0)
    }
    setConfirmDelete(false)
  }, [open, task, defaultColumn, currentUser, loadAllUsers])

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

  // ── Tag toggle ──
  const toggleTag = (tag: TagItem) => {
    setSelectedTags((prev) => {
      const exists = prev.some((l) => l.name === tag.name)
      return exists ? prev.filter((l) => l.name !== tag.name) : [...prev, { name: tag.name, color: tag.color, icon: tag.icon }]
    })
  }

  const handleUpdateTags = (newTags: TagItem[]) => {
    setAvailableTags(newTags)
    saveStoredTags(newTags)
  }

  // ── Submit ──
  const handleSave = () => {
    if (!title.trim()) return

    const selectedUser = allUsers.find(
      (u) => u.email.toLowerCase() === assigneeEmail.toLowerCase() || u.name === assigneeEmail
    ) || currentUser

    const assigneeName = selectedUser.name || currentUser.name
    const assigneeAvatar = selectedUser.avatar || selectedUser.name.slice(0, 2).toUpperCase()
    const assigneeColor = selectedUser.avatarColor || "#6366f1"

    if (isEdit && task) {
      updateTask(task.id, {
        title: title.trim(),
        column,
        priority,
        labels: selectedTags,
        assignee: assigneeName,
        assigneeName,
        assigneeAvatar,
        assigneeColor,
        estimate,
      })
    } else {
      addTask({
        title: title.trim(),
        column,
        priority,
        labels: selectedTags,
        assignee: assigneeName,
        assigneeName,
        assigneeAvatar,
        assigneeColor,
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

  const userOptions: SelectOption<string>[] = allUsers.map((u) => ({
    value: u.name,
    label: u.name,
    icon: (
      <Avatar className="size-5 shrink-0 border border-border">
        <AvatarFallback
          className="text-[9px] font-bold text-white"
          style={{ backgroundColor: u.avatarColor || "#6366f1" }}
        >
          {u.avatar || u.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    ),
  }))

  return (
    <>
      {/* ── Overlay ── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* ── Card ── */}
        <div
          className="relative w-full max-w-lg mx-4 rounded-2xl bg-card border border-border shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
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
          <h2 className="text-lg font-bold text-foreground mb-6">
            {isEdit ? "Editar Tarefa" : "Nova Tarefa"}
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
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>

            {/* Coluna + Prioridade (row) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Coluna */}
              <div>
                <Select<ColumnId>
                  id="task-column"
                  label="Coluna"
                  value={column}
                  onChange={(val) => setColumn(val)}
                  options={columnOptions}
                />
              </div>

              {/* Prioridade */}
              <div>
                <Select<Priority>
                  id="task-priority"
                  label="Prioridade"
                  value={priority}
                  onChange={(val) => setPriority(val)}
                  options={priorityOptionsList}
                />
              </div>
            </div>

            {/* Tags (formerly Labels) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <TagIconHeader className="size-4 text-primary" /> Tags
                </span>
                <button
                  type="button"
                  onClick={() => setIsTagManagerOpen(true)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="size-3" /> Gerenciar Tags
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.some((l) => l.name === tag.name)
                  const TagIconComp = tagIconMap[tag.icon || "tag"] || TagIconHeader
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all duration-150 ${
                        isSelected
                          ? "border-transparent text-white shadow-sm"
                          : "border-border text-muted-foreground hover:text-foreground bg-background"
                      }`}
                      style={isSelected ? { backgroundColor: tag.color } : undefined}
                    >
                      <TagIconComp className="size-3" style={!isSelected ? { color: tag.color } : undefined} />
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Responsável (Select Dropdown) + Horas estimadas */}
            <div className="grid grid-cols-2 gap-4">
              {/* Responsável Select */}
              <div>
                <Select<string>
                  id="task-assignee-select"
                  label="Responsável"
                  value={assigneeEmail}
                  onChange={(val) => setAssigneeEmail(val)}
                  options={userOptions.length > 0 ? userOptions : [
                    { value: currentUser.name, label: currentUser.name, icon: <UserIcon className="size-4" /> }
                  ]}
                />
              </div>

              {/* Horas estimadas */}
              <div className="space-y-1.5">
                <label htmlFor="task-estimate" className="text-sm font-medium text-foreground">
                  Horas Estimadas
                </label>
                <input
                  id="task-estimate"
                  type="number"
                  min={0}
                  step={0.5}
                  value={estimate}
                  onChange={(e) => setEstimate(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
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
                    {confirmDelete ? "Tem certeza?" : "Excluir Tarefa"}
                  </button>
                )}
              </div>

              {/* Save */}
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                {isEdit ? "Salvar Alterações" : "Criar Tarefa"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tag Manager Modal */}
      <TagManagerModal
        open={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        tags={availableTags}
        onUpdateTags={handleUpdateTags}
      />
    </>
  )
}

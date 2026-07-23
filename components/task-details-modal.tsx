"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Clock,
  History,
  MessageSquare,
  ListTodo,
  User as UserIcon,
  AlertTriangle,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Minus,
  Send,
  Pencil,
  Play,
} from "lucide-react"
import { Task, ColumnId, Priority, TaskCheckpoint, TaskComment, TaskHistoryEvent, columns } from "@/lib/data"
import { useApp, UserProfile } from "@/lib/context"
import { Select, SelectOption } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { tagIconMap } from "@/components/tag-manager-modal"
import { getRegisteredUsers } from "@/lib/auth-service"

const priorityOptionsList: SelectOption<Priority>[] = [
  { value: "urgent", label: "Urgente", icon: <AlertTriangle className="size-4 text-destructive shrink-0" /> },
  { value: "high", label: "Alta", icon: <SignalHigh className="size-4 text-chart-5 shrink-0" /> },
  { value: "medium", label: "Média", icon: <SignalMedium className="size-4 text-chart-3 shrink-0" /> },
  { value: "low", label: "Baixa", icon: <SignalLow className="size-4 text-chart-2 shrink-0" /> },
  { value: "none", label: "Sem prioridade", icon: <Minus className="size-4 text-muted-foreground shrink-0" /> },
]

const columnOptions: SelectOption<ColumnId>[] = columns.map((col) => ({
  value: col.id,
  label: col.name,
}))

type TaskDetailsModalProps = {
  open: boolean
  onClose: () => void
  task: Task | null
}

export function TaskDetailsModal({ open, onClose, task }: TaskDetailsModalProps) {
  const { updateTask, deleteTask, currentUser, profilesList, startTimer } = useApp()

  const [activeTab, setActiveTab] = useState<"checkpoints" | "comments" | "history">("checkpoints")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState("")

  // New Checkpoint / Comment inputs
  const [newCheckpointText, setNewCheckpointText] = useState("")
  const [newCommentText, setNewCommentText] = useState("")
  const [logHoursInput, setLogHoursInput] = useState("")
  const [isLoggingHours, setIsLoggingHours] = useState(false)

  // Users list
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])

  useEffect(() => {
    if (task) {
      setTitleText(task.title)
    }
  }, [task])

  useEffect(() => {
    const map = new Map<string, UserProfile>()
    if (currentUser?.email) map.set(currentUser.email.toLowerCase(), currentUser)
    profilesList.forEach((p) => {
      if (p.email) map.set(p.email.toLowerCase(), p)
    })
    getRegisteredUsers().forEach((u) => {
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

  if (!open || !task) return null

  const checkpoints = task.checkpoints || []
  const comments = task.comments || []
  const history = task.history || [
    {
      id: "hist_init",
      action: "Tarefa criada no sistema",
      authorName: task.assigneeName || currentUser.name || "Sistema",
      createdAt: Date.now() - 3600000,
    },
  ]

  const completedCheckpoints = checkpoints.filter((c) => c.completed).length
  const progressPercent = checkpoints.length > 0 ? Math.round((completedCheckpoints / checkpoints.length) * 100) : 0

  const userOptions: SelectOption<string>[] = allUsers.map((u) => ({
    value: u.name,
    label: u.name,
    icon: (
      <Avatar className="size-5 shrink-0 border border-border">
        <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: u.avatarColor || "#6366f1" }}>
          {u.avatar || u.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    ),
  }))

  // ── Handlers ────────────────────────────────────────────────

  const addHistoryEvent = (actionText: string) => {
    const newEvent: TaskHistoryEvent = {
      id: `hist_${Date.now()}`,
      action: actionText,
      authorName: currentUser.name || "Usuário",
      createdAt: Date.now(),
    }
    return [newEvent, ...history]
  }

  const handleSaveTitle = () => {
    if (titleText.trim() && titleText !== task.title) {
      const updatedHistory = addHistoryEvent(`Título alterado para "${titleText.trim()}"`)
      updateTask(task.id, { title: titleText.trim(), history: updatedHistory })
    }
    setIsEditingTitle(false)
  }

  const handleColumnChange = (newCol: ColumnId) => {
    if (newCol !== task.column) {
      const colName = columns.find((c) => c.id === newCol)?.name || newCol
      const updatedHistory = addHistoryEvent(`Coluna alterada para "${colName}"`)
      updateTask(task.id, { column: newCol, history: updatedHistory })
    }
  }

  const handlePriorityChange = (newPriority: Priority) => {
    if (newPriority !== task.priority) {
      const updatedHistory = addHistoryEvent(`Prioridade alterada para "${newPriority}"`)
      updateTask(task.id, { priority: newPriority, history: updatedHistory })
    }
  }

  const handleAssigneeChange = (newAssigneeName: string) => {
    const selectedUser = allUsers.find((u) => u.name === newAssigneeName)
    const assigneeAvatar = selectedUser?.avatar || newAssigneeName.slice(0, 2).toUpperCase()
    const assigneeColor = selectedUser?.avatarColor || "#6366f1"

    const updatedHistory = addHistoryEvent(`Responsável alterado para "${newAssigneeName}"`)
    updateTask(task.id, {
      assignee: newAssigneeName,
      assigneeName: newAssigneeName,
      assigneeAvatar,
      assigneeColor,
      history: updatedHistory,
    })
  }

  // ── Checkpoints CRUD ──

  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCheckpointText.trim()) return

    const newCp: TaskCheckpoint = {
      id: `cp_${Date.now()}`,
      title: newCheckpointText.trim(),
      completed: false,
    }

    const updatedCheckpoints = [...checkpoints, newCp]
    const updatedHistory = addHistoryEvent(`Adicionou checkpoint: "${newCheckpointText.trim()}"`)
    updateTask(task.id, { checkpoints: updatedCheckpoints, history: updatedHistory })
    setNewCheckpointText("")
  }

  const handleToggleCheckpoint = (id: string) => {
    const cp = checkpoints.find((c) => c.id === id)
    if (!cp) return

    const newStatus = !cp.completed
    const updatedCheckpoints = checkpoints.map((c) => (c.id === id ? { ...c, completed: newStatus } : c))
    const updatedHistory = addHistoryEvent(
      newStatus ? `Concluiu checkpoint: "${cp.title}"` : `Desmarcou checkpoint: "${cp.title}"`
    )
    updateTask(task.id, { checkpoints: updatedCheckpoints, history: updatedHistory })
  }

  const handleDeleteCheckpoint = (id: string) => {
    const cp = checkpoints.find((c) => c.id === id)
    const updatedCheckpoints = checkpoints.filter((c) => c.id !== id)
    const updatedHistory = addHistoryEvent(`Removeu checkpoint: "${cp?.title || ""}"`)
    updateTask(task.id, { checkpoints: updatedCheckpoints, history: updatedHistory })
  }

  // ── Comments / Observations CRUD ──

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    const newCom: TaskComment = {
      id: `com_${Date.now()}`,
      authorName: currentUser.name || "Usuário",
      authorAvatar: currentUser.avatar || "US",
      authorColor: currentUser.avatarColor || "#6366f1",
      text: newCommentText.trim(),
      createdAt: Date.now(),
    }

    const updatedComments = [newCom, ...comments]
    const updatedHistory = addHistoryEvent(`Adicionou uma observação: "${newCommentText.trim().slice(0, 30)}..."`)
    updateTask(task.id, { comments: updatedComments, history: updatedHistory })
    setNewCommentText("")
  }

  // ── Hours manual log ──

  const handleLogHours = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(logHoursInput)
    if (isNaN(val) || val <= 0) return

    const newHours = (task.hoursLogged || 0) + val
    const updatedHistory = addHistoryEvent(`Registrou +${val}h na tarefa`)
    updateTask(task.id, { hoursLogged: newHours, history: updatedHistory })
    setLogHoursInput("")
    setIsLoggingHours(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[88vh] sm:h-[85vh] rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6 py-4 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 shrink-0">
              {task.code}
            </span>

            {isEditingTitle ? (
              <input
                autoFocus
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                className="text-xl font-bold text-foreground bg-background border border-border rounded-xl px-3 py-1 outline-none focus:ring-2 focus:ring-ring w-full"
              />
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer truncate" onClick={() => setIsEditingTitle(true)}>
                <h2 className="text-xl font-bold text-foreground hover:text-primary transition-colors truncate">{task.title}</h2>
                <Pencil className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            )}
          </div>

          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="size-6" />
          </button>
        </div>

        {/* 2-Column Scrollable Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Main Left Column (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6">
            {/* Tabs Navigation */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("checkpoints")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === "checkpoints" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListTodo className="size-4" />
                <span>Checkpoints ({checkpoints.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("comments")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === "comments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="size-4" />
                <span>Observações ({comments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="size-4" />
                <span>Histórico de Alterações</span>
              </button>
            </div>

            {/* Tab 1: Checkpoints / Checklist */}
            {activeTab === "checkpoints" && (
              <div className="space-y-4">
                {/* Progress bar */}
                {checkpoints.length > 0 && (
                  <div className="space-y-1.5 p-4 rounded-xl bg-muted/40 border border-border">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Progresso dos Checkpoints</span>
                      <span className="font-bold text-foreground">
                        {completedCheckpoints} de {checkpoints.length} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                )}

                {/* Checkpoints list */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {checkpoints.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
                      Nenhum checkpoint adicionado a esta tarefa.
                    </p>
                  ) : (
                    checkpoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors group"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleCheckpoint(cp.id)}
                          className="flex items-center gap-3 text-left flex-1"
                        >
                          {cp.completed ? (
                            <CheckSquare className="size-5 text-primary shrink-0" />
                          ) : (
                            <Square className="size-5 text-muted-foreground shrink-0" />
                          )}
                          <span className={`text-sm ${cp.completed ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>
                            {cp.title}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCheckpoint(cp.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir Checkpoint"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Checkpoint Form */}
                <form onSubmit={handleAddCheckpoint} className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Adicionar novo checkpoint..."
                    value={newCheckpointText}
                    onChange={(e) => setNewCheckpointText(e.target.value)}
                    className="rounded-xl text-sm flex-1 h-10"
                  />
                  <Button type="submit" className="rounded-xl h-10 flex items-center gap-1.5 px-4 font-semibold">
                    <Plus className="size-4" />
                    <span>Adicionar</span>
                  </Button>
                </form>
              </div>
            )}

            {/* Tab 2: Observações / Comments */}
            {activeTab === "comments" && (
              <div className="space-y-4">
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <textarea
                    placeholder="Escreva uma observação ou anotação sobre esta tarefa..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                  />
                  <Button type="submit" size="icon" className="size-11 rounded-xl shrink-0 self-end">
                    <Send className="size-4" />
                  </Button>
                </form>

                {/* Comments List */}
                <div className="space-y-3 pt-2 max-h-72 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border rounded-xl">
                      Nenhuma observação registrada ainda.
                    </p>
                  ) : (
                    comments.map((com) => (
                      <div key={com.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6 border border-border">
                              <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: com.authorColor || "#6366f1" }}>
                                {com.authorAvatar || "US"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-bold text-foreground">{com.authorName}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(com.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="text-xs text-card-foreground leading-relaxed pl-8">{com.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Histórico de Alterações */}
            {activeTab === "history" && (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {history.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
                    <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs text-foreground font-medium">{ev.action}</span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>por {ev.authorName}</span>
                        <span>•</span>
                        <span>{new Date(ev.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side Panel Column (5 cols) */}
          <div className="lg:col-span-5 p-6 space-y-5 bg-muted/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detalhes da Tarefa</h3>

            {/* Coluna / Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status / Coluna</label>
              <Select<ColumnId> value={task.column} onChange={handleColumnChange} options={columnOptions} triggerClassName="h-10 text-xs rounded-xl" />
            </div>

            {/* Prioridade */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
              <Select<Priority> value={task.priority} onChange={handlePriorityChange} options={priorityOptionsList} triggerClassName="h-10 text-xs rounded-xl" />
            </div>

            {/* Responsável */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <Select<string>
                value={task.assigneeName || task.assignee}
                onChange={handleAssigneeChange}
                options={userOptions}
                triggerClassName="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Horas */}
            <div className="space-y-2 p-4 rounded-xl border border-border bg-card">
              <label className="text-xs font-medium text-muted-foreground">Horas Trabalhadas</label>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">
                  {task.hoursLogged || 0}h / {task.estimate || 0}h
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startTimer(task.id, task.code)}
                    className="h-8 text-xs px-2.5 rounded-lg text-emerald-500 hover:text-emerald-400"
                    title="Iniciar cronômetro nesta tarefa"
                  >
                    <Play className="size-3.5 mr-1" /> Timer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsLoggingHours(!isLoggingHours)}
                    className="h-8 text-xs px-2.5 rounded-lg"
                  >
                    + Horas
                  </Button>
                </div>
              </div>

              {/* Form manual horas */}
              {isLoggingHours && (
                <form onSubmit={handleLogHours} className="flex items-center gap-2 pt-2 border-t border-border mt-2 animate-in fade-in">
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="Ex: 2.5h"
                    value={logHoursInput}
                    onChange={(e) => setLogHoursInput(e.target.value)}
                    className="h-8 text-xs rounded-lg flex-1"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs rounded-lg">
                    Salvar
                  </Button>
                </form>
              )}
            </div>

            {/* Tags */}
            {task.labels && task.labels.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tags Atribuídas</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {task.labels.map((l) => {
                    const TagIconComp = tagIconMap[l.icon || "tag"]
                    return (
                      <span key={l.name} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-border bg-card shadow-2xs">
                        <span className="flex size-3 items-center justify-center rounded-full text-white" style={{ backgroundColor: l.color }}>
                          {TagIconComp && <TagIconComp className="size-2 text-white" />}
                        </span>
                        {l.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border p-4 px-6 bg-muted/20 shrink-0">
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
                deleteTask(task.id)
                onClose()
              }
            }}
            className="text-xs text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <Trash2 className="size-4 mr-1.5" /> Excluir Tarefa
          </Button>

          <Button onClick={onClose} className="rounded-xl px-6 font-semibold">
            Concluído
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, DragEvent } from "react"
import { Plus, Clock, SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus, GripVertical, Filter, Tag as TagIcon } from "lucide-react"
import { columns, type Priority, type Task, type ColumnId } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"
import { TaskModal } from "@/components/task-modal"
import { TaskDetailsModal } from "@/components/task-details-modal"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, type SelectOption } from "@/components/ui/select"
import { tagIconMap } from "@/components/tag-manager-modal"

const priorityConfig: Record<Priority, { icon: typeof SignalHigh; className: string; label: string }> = {
  urgent: { icon: AlertTriangle, className: "text-destructive", label: "Urgente" },
  high: { icon: SignalHigh, className: "text-chart-5", label: "Alta" },
  medium: { icon: SignalMedium, className: "text-chart-3", label: "Média" },
  low: { icon: SignalLow, className: "text-chart-2", label: "Baixa" },
  none: { icon: Minus, className: "text-muted-foreground", label: "Sem" },
}

const priorityFilterOptions: SelectOption<string>[] = [
  { value: "all", label: "Todas as prioridades", icon: <Filter className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "urgent", label: "Urgente", icon: <AlertTriangle className="size-3.5 text-destructive shrink-0" /> },
  { value: "high", label: "Alta", icon: <SignalHigh className="size-3.5 text-chart-5 shrink-0" /> },
  { value: "medium", label: "Média", icon: <SignalMedium className="size-3.5 text-chart-3 shrink-0" /> },
  { value: "low", label: "Baixa", icon: <SignalLow className="size-3.5 text-chart-2 shrink-0" /> },
  { value: "none", label: "Sem prioridade", icon: <Minus className="size-3.5 text-muted-foreground shrink-0" /> },
]

const avatarMap: Record<string, string> = {
  MA: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
  FA: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
  JS: "https://images.shadcnspace.com/assets/profiles/user-2.jpg",
  RP: "https://images.shadcnspace.com/assets/profiles/user-4.jpg",
}

const columnDotColors: Record<string, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-chart-2",
  in_progress: "bg-chart-3",
  done: "bg-chart-4",
}

export function KanbanBoard({ fullWidth }: { fullWidth?: boolean }) {
  const { userData, moveTask } = useApp()
  const { tasks } = userData

  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [createColumn, setCreateColumn] = useState<ColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)

  const handleDragStart = (e: DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId)
    e.dataTransfer.effectAllowed = "move"
    setDraggingTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDragOverCol(null)
    setDragOverCardId(null)
  }

  const handleDragOverColumn = (e: DragEvent, colId: ColumnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(colId)
  }

  const handleDragLeaveColumn = () => {
    setDragOverCol(null)
    setDragOverCardId(null)
  }

  const handleDropColumn = (e: DragEvent, colId: ColumnId) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId) {
      moveTask(taskId, colId)
    }
    setDragOverCol(null)
    setDragOverCardId(null)
    setDraggingTaskId(null)
  }

  const handleDragOverCard = (e: DragEvent, overTaskId: string, colId: ColumnId) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(colId)
    setDragOverCardId(overTaskId)
  }

  const handleDropCard = (e: DragEvent, overTaskId: string, colId: ColumnId) => {
    e.preventDefault()
    e.stopPropagation()
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId && taskId !== overTaskId) {
      moveTask(taskId, colId, overTaskId)
    }
    setDragOverCol(null)
    setDragOverCardId(null)
    setDraggingTaskId(null)
  }

  return (
    <>
      <div className={cn("rounded-xl border border-border bg-card overflow-hidden", fullWidth ? "flex-1" : "")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5 bg-card/80">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">Quadro Kanban</h2>
            <p className="text-xs text-muted-foreground">Todas as tarefas do projeto Octho Core</p>
          </div>
          <div className="w-52">
            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={priorityFilterOptions}
              triggerClassName="h-8 text-xs px-2.5 py-1"
            />
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto p-4">
          {columns.map((col) => {
            const colTasks = tasks.filter(
              (t) => t.column === col.id && (priorityFilter === "all" || t.priority === priorityFilter)
            )
            const colHours = colTasks.reduce((acc, t) => acc + t.hoursLogged, 0)
            const isDragOver = dragOverCol === col.id

            return (
              <div key={col.id} className="flex w-72 shrink-0 flex-col">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn("size-2 rounded-full shrink-0 transition-transform duration-200", columnDotColors[col.id] || "bg-muted-foreground")} />
                  <span className="text-sm font-semibold text-card-foreground">{col.name}</span>
                  <span className="rounded-md bg-muted px-1.5 text-xs font-bold text-muted-foreground">
                    {colTasks.length}
                  </span>
                  {colHours > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {colHours}h
                    </span>
                  )}
                  <button
                    onClick={() => setCreateColumn(col.id)}
                    className="rounded-lg p-1 text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground hover:scale-110"
                    title={`Adicionar tarefa em ${col.name}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div
                  className={cn(
                    "flex flex-col gap-2 min-h-[120px] rounded-xl p-1.5 transition-all duration-200",
                    isDragOver
                      ? "bg-primary/10 ring-2 ring-primary/40 ring-offset-1"
                      : "bg-muted/30"
                  )}
                  onDragOver={(e) => handleDragOverColumn(e, col.id)}
                  onDragLeave={handleDragLeaveColumn}
                  onDrop={(e) => handleDropColumn(e, col.id)}
                >
                  {colTasks.length > 0 ? (
                    colTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onEdit={() => setEditTask(t)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOverCard={handleDragOverCard}
                        onDropCard={handleDropCard}
                        isDragOver={dragOverCardId === t.id}
                        isDragging={draggingTaskId === t.id}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl transition-colors">
                      {isDragOver ? (
                        <span className="text-primary font-medium animate-in fade-in">Soltar aqui</span>
                      ) : (
                        <span>Arraste tarefas aqui</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskDetailsModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask}
      />
      <TaskModal
        open={!!createColumn}
        onClose={() => setCreateColumn(null)}
        defaultColumn={createColumn ?? undefined}
      />
    </>
  )
}

function TaskCard({
  task,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropCard,
  isDragOver,
  isDragging,
}: {
  task: Task
  onEdit: () => void
  onDragStart: (e: DragEvent, taskId: string) => void
  onDragEnd: () => void
  onDragOverCard: (e: DragEvent, overTaskId: string, colId: ColumnId) => void
  onDropCard: (e: DragEvent, overTaskId: string, colId: ColumnId) => void
  isDragOver: boolean
  isDragging: boolean
}) {
  const p = priorityConfig[task.priority]

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOverCard(e, task.id, task.column)}
      onDrop={(e) => onDropCard(e, task.id, task.column)}
      onClick={onEdit}
      className={cn(
        "group cursor-pointer rounded-xl border border-border bg-background p-3.5",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-black/8",
        "active:translate-y-0 active:shadow-none",
        isDragOver && "border-t-2 border-t-primary",
        isDragging && "opacity-40 scale-95 rotate-1"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="size-3 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 shrink-0 cursor-grab" />
          <span className="font-mono text-[11px] text-muted-foreground shrink-0 bg-muted/60 px-1.5 py-0.5 rounded-md">
            {task.code}
          </span>
        </div>

        {/* Responsavel (Avatar + Full Name) */}
        <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 rounded-full pl-1 pr-2 py-0.5 border border-border/50 transition-all duration-150 group-hover:border-border">
          <Avatar className="size-5 shrink-0 border border-border">
            {avatarMap[task.assignee] && <AvatarImage src={avatarMap[task.assignee]} alt={task.assignee} />}
            <AvatarFallback
              style={{ backgroundColor: task.assigneeColor || "#6366f1", color: "#fff" }}
              className="text-[9px] font-bold"
            >
              {task.assigneeAvatar || (task.assignee ? task.assignee.slice(0, 2).toUpperCase() : "US")}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] font-semibold text-foreground truncate max-w-[110px]">
            {task.assigneeName || task.assignee}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-sm leading-snug text-card-foreground text-pretty font-medium">{task.title}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={cn("flex items-center", p.className)} title={p.label}>
          <p.icon className="size-3.5" />
        </span>
        {task.labels.map((l) => {
          const TagIconComp = tagIconMap[l.icon || "tag"] || TagIcon
          return (
            <span
              key={l.name}
              className="flex items-center gap-1 rounded-full border border-border/80 px-2 py-0.5 text-[11px] font-medium text-foreground bg-card shadow-xs transition-all duration-150 hover:border-border"
            >
              <span className="flex items-center justify-center size-3 rounded-full" style={{ backgroundColor: l.color }}>
                {TagIconComp && <TagIconComp className="size-2 text-white" />}
              </span>
              {l.name}
            </span>
          )
        })}
        {(task.hoursLogged > 0 || task.estimate > 0) && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] tabular-nums text-muted-foreground font-medium">
            <Clock className="size-3" />
            {task.hoursLogged}/{task.estimate}h
          </span>
        )}
      </div>
    </article>
  )
}

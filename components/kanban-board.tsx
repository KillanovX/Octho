"use client"

import { useState, DragEvent } from "react"
import { Plus, Clock, SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus, GripVertical } from "lucide-react"
import { columns, type Priority, type Task, type ColumnId } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"
import { TaskModal } from "@/components/task-modal"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const priorityConfig: Record<Priority, { icon: typeof SignalHigh; className: string; label: string }> = {
  urgent: { icon: AlertTriangle, className: "text-destructive", label: "Urgente" },
  high: { icon: SignalHigh, className: "text-chart-5", label: "Alta" },
  medium: { icon: SignalMedium, className: "text-chart-3", label: "Média" },
  low: { icon: SignalLow, className: "text-chart-2", label: "Baixa" },
  none: { icon: Minus, className: "text-muted-foreground", label: "Sem" },
}

const avatarMap: Record<string, string> = {
  MA: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
  FA: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
  JS: "https://images.shadcnspace.com/assets/profiles/user-2.jpg",
  RP: "https://images.shadcnspace.com/assets/profiles/user-4.jpg",
}

export function KanbanBoard({ fullWidth }: { fullWidth?: boolean }) {
  const { userData, moveTask } = useApp()
  const { tasks } = userData

  const [editTask, setEditTask] = useState<Task | null>(null)
  const [createColumn, setCreateColumn] = useState<ColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)

  const handleDragStart = (e: DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId)
    e.dataTransfer.effectAllowed = "move"
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
  }

  return (
    <>
      <div className={cn("rounded-xl border border-border bg-card", fullWidth ? "flex-1" : "")}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">Quadro Kanban</h2>
            <p className="text-xs text-muted-foreground">Todas as tarefas do projeto Octho Core</p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto p-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id)
            const colHours = colTasks.reduce((acc, t) => acc + t.hoursLogged, 0)
            const isDragOver = dragOverCol === col.id

            return (
              <div key={col.id} className="flex w-72 shrink-0 flex-col">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn("size-2.5 rounded-full", dotColor(col.id))} />
                  <span className="text-sm font-medium text-card-foreground">{col.name}</span>
                  <span className="rounded bg-muted px-1.5 text-xs font-medium text-muted-foreground">
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
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title={`Adicionar tarefa em ${col.name}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div
                  className={cn(
                    "flex flex-col gap-2 min-h-[120px] rounded-lg p-1 transition-colors",
                    isDragOver ? "bg-primary/10 ring-2 ring-primary/30" : "bg-accent/20"
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
                        onDragOverCard={handleDragOverCard}
                        onDropCard={handleDropCard}
                        isDragOver={dragOverCardId === t.id}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                      Arraste tarefas aqui
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskModal
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

function dotColor(id: string) {
  switch (id) {
    case "backlog": return "bg-muted-foreground"
    case "todo": return "bg-chart-2"
    case "in_progress": return "bg-chart-3"
    case "done": return "bg-chart-4"
    default: return "bg-muted-foreground"
  }
}

function TaskCard({
  task,
  onEdit,
  onDragStart,
  onDragOverCard,
  onDropCard,
  isDragOver,
}: {
  task: Task
  onEdit: () => void
  onDragStart: (e: DragEvent, taskId: string) => void
  onDragOverCard: (e: DragEvent, overTaskId: string, colId: ColumnId) => void
  onDropCard: (e: DragEvent, overTaskId: string, colId: ColumnId) => void
  isDragOver: boolean
}) {
  const p = priorityConfig[task.priority]

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={(e) => onDragOverCard(e, task.id, task.column)}
      onDrop={(e) => onDropCard(e, task.id, task.column)}
      onClick={onEdit}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-background p-3 transition-all hover:border-primary/40 hover:shadow-sm active:opacity-75",
        isDragOver && "border-t-2 border-t-primary pt-2.5"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GripVertical className="size-3 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="font-mono text-xs text-muted-foreground">{task.code}</span>
        </div>
        <Avatar className="size-5 shrink-0">
          {avatarMap[task.assignee] && <AvatarImage src={avatarMap[task.assignee]} alt={task.assignee} />}
          <AvatarFallback style={{ backgroundColor: task.assigneeColor, color: "#fff" }} className="text-[9px] font-semibold">
            {task.assignee}
          </AvatarFallback>
        </Avatar>
      </div>

      <p className="mt-1.5 text-sm leading-snug text-card-foreground text-pretty">{task.title}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className={cn("flex items-center", p.className)} title={p.label}>
          <p.icon className="size-3.5" />
        </span>
        {task.labels.map((l) => (
          <span
            key={l.name}
            className="flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.name}
          </span>
        ))}
        {(task.hoursLogged > 0 || task.estimate > 0) && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] tabular-nums text-muted-foreground">
            <Clock className="size-3" />
            {task.hoursLogged}/{task.estimate}h
          </span>
        )}
      </div>
    </article>
  )
}

"use client"

import { Plus, Clock, SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus } from "lucide-react"
import { columns, type Priority, type Task } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"

const priorityConfig: Record<Priority, { icon: typeof SignalHigh; className: string; label: string }> = {
  urgent: { icon: AlertTriangle, className: "text-destructive", label: "Urgente" },
  high: { icon: SignalHigh, className: "text-chart-5", label: "Alta" },
  medium: { icon: SignalMedium, className: "text-chart-3", label: "Média" },
  low: { icon: SignalLow, className: "text-chart-2", label: "Baixa" },
  none: { icon: Minus, className: "text-muted-foreground", label: "Sem" },
}

export function KanbanBoard() {
  const { userData } = useApp()
  const { tasks } = userData

  return (
    <div className="rounded-xl border border-border bg-card flex-1 min-w-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Quadro Kanban</h2>
          <p className="text-xs text-muted-foreground">Todas as tarefas do projeto Fluxo Core</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto p-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col.id)
          const colHours = colTasks.reduce((acc, t) => acc + t.hoursLogged, 0)
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
                <button className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <Plus className="size-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 min-h-[150px] rounded-lg bg-accent/20 p-1">
                {colTasks.length > 0 ? (
                  colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                    Sem tarefas
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function dotColor(id: string) {
  switch (id) {
    case "backlog":
      return "bg-muted-foreground"
    case "todo":
      return "bg-chart-2"
    case "in_progress":
      return "bg-chart-3"
    case "done":
      return "bg-chart-4"
    default:
      return "bg-muted-foreground"
  }
}

function TaskCard({ task }: { task: Task }) {
  const p = priorityConfig[task.priority]
  return (
    <article className="group cursor-pointer rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">{task.code}</span>
        <span
          className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: task.assigneeColor }}
          title={task.assignee}
        >
          {task.assignee}
        </span>
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
        {task.hoursLogged > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] tabular-nums text-muted-foreground">
            <Clock className="size-3" />
            {task.hoursLogged}/{task.estimate}h
          </span>
        )}
      </div>
    </article>
  )
}

"use client"

import { Clock, CalendarDays, CheckCircle2, ListTodo, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"

export function StatCards() {
  const { userData, hoursMonth, completedTasksMonth, setActiveView } = useApp()

  const dayMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const todayStr = dayMap[new Date().getDay()]
  const todayItem = userData.weeklyHours.find(d => d.day === todayStr)

  const hoursVal = todayItem?.hours ?? 0
  const h = Math.floor(hoursVal)
  const m = Math.round((hoursVal - h) * 60)
  const hoursTodayStr = h > 0 || m > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : "0h"
  const goalStr = todayItem ? `Meta diária: ${todayItem.goal}h` : "Meta diária: 8h"

  const activeTasks = userData.tasks.filter(t => t.column !== "done")
  const activeCount = activeTasks.length
  const todoCount = activeTasks.filter(t => t.column === "todo").length
  const progressCount = activeTasks.filter(t => t.column === "in_progress").length

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" })
  const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  const stats = [
    {
      label: "Horas hoje",
      value: hoursTodayStr,
      sub: goalStr,
      icon: Clock,
      onClick: () => setActiveView("time-log"),
    },
    {
      label: "Horas no mês",
      value: `${hoursMonth}h`,
      sub: `${capMonth} · meta 160h`,
      icon: CalendarDays,
      onClick: () => setActiveView("time-log"),
    },
    {
      label: "Tarefas concluídas",
      value: `${completedTasksMonth}`,
      sub: "Neste mês",
      icon: CheckCircle2,
      onClick: () => setActiveView("kanban"),
    },
    {
      label: "Tarefas ativas",
      value: `${activeCount}`,
      sub: `${todoCount} a fazer · ${progressCount} em progresso`,
      icon: ListTodo,
      onClick: () => setActiveView("kanban"),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <button
          key={s.label}
          onClick={s.onClick}
          className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:shadow-sm"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <s.icon className="size-4.5" />
          </span>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-card-foreground">{s.value}</p>
          <p className="text-sm font-medium text-card-foreground">{s.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
        </button>
      ))}
    </div>
  )
}

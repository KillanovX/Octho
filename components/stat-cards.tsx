"use client"

import { Clock, CalendarDays, CheckCircle2, ListTodo, TrendingUp } from "lucide-react"
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
      gradient: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      onClick: () => setActiveView("time-log"),
    },
    {
      label: "Horas no mês",
      value: `${hoursMonth}h`,
      sub: `${capMonth} · meta 160h`,
      icon: CalendarDays,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
      onClick: () => setActiveView("time-log"),
    },
    {
      label: "Tarefas concluídas",
      value: `${completedTasksMonth}`,
      sub: "Neste mês",
      icon: CheckCircle2,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      onClick: () => setActiveView("kanban"),
    },
    {
      label: "Tarefas ativas",
      value: `${activeCount}`,
      sub: `${todoCount} a fazer · ${progressCount} em progresso`,
      icon: ListTodo,
      gradient: "from-amber-500/20 to-amber-600/5",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      onClick: () => setActiveView("kanban"),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s, i) => (
        <button
          key={s.label}
          onClick={s.onClick}
          style={{ animationDelay: `${i * 60}ms` }}
          className={cn(
            "interactive-card group relative overflow-hidden rounded-xl border border-border bg-card p-5 text-left",
            "count-animate"
          )}
        >
          {/* Subtle gradient background */}
          <div className={cn("absolute inset-0 opacity-0 bg-gradient-to-br transition-opacity duration-300 group-hover:opacity-100", s.gradient)} />

          <div className="relative">
            <span className={cn(
              "flex size-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110",
              s.iconBg
            )}>
              <s.icon className={cn("size-5", s.iconColor)} />
            </span>

            <p className="mt-4 text-2xl font-bold tracking-tight text-card-foreground tabular-nums">
              {s.value}
            </p>
            <p className="text-sm font-semibold text-card-foreground mt-0.5">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>

            {/* Hover arrow indicator */}
            <TrendingUp className="absolute right-0 bottom-0 size-4 text-muted-foreground/40 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:text-muted-foreground" />
          </div>
        </button>
      ))}
    </div>
  )
}

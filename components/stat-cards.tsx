"use client"

import { Clock, CalendarDays, CheckCircle2, ListTodo, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"

export function StatCards() {
  const { currentUser, userData } = useApp()

  // Calculate "Horas hoje" dynamically
  const dayMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const todayStr = dayMap[new Date().getDay()]
  const todayHourItem = userData.weeklyHours.find((d) => d.day === todayStr)
  
  const hoursVal = todayHourItem ? todayHourItem.hours : 0
  const h = Math.floor(hoursVal)
  const m = Math.round((hoursVal - h) * 60)
  const hoursTodayStr = h > 0 || m > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : "0h"
  const goalStr = todayHourItem ? `Meta diária: ${todayHourItem.goal}h` : "Meta diária: 8h"

  // Calculate "Tarefas ativas" dynamically
  const activeTasks = userData.tasks.filter((t) => t.column !== "done")
  const activeCount = activeTasks.length
  const todoCount = activeTasks.filter((t) => t.column === "todo").length
  const progressCount = activeTasks.filter((t) => t.column === "in_progress").length

  // Capitalize current month for "Horas no mês"
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long" })
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  const stats = [
    {
      label: "Horas hoje",
      value: hoursTodayStr,
      sub: goalStr,
      icon: Clock,
      trend: currentUser.id === "MA" ? 12 : 0,
      trendLabel: "vs. ontem",
    },
    {
      label: "Horas no mês",
      value: `${userData.hoursMonth}h`,
      sub: `${capitalizedMonth} · meta 160h`,
      icon: CalendarDays,
      trend: currentUser.id === "MA" ? 8 : 0,
      trendLabel: "vs. mês anterior",
    },
    {
      label: "Tarefas concluídas",
      value: `${userData.completedTasksMonth}`,
      sub: "Neste mês",
      icon: CheckCircle2,
      trend: currentUser.id === "MA" ? 15 : 0,
      trendLabel: "vs. mês anterior",
    },
    {
      label: "Tarefas ativas",
      value: `${activeCount}`,
      sub: `${todoCount} a fazer · ${progressCount} em progresso`,
      icon: ListTodo,
      trend: currentUser.id === "MA" ? -6 : 0,
      trendLabel: "vs. semana passada",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const positive = s.trend >= 0
        const hasTrend = s.trend !== 0

        return (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="size-4.5" />
              </span>
              {hasTrend ? (
                <span
                  className={cn(
                    "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                    positive ? "bg-chart-4/15 text-chart-4" : "bg-destructive/15 text-destructive",
                  )}
                >
                  {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {Math.abs(s.trend)}%
                </span>
              ) : (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Sem dados
                </span>
              )}
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-card-foreground">{s.value}</p>
            <p className="text-sm font-medium text-card-foreground">{s.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
          </div>
        )
      })}
    </div>
  )
}

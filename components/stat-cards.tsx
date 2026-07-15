import { Clock, CalendarDays, CheckCircle2, ListTodo, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Stat = {
  label: string
  value: string
  sub: string
  icon: typeof Clock
  trend: number
  trendLabel: string
}

const stats: Stat[] = [
  {
    label: "Horas hoje",
    value: "6h 48m",
    sub: "Meta diária: 8h",
    icon: Clock,
    trend: 12,
    trendLabel: "vs. ontem",
  },
  {
    label: "Horas no mês",
    value: "138h",
    sub: "Junho · meta 160h",
    icon: CalendarDays,
    trend: 8,
    trendLabel: "vs. mês anterior",
  },
  {
    label: "Tarefas concluídas",
    value: "24",
    sub: "Neste mês",
    icon: CheckCircle2,
    trend: 15,
    trendLabel: "vs. mês anterior",
  },
  {
    label: "Tarefas ativas",
    value: "12",
    sub: "4 a fazer · 4 em progresso",
    icon: ListTodo,
    trend: -6,
    trendLabel: "vs. semana passada",
  },
]

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const positive = s.trend >= 0
        return (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="size-4.5" />
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                  positive ? "bg-chart-4/15 text-chart-4" : "bg-destructive/15 text-destructive",
                )}
              >
                {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(s.trend)}%
              </span>
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

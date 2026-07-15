"use client"

import { useApp } from "@/lib/context"

export function ActivityBreakdown() {
  const { userData } = useApp()

  // Compute hours by label from actual task data
  const labelHoursMap = new Map<string, number>()
  const labelColorMap = new Map<string, string>()
  for (const task of userData.tasks) {
    for (const label of task.labels) {
      labelHoursMap.set(label.name, (labelHoursMap.get(label.name) ?? 0) + task.hoursLogged)
      labelColorMap.set(label.name, label.color)
    }
  }

  // Merge with predefined categories (keep all categories visible even if 0h)
  const breakdown = userData.activityBreakdown.map(a => ({
    name: a.name,
    hours: labelHoursMap.get(a.name) ?? a.hours,
    color: a.color,
  }))

  const total = breakdown.reduce((acc, a) => acc + a.hours, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Horas por atividade</h3>
          <p className="text-xs text-muted-foreground">Distribuição do mês</p>
        </div>
        <p className="text-lg font-semibold text-card-foreground">{total.toFixed(0)}h</p>
      </div>

      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {total > 0 ? (
          breakdown.map((a) => (
            <div
              key={a.name}
              style={{ width: `${(a.hours / total) * 100}%`, backgroundColor: a.color }}
              title={`${a.name}: ${a.hours}h`}
              className="transition-all duration-300"
            />
          ))
        ) : (
          <div className="h-full w-full bg-muted" title="Nenhuma hora registrada" />
        )}
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {breakdown.map((a) => {
          const pct = total > 0 ? Math.round((a.hours / total) * 100) : 0
          return (
            <li key={a.name} className="flex items-center gap-3">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="flex-1 text-sm text-card-foreground">{a.name}</span>
              <span className="text-sm font-medium tabular-nums text-card-foreground">{a.hours.toFixed(0)}h</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

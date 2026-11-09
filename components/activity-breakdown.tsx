"use client"

import { useApp } from "@/lib/context"

export function ActivityBreakdown() {
  const { userData } = useApp()

  // Calculado no contexto a partir dos lançamentos do mês (time_entries), pela primeira tag da tarefa
  const breakdown = userData.activityBreakdown

  const total = breakdown.reduce((acc, a) => acc + a.hours, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Horas por atividade</h3>
          <p className="text-xs text-muted-foreground">Distribuição do mês</p>
        </div>
        <p className="text-lg font-semibold text-card-foreground">{total.toFixed(1)}h</p>
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

      {breakdown.length === 0 && (
        <p className="mt-5 text-xs text-muted-foreground">Nenhuma hora registrada neste mês.</p>
      )}

      <ul className="mt-5 flex flex-col gap-3">
        {breakdown.map((a) => {
          const pct = total > 0 ? Math.round((a.hours / total) * 100) : 0
          return (
            <li key={a.name} className="flex items-center gap-3">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
              <span className="flex-1 text-sm text-card-foreground">{a.name}</span>
              <span className="text-sm font-medium tabular-nums text-card-foreground">{a.hours.toFixed(1)}h</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

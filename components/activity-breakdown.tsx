import { activityBreakdown } from "@/lib/data"

export function ActivityBreakdown() {
  const total = activityBreakdown.reduce((acc, a) => acc + a.hours, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Horas por atividade</h3>
          <p className="text-xs text-muted-foreground">Distribuição do mês</p>
        </div>
        <p className="text-lg font-semibold text-card-foreground">{total}h</p>
      </div>

      {/* Stacked bar */}
      <div className="mt-5 flex h-3 w-full overflow-hidden rounded-full">
        {activityBreakdown.map((a) => (
          <div
            key={a.name}
            style={{ width: `${(a.hours / total) * 100}%`, backgroundColor: a.color }}
            title={`${a.name}: ${a.hours}h`}
          />
        ))}
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {activityBreakdown.map((a) => (
          <li key={a.name} className="flex items-center gap-3">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="flex-1 text-sm text-card-foreground">{a.name}</span>
            <span className="text-sm font-medium tabular-nums text-card-foreground">{a.hours}h</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round((a.hours / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

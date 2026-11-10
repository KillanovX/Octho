"use client"

import { useState } from "react"
import { useApp } from "@/lib/context"
import { formatHours, startOfWeek } from "@/lib/hours"
import { cn } from "@/lib/utils"

/**
 * Horas por dia da semana atual: colunas (uma série, sem legenda), meta diária como
 * marca de referência por dia, tooltip por coluna (hover e foco) e tabela para leitor de tela.
 */
export function WeeklyHoursChart() {
  const { userData } = useApp()
  const { weeklyHours } = userData
  const [active, setActive] = useState<number | null>(null)

  const weekStart = startOfWeek(new Date())
  const todayIdx = (new Date().getDay() + 6) % 7
  const days = weeklyHours.map((d, i) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
    return {
      ...d,
      date,
      dateLabel: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      isToday: i === todayIdx,
      isFuture: i > todayIdx,
    }
  })

  const total = days.reduce((acc, d) => acc + d.hours, 0)
  const workedDays = days.filter((d) => !d.isFuture && d.goal > 0).length
  const avg = workedDays > 0 ? total / workedDays : 0
  const weekGoal = days.reduce((acc, d) => acc + d.goal, 0)

  // Escala: ticks limpos de 2 em 2h (ou 4 em 4h), cobrindo a meta e o maior valor
  const peak = Math.max(8, ...days.map((d) => d.hours))
  const step = peak > 10 ? 4 : 2
  const max = Math.ceil(peak / step) * step
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step)
  const pct = (h: number) => `${(Math.min(h, max) / max) * 100}%`

  const describe = (d: (typeof days)[number]) => {
    if (d.goal === 0) return d.hours > 0 ? "dia sem meta" : "sem meta"
    if (d.hours >= d.goal) return "meta atingida"
    if (d.isFuture) return `meta ${d.goal}h`
    return `faltaram ${formatHours(d.goal - d.hours)}`
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Horas por dia</h3>
          <p className="text-xs text-muted-foreground">Semana atual · meta {weekGoal}h</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-card-foreground">{formatHours(total)}</p>
          <p className="text-xs text-muted-foreground">média {formatHours(avg)} por dia útil</p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {/* Eixo Y */}
        <div className="relative h-40 w-7 shrink-0 text-[10px] tabular-nums text-muted-foreground" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: pct(t) }}>
              {t}h
            </span>
          ))}
        </div>

        <div className="relative h-40 flex-1">
          {/* Grade recessiva */}
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className={cn("absolute inset-x-0 border-t", t === 0 ? "border-border" : "border-border/50")}
              style={{ bottom: pct(t) }}
            />
          ))}

          {/* Colunas */}
          <div className="absolute inset-0 grid grid-cols-7" role="list" aria-label="Horas registradas por dia">
            {days.map((d, i) => (
              <div
                key={d.day}
                role="listitem"
                tabIndex={0}
                aria-label={`${d.day} ${d.dateLabel}: ${formatHours(d.hours)}${d.goal ? ` de ${d.goal}h` : ""}, ${describe(d)}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive((cur) => (cur === i ? null : cur))}
                onFocus={() => setActive(i)}
                onBlur={() => setActive((cur) => (cur === i ? null : cur))}
                className="group relative flex h-full cursor-default justify-center rounded-md outline-none focus-visible:bg-muted/40"
              >
                {/* Meta do dia (marca de referência) */}
                {d.goal > 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute left-1/2 w-9 -translate-x-1/2 border-t-2 border-dashed border-muted-foreground/40"
                    style={{ bottom: pct(d.goal) }}
                  />
                )}

                {/* Coluna: <= 24px, topo arredondado, base reta; cresce da base */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-0 w-[min(24px,55%)] origin-bottom rounded-t-[4px] transition-[height,opacity,filter] duration-500 ease-out motion-safe:animate-[barGrow_600ms_ease-out_both]",
                    d.isFuture ? "bg-primary/25" : "bg-primary",
                    active === i && "brightness-110",
                    active !== null && active !== i && "opacity-60"
                  )}
                  style={{ height: d.hours > 0 ? `max(${pct(d.hours)}, 3px)` : 0, animationDelay: `${i * 50}ms` }}
                />

                {/* Valor só no dia de hoje (rótulo seletivo); os demais no tooltip */}
                {d.isToday && d.hours > 0 && active === null && (
                  <span
                    aria-hidden="true"
                    className="absolute -translate-y-1.5 text-[11px] font-semibold tabular-nums text-card-foreground"
                    style={{ bottom: pct(d.hours) }}
                  >
                    {formatHours(d.hours)}
                  </span>
                )}

                {/* Tooltip */}
                {active === i && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute top-0 z-10 w-max rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-100",
                      // dentro da área do gráfico; nas pontas alinha pela borda para não vazar
                      i === 0 ? "left-0" : i === days.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2"
                    )}
                  >
                    <p className="font-semibold">
                      {d.day} {d.dateLabel}
                      {d.isToday && <span className="ml-1 font-normal text-muted-foreground">(hoje)</span>}
                    </p>
                    <p className="tabular-nums">
                      {formatHours(d.hours)}
                      {d.goal > 0 && <span className="text-muted-foreground"> de {d.goal}h</span>}
                    </p>
                    <p className="text-muted-foreground">{describe(d)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Eixo X */}
      <div className="mt-2 ml-9 grid grid-cols-7 text-center" aria-hidden="true">
        {days.map((d) => (
          <span
            key={d.day}
            className={cn("text-xs", d.isToday ? "font-semibold text-card-foreground" : "text-muted-foreground")}
          >
            {d.day}
          </span>
        ))}
      </div>

      {/* Tabela para leitores de tela */}
      <table className="sr-only">
        <caption>Horas registradas por dia na semana atual</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Horas</th>
            <th scope="col">Meta</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">
                {d.day} {d.dateLabel}
              </th>
              <td>{formatHours(d.hours)}</td>
              <td>{d.goal}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

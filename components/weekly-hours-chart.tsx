"use client"

import { useApp } from "@/lib/context"

export function WeeklyHoursChart() {
  const { userData } = useApp()
  const { weeklyHours } = userData

  const max = 8
  const total = weeklyHours.reduce((acc, d) => acc + d.hours, 0)
  const goalDays = weeklyHours.filter((d) => d.goal > 0).length
  const avg = goalDays > 0 ? total / goalDays : 0

  const width = 320
  const height = 128
  const padX = 8
  const padY = 12
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const points = weeklyHours.map((d, i) => {
    const x = padX + (innerW * i) / (weeklyHours.length - 1)
    const y = padY + innerH * (1 - Math.min(d.hours / max, 1))
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">Horas por dia</h3>
          <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-card-foreground">{total.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground">média {avg.toFixed(1)}h/dia</p>
        </div>
      </div>

      <div className="mt-6 relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-32 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label="Gráfico de linhas das horas trabalhadas por dia"
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1={padX} y1={padY} x2={width - padX} y2={padY}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3"
          />

          <path d={areaPath} fill="url(#areaFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-2 flex justify-between">
        {weeklyHours.map((d) => {
          const reached = d.goal > 0 && d.hours >= d.goal
          return (
            <div key={d.day} className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium text-muted-foreground">{d.day}</span>
              <span
                className="text-xs font-medium tabular-nums"
                style={{ color: reached ? "var(--chart-4)" : "var(--card-foreground)" }}
              >
                {d.hours}h
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

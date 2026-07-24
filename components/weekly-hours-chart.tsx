"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { useApp } from "@/lib/context"
import { Select, type SelectOption } from "@/components/ui/select"

const periodOptions: SelectOption<string>[] = [
  { value: "7d", label: "Últimos 7 dias", icon: <Calendar className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "14d", label: "Últimos 14 dias", icon: <Calendar className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "month", label: "Este mês", icon: <Calendar className="size-3.5 text-muted-foreground shrink-0" /> },
]

export function WeeklyHoursChart() {
  const { userData } = useApp()
  const { weeklyHours } = userData
  const [period, setPeriod] = useState<string>("7d")
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const max = 8
  const total = weeklyHours.reduce((acc, d) => acc + d.hours, 0)
  const goalDays = weeklyHours.filter((d) => d.goal > 0).length
  const avg = goalDays > 0 ? total / goalDays : 0

  const width = 340
  const height = 130
  const padX = 12
  const padY = 16
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const points = weeklyHours.map((d, i) => {
    const x = padX + (innerW * i) / Math.max(weeklyHours.length - 1, 1)
    const y = padY + innerH * (1 - Math.min(d.hours / max, 1))
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-card-foreground">Horas por dia</h3>
          <p className="text-xs text-muted-foreground">Desempenho de registros diários</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-44">
            <Select
              value={period}
              onChange={setPeriod}
              options={periodOptions}
              triggerClassName="h-8 text-xs px-2.5 py-1"
            />
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-card-foreground tabular-nums">{total.toFixed(1)}h</p>
            <p className="text-[11px] text-muted-foreground">média {avg.toFixed(1)}h/dia</p>
          </div>
        </div>
      </div>

      <div className="mt-5 relative">
        {/* Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute -top-7 z-20 -translate-x-1/2 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold text-background shadow-md transition-all duration-150 animate-in fade-in zoom-in-95 pointer-events-none"
            style={{ left: `${(points[hoveredIndex].x / width) * 100}%` }}
          >
            {points[hoveredIndex].day}: {points[hoveredIndex].hours}h / {points[hoveredIndex].goal}h
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-32 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label="Gráfico de linhas das horas trabalhadas por dia"
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Goal Line (8h) */}
          <line
            x1={padX} y1={padY} x2={width - padX} y2={padY}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3"
          />

          <path d={areaPath} fill="url(#areaFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Interactive Points */}
          {points.map((p, i) => {
            const isHovered = hoveredIndex === i
            const reached = p.goal > 0 && p.hours >= p.goal
            return (
              <g key={p.day}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3.5}
                  className="transition-all duration-150 cursor-pointer"
                  fill={reached ? "var(--chart-4)" : "var(--primary)"}
                  stroke="var(--card)"
                  strokeWidth={2}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-2 flex justify-between">
        {weeklyHours.map((d, i) => {
          const reached = d.goal > 0 && d.hours >= d.goal
          const isHovered = hoveredIndex === i
          return (
            <div
              key={d.day}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex flex-col items-center gap-0.5 cursor-pointer rounded-lg px-2 py-1 transition-colors ${
                isHovered ? "bg-accent" : ""
              }`}
            >
              <span className="text-xs font-semibold text-muted-foreground">{d.day}</span>
              <span
                className="text-xs font-bold tabular-nums"
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

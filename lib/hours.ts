// Regras de horas compartilhadas entre app, API do agente e relatórios.

/** Arredonda para blocos de 30 min, sempre para cima, mínimo 0.5h (regra do apontamento ITSM). */
export function roundItsmHours(hours: number): number {
  if (!(hours > 0)) return 0
  return Math.max(0.5, Math.ceil(hours * 2 - 1e-9) / 2)
}

/** Horas com 2 casas a partir de segundos. */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100
}

/** 1.25 -> "1h 15m" */
export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0 && m === 0) return "0h"
  if (m === 60) return `${h + 1}h`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Segunda-feira 00:00 da semana da data. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function startOfQuarter(date: Date): Date {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)
}

export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export type Period = "today" | "week" | "month" | "quarter" | "year" | "all"

export function periodStart(period: Period, now = new Date()): Date | null {
  switch (period) {
    case "today":
      return startOfDay(now)
    case "week":
      return startOfWeek(now)
    case "month":
      return startOfMonth(now)
    case "quarter":
      return startOfQuarter(now)
    case "year":
      return startOfYear(now)
    default:
      return null
  }
}

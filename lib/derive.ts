// Cálculos derivados (puros) usados pelo AppProvider. Separados para teste.
import type { Task, TimeEntry } from "./data"
import { startOfMonth, startOfWeek } from "./hours"

export const WEEK_DAYS = [
  { day: "Seg", goal: 8 },
  { day: "Ter", goal: 8 },
  { day: "Qua", goal: 8 },
  { day: "Qui", goal: 8 },
  { day: "Sex", goal: 8 },
  { day: "Sáb", goal: 4 },
  { day: "Dom", goal: 0 },
]

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Posição fracionária entre dois vizinhos (undefined = ponta da lista).
 * Inserir entre dois cards não exige renumerar os demais.
 */
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return Date.now() / 1000
  if (before === undefined) return after! - 1
  if (after === undefined) return before + 1
  return (before + after) / 2
}

export const byPosition = (a: { position?: number }, b: { position?: number }) => (a.position ?? 0) - (b.position ?? 0)

/** Próximo código OCT-n (mínimo OCT-301). */
export function nextCode(tasks: Pick<Task, "code">[] = []): string {
  let maxNum = 300
  for (const t of tasks) {
    if (t.code?.startsWith("OCT-")) {
      const num = parseInt(t.code.replace("OCT-", ""), 10)
      if (!isNaN(num) && num > maxNum) maxNum = num
    }
  }
  return `OCT-${maxNum + 1}`
}

/** Horas do usuário por dia da semana atual (segunda a domingo). */
export function computeWeeklyHours(entries: TimeEntry[], userId: string, now = new Date()) {
  const weekStart = startOfWeek(now)
  const days = WEEK_DAYS.map((d) => ({ ...d, hours: 0 }))
  for (const e of entries) {
    if (e.userId !== userId) continue
    const d = new Date(e.startedAt)
    // diferença em dias de calendário (imune a horário de verão)
    const idx = Math.round(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - weekStart.getTime()) / 86_400_000
    )
    if (idx >= 0 && idx < 7) days[idx].hours += e.hours
  }
  return days.map((d) => ({ ...d, hours: round2(d.hours) }))
}

/** Horas do usuário no mês por categoria (primeira tag da tarefa; reuniões e avulsas à parte). */
export function computeActivityBreakdown(entries: TimeEntry[], tasks: Task[], userId: string, now = new Date()) {
  const monthStart = startOfMonth(now).getTime()
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const byCategory = new Map<string, { hours: number; color: string }>()
  for (const e of entries) {
    if (e.userId !== userId || e.startedAt < monthStart) continue
    const label = e.taskId ? taskById.get(e.taskId)?.labels?.[0] : undefined
    const key = label?.name ?? (e.source === "meeting" ? "Reuniões" : "Sem categoria")
    const color = label?.color ?? (e.source === "meeting" ? "#a855f7" : "#94a3b8")
    const cur = byCategory.get(key) ?? { hours: 0, color }
    cur.hours += e.hours
    byCategory.set(key, cur)
  }
  return [...byCategory.entries()]
    .map(([name, v]) => ({ name, hours: round2(v.hours), color: v.color }))
    .sort((a, b) => b.hours - a.hours)
}

/** Total de horas do usuário no mês corrente (1 casa). */
export function computeHoursMonth(entries: TimeEntry[], userId: string, now = new Date()) {
  const monthStart = startOfMonth(now).getTime()
  const total = entries.filter((e) => e.userId === userId && e.startedAt >= monthStart).reduce((acc, e) => acc + e.hours, 0)
  return Math.round(total * 10) / 10
}

/** Tarefas concluídas dentro do mês corrente. */
export function computeCompletedThisMonth(tasks: Task[], now = new Date()) {
  const monthStart = startOfMonth(now).getTime()
  return tasks.filter((t) => t.column === "done" && (t.completedAt ?? 0) >= monthStart).length
}

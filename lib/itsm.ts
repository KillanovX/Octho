// Apontamento ITSM: worklog no formato do vault, minuta para o SControl e fechamento do dia.
// Regras (AGENTS.md do vault): blocos de 30 min arredondados para cima, mínimo 0.5h;
// fim registrado = início + duração arredondada; datas ao leitor em DD-MM-AAAA.
import type { Task, TimeEntry } from "./data"
import { roundItsmHours, startOfDay } from "./hours"

const pad = (n: number) => String(n).padStart(2, "0")
export const dmy = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}
const hhmm = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export type Session = {
  entry: TimeEntry
  hoursItsm: number
  /** "### DD-MM-AAAA | HH:MM-HH:MM (0.5h) | Título" */
  heading: string
  title: string
}

/** Título da sessão: nota do lançamento ou origem. */
export function sessionTitle(entry: TimeEntry): string {
  const note = entry.note?.replace(/\s*\(horario nao registrado no vault\)\s*$/i, "").trim()
  if (note) return note
  if (entry.source === "meeting") return "Reunião"
  if (entry.source === "timer") return "Sessão de trabalho"
  return "Atuação no chamado"
}

export function toSession(entry: TimeEntry): Session {
  const hoursItsm = roundItsmHours(entry.hours)
  const end = entry.startedAt + hoursItsm * 3_600_000
  const noTime = /horario nao registrado/i.test(entry.note ?? "")
  const span = noTime ? "horario nao registrado" : `${hhmm(entry.startedAt)}-${hhmm(end)}`
  const title = sessionTitle(entry)
  return { entry, hoursItsm, title, heading: `### ${dmy(entry.startedAt)} | ${span} (${hoursItsm.toFixed(1)}h) | ${title}` }
}

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)
const sentence = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ")
  return /[.!?]$/.test(t) ? t : `${t}.`
}

/**
 * Minuta em parágrafo corrido, primeira pessoa do plural, tom de relato ao cliente.
 * É um rascunho: o texto final deve ser revisado (o app não sabe a causa raiz).
 */
export function buildMinuta(task: Pick<Task, "title" | "externalRef" | "checkpoints">, entries: TimeEntry[]): string {
  if (entries.length === 0) return ""
  const sessions = [...entries].sort((a, b) => a.startedAt - b.startedAt).map(toSession)
  const total = sessions.reduce((acc, s) => acc + s.hoursItsm, 0)
  const alvo = task.externalRef ? `no chamado #${task.externalRef} (${task.title})` : `na demanda ${task.title}`
  const quantas = sessions.length === 1 ? "uma sessão" : `${sessions.length} sessões`

  const feitos = [...new Set(sessions.map((s) => s.title).filter((t) => !/^(Sessão de trabalho|Atuação no chamado|Reunião)$/.test(t)))]
  const partes = [`Realizamos ${quantas} de atuação ${alvo}, totalizando ${total.toFixed(1)}h.`]
  if (feitos.length) partes.push(sentence(`Nesse período, trabalhamos em: ${feitos.map(lowerFirst).join("; ")}`))

  const proxima = (task.checkpoints ?? []).find((c) => c.kind !== "log" && !c.completed)
  if (proxima) partes.push(sentence(`Como próximo passo, ${lowerFirst(proxima.title.replace(/^[^:]{1,60}:\s*/, ""))}`))
  return partes.join(" ")
}

export type ClosingGroup = {
  task: Task | null
  sessions: Session[]
  hours: number
  hoursItsm: number
  billable: boolean
  minuta: string
}

export type DayClosing = {
  groups: ClosingGroup[]
  totalHours: number
  billableItsm: number
  internalItsm: number
  warnings: string[]
}

/** Lançamentos do usuário no dia, agrupados por tarefa (faturável = tarefa ligada a chamado). */
export function buildDayClosing(day: Date, entries: TimeEntry[], tasks: Task[], userId: string): DayClosing {
  const start = startOfDay(day).getTime()
  const end = start + 86_400_000
  const mine = entries.filter((e) => e.userId === userId && e.startedAt >= start && e.startedAt < end)
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  const byKey = new Map<string, TimeEntry[]>()
  for (const e of mine) {
    const key = e.taskId && taskById.has(e.taskId) ? e.taskId : "__sem_tarefa"
    byKey.set(key, [...(byKey.get(key) ?? []), e])
  }

  const groups: ClosingGroup[] = [...byKey.entries()].map(([key, list]) => {
    const task = key === "__sem_tarefa" ? null : taskById.get(key)!
    const sessions = list.sort((a, b) => a.startedAt - b.startedAt).map(toSession)
    return {
      task,
      sessions,
      hours: Math.round(list.reduce((a, e) => a + e.hours, 0) * 100) / 100,
      hoursItsm: sessions.reduce((a, s) => a + s.hoursItsm, 0),
      billable: !!task?.externalRef,
      minuta: task ? buildMinuta(task, list) : "",
    }
  })
  groups.sort((a, b) => Number(b.billable) - Number(a.billable) || b.hoursItsm - a.hoursItsm)

  const warnings: string[] = []
  const semTarefa = byKey.get("__sem_tarefa")?.length ?? 0
  if (semTarefa) warnings.push(`${semTarefa} lançamento(s) sem tarefa: vincule a um chamado ou confirme que é interno.`)
  const semHorario = mine.filter((e) => /horario nao registrado/i.test(e.note ?? "")).length
  if (semHorario) warnings.push(`${semHorario} sessão(ões) sem horário registrado: confirme o horário antes de apontar.`)
  const semChamado = groups.filter((g) => g.task && !g.billable).length
  if (semChamado) warnings.push(`${semChamado} tarefa(s) com horas e sem chamado ITSM vinculado.`)

  return {
    groups,
    totalHours: Math.round(mine.reduce((a, e) => a + e.hours, 0) * 100) / 100,
    billableItsm: groups.filter((g) => g.billable).reduce((a, g) => a + g.hoursItsm, 0),
    internalItsm: groups.filter((g) => !g.billable).reduce((a, g) => a + g.hoursItsm, 0),
    warnings,
  }
}

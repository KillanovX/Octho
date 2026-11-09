"use client"

import React, { useMemo, useState } from "react"
import { Clock, Calendar, Plus, Filter, Search, CheckCircle2, ListChecks, Trash2, Users, X } from "lucide-react"
import { useApp } from "@/lib/context"
import { Select, SelectOption } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { periodStart, roundItsmHours, type Period } from "@/lib/hours"
import type { TimeEntrySource } from "@/lib/data"

const periodOptions: SelectOption<string>[] = [
  { value: "all", label: "Todo o período", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "year", label: "Este ano", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "month", label: "Este mês", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "week", label: "Esta semana", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "today", label: "Hoje", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
]

const scopeOptions: SelectOption<string>[] = [
  { value: "mine", label: "Meus lançamentos", icon: <Clock className="size-3.5 text-muted-foreground" /> },
  { value: "team", label: "Toda a equipe", icon: <Users className="size-3.5 text-muted-foreground" /> },
]

const sourceLabel: Record<TimeEntrySource, string> = {
  timer: "Timer",
  meeting: "Reunião",
  manual: "Manual",
  agent: "Hermes / vault",
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function TimeLogView() {
  const { userData, timeEntries, profilesList, currentUser, isAdmin, addTimeEntry, deleteTimeEntry, logActivity } = useApp()
  const { tasks } = userData

  const [periodFilter, setPeriodFilter] = useState("month")
  const [scope, setScope] = useState("mine")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showForm, setShowForm] = useState(false)

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const userById = useMemo(() => new Map(profilesList.map((p) => [p.id, p])), [profilesList])

  const categoryOptions: SelectOption<string>[] = useMemo(() => {
    const names = new Set<string>()
    tasks.forEach((t) => t.labels.forEach((l) => names.add(l.name)))
    return [
      { value: "all", label: "Todas as categorias", icon: <Filter className="size-3.5 text-muted-foreground" /> },
      ...[...names].sort().map((n) => ({ value: n, label: n })),
    ]
  }, [tasks])

  const filtered = useMemo(() => {
    const start = periodStart(periodFilter as Period)?.getTime() ?? 0
    const q = searchQuery.trim().toLowerCase()
    return timeEntries.filter((e) => {
      if (e.startedAt < start) return false
      if (scope === "mine" && e.userId !== currentUser.id) return false
      const task = e.taskId ? taskById.get(e.taskId) : undefined
      if (categoryFilter !== "all" && !task?.labels.some((l) => l.name === categoryFilter)) return false
      if (q) {
        const hay = `${task?.code ?? ""} ${task?.title ?? ""} ${task?.externalRef ?? ""} ${e.note ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [timeEntries, periodFilter, scope, categoryFilter, searchQuery, currentUser.id, taskById])

  const totalLogged = filtered.reduce((acc, e) => acc + e.hours, 0)
  const totalItsm = filtered.reduce((acc, e) => acc + roundItsmHours(e.hours), 0)
  const hoursByTask = new Map<string, number>()
  filtered.forEach((e) => e.taskId && hoursByTask.set(e.taskId, (hoursByTask.get(e.taskId) ?? 0) + e.hours))
  const top = [...hoursByTask.entries()].sort((a, b) => b[1] - a[1])[0]
  const topTask = top ? taskById.get(top[0]) : undefined

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Registro de Horas</h2>
            <p className="text-xs text-muted-foreground">Lançamentos do timer, de reuniões, manuais e do Hermes / vault</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            Lançar horas
          </button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total no período" icon={<Clock className="size-4" />} value={`${totalLogged.toFixed(2)}h`} sub={`${filtered.length} lançamentos`} />
          <SummaryCard
            label="Total para apontamento"
            icon={<ListChecks className="size-4" />}
            value={`${totalItsm.toFixed(1)}h`}
            sub="Blocos de 30 min, arredondados para cima"
          />
          <SummaryCard
            label="Maior alocação"
            icon={<CheckCircle2 className="size-4" />}
            value={topTask ? topTask.code : "N/A"}
            sub={topTask && top ? `${top[1].toFixed(2)}h — ${topTask.title}` : "Sem lançamentos"}
          />
          <SummaryCard
            label="Tarefas com horas"
            icon={<Filter className="size-4" />}
            value={String(hoursByTask.size)}
            sub={scope === "mine" ? currentUser.name : "Toda a equipe"}
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex min-w-[200px] flex-1 items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, título, chamado ou nota..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <Select value={scope} onChange={setScope} options={scopeOptions} triggerClassName="h-9 text-xs" />
            </div>
            <div className="w-40">
              <Select value={periodFilter} onChange={setPeriodFilter} options={periodOptions} triggerClassName="h-9 text-xs" />
            </div>
            <div className="w-48">
              <Select value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} triggerClassName="h-9 text-xs" />
            </div>
          </div>
        </div>

        {/* Lançamentos */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5 text-sm font-semibold text-card-foreground">Lançamentos</div>
          {filtered.length > 0 ? (
            <div className="divide-y divide-border">
              {filtered.map((e) => {
                const task = e.taskId ? taskById.get(e.taskId) : undefined
                const user = userById.get(e.userId)
                const canDelete = e.userId === currentUser.id || isAdmin
                return (
                  <div key={e.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="size-8 shrink-0">
                        {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={user.name} />}
                        <AvatarFallback style={{ backgroundColor: user?.avatarColor ?? "#888", color: "#fff" }} className="text-xs font-semibold">
                          {user?.avatar ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-muted-foreground">{task?.code ?? "—"}</span>
                          <span className="truncate text-sm font-medium text-foreground">{task?.title ?? e.note ?? "Sem tarefa"}</span>
                          {task?.externalRef && (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">#{task.externalRef}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(e.startedAt).toLocaleDateString("pt-BR")}{" "}
                            {new Date(e.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{sourceLabel[e.source]}</span>
                          {e.note && task && <span className="truncate">{e.note}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-4">
                      <div className="flex min-w-[70px] items-center justify-end gap-1 text-sm font-bold text-foreground">
                        <Clock className="size-3.5 text-primary" />
                        <span>{e.hours.toFixed(2)}h</span>
                      </div>
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (confirm("Excluir este lançamento?")) deleteTimeEntry(e.id)
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Excluir lançamento"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
              <Clock className="mb-2 size-8 text-muted-foreground/50" />
              Nenhum lançamento encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ManualEntryForm
          tasks={tasks.map((t) => ({ id: t.id, label: `${t.code} — ${t.title}` }))}
          onClose={() => setShowForm(false)}
          onSubmit={async ({ taskId, date, time, hours, note }) => {
            const startedAt = new Date(`${date}T${time || "09:00"}:00`).getTime()
            const entry = await addTimeEntry({
              taskId: taskId || undefined,
              startedAt,
              endedAt: startedAt + hours * 3_600_000,
              hours,
              source: "manual",
              note: note || undefined,
            })
            if (entry) {
              const task = taskId ? taskById.get(taskId) : undefined
              logActivity(`lançou ${hours.toFixed(2)}h em`, task ? `${task.code} — ${task.title}` : note || "atividade avulsa")
              setShowForm(false)
            }
          }}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, icon, value, sub }: { label: string; icon: React.ReactNode; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
      <p className="mt-2 truncate text-2xl font-bold text-card-foreground">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

type ManualEntryInput = { taskId: string; date: string; time: string; hours: number; note: string }

function ManualEntryForm({
  tasks,
  onClose,
  onSubmit,
}: {
  tasks: { id: string; label: string }[]
  onClose: () => void
  onSubmit: (v: ManualEntryInput) => Promise<void>
}) {
  const [taskId, setTaskId] = useState("")
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState("09:00")
  const [hours, setHours] = useState("1")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault()
          const h = parseFloat(hours.replace(",", "."))
          if (!(h > 0 && h <= 24)) return setError("Informe as horas entre 0 e 24 (ex: 1.5).")
          if (!taskId && !note.trim()) return setError("Escolha uma tarefa ou descreva a atividade.")
          setError(null)
          setSaving(true)
          await onSubmit({ taskId, date, time, hours: h, note: note.trim() })
          setSaving(false)
        }}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Lançar horas</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        {error && <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Tarefa
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className={inputClass}>
            <option value="">Sem tarefa (atividade avulsa)</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-1 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Início
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Horas
            <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Nota
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que foi feito" className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar lançamento"}
        </button>
      </form>
    </div>
  )
}

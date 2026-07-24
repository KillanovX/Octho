"use client"

import React, { useState, useMemo } from "react"
import {
  Video,
  Plus,
  Clock,
  CalendarDays,
  Link2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Edit3,
  X,
  Users,
  ArrowRight,
  Timer,
  Building2,
} from "lucide-react"
import { useApp } from "@/lib/context"
import { type Meeting, type MeetingStatus } from "@/lib/meetings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, type SelectOption } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getStoredClients, saveStoredClient } from "@/lib/clients-service"

// ─── Duration helpers ────────────────────────────────────────────
function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
}

// ─── Status config ───────────────────────────────────────────────
const statusConfig: Record<MeetingStatus, { label: string; icon: typeof Circle; className: string; bg: string }> = {
  planned:   { label: "Planejada",  icon: Circle,        className: "text-blue-500",   bg: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800" },
  completed: { label: "Concluída", icon: CheckCircle2,   className: "text-emerald-500", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800" },
  cancelled: { label: "Cancelada", icon: AlertCircle,   className: "text-rose-500",    bg: "bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800" },
}

const durationOptions: SelectOption<string>[] = [
  { value: "15",  label: "15 minutos" },
  { value: "30",  label: "30 minutos" },
  { value: "45",  label: "45 minutos" },
  { value: "60",  label: "1 hora" },
  { value: "90",  label: "1h 30min" },
  { value: "120", label: "2 horas" },
  { value: "180", label: "3 horas" },
  { value: "custom", label: "Personalizado..." },
]

const statusOptions: SelectOption<MeetingStatus>[] = [
  { value: "planned",   label: "Planejada" },
  { value: "completed", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
]

// ─── Meeting Form ─────────────────────────────────────────────────
function MeetingForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Meeting>
  onSave: (m: Omit<Meeting, "id">) => void
  onCancel: () => void
}) {
  const { userData } = useApp()
  const activeTasks = userData.tasks.filter((t) => t.column !== "done")

  const [title, setTitle]               = useState(initial?.title ?? "")
  const [date, setDate]                 = useState(initial?.date ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime]       = useState(initial?.startTime ?? "")
  const [client, setClient]             = useState(initial?.client ?? "")
  const [durationSel, setDurationSel]   = useState<string>(
    initial?.durationMinutes ? String(initial.durationMinutes) : "60"
  )
  const [customMin, setCustomMin]       = useState(String(initial?.durationMinutes ?? 60))
  const [linkedTaskId, setLinkedTaskId] = useState<string>(initial?.linkedTaskId ?? "")
  const [summary, setSummary]           = useState(initial?.summary ?? "")
  const [status, setStatus]             = useState<MeetingStatus>(initial?.status ?? "planned")

  const durationMinutes = durationSel === "custom" ? parseInt(customMin) || 60 : parseInt(durationSel)

  const taskOptions: SelectOption<string>[] = [
    { value: "", label: "Nenhuma tarefa vinculada" },
    ...activeTasks.map((t) => ({
      value: t.id,
      label: t.title,
      description: t.code,
    })),
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const linkedTask = activeTasks.find((t) => t.id === linkedTaskId)
    const cleanClient = client.trim() || undefined
    if (cleanClient) saveStoredClient(cleanClient)
    onSave({
      title: title.trim(),
      date,
      startTime: startTime || undefined,
      durationMinutes,
      client: cleanClient,
      linkedTaskId: linkedTaskId || undefined,
      linkedTaskCode: linkedTask?.code,
      linkedTaskTitle: linkedTask?.title,
      summary: summary.trim() || undefined,
      status,
      hoursAddedToTask: initial?.hoursAddedToTask,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Título da Reunião</label>
        <Input
          autoFocus
          placeholder="Ex: Daily, Planning Sprint 5, Review..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring shadow-sm"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horário (opcional)</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="flex h-9 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring shadow-sm"
          />
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duração</label>
        <Select
          value={durationSel}
          onChange={setDurationSel}
          options={durationOptions}
        />
        {durationSel === "custom" && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              min={1}
              max={480}
              placeholder="Minutos"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              className="rounded-xl w-32"
            />
            <span className="text-sm text-muted-foreground">minutos ({fmtDuration(parseInt(customMin) || 0)})</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
        <Select<MeetingStatus>
          value={status}
          onChange={setStatus}
          options={statusOptions}
        />
      </div>

      {/* Cliente */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Building2 className="size-3" />
          Cliente (opcional)
        </label>
        <Input
          placeholder="Ex: Acme Corp, TechLabs, Banco Itaú..."
          list="meeting-clients-list"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className="rounded-xl"
        />
        <datalist id="meeting-clients-list">
          {getStoredClients().map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* Link to Task */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Link2 className="size-3" />
          Vincular a uma tarefa
        </label>
        <Select
          value={linkedTaskId}
          onChange={setLinkedTaskId}
          options={taskOptions}
          placeholder="Selecionar tarefa..."
        />
        {linkedTaskId && (
          <p className="text-[11px] text-muted-foreground pl-1">
            As horas desta reunião ({fmtDuration(durationMinutes)}) poderão ser adicionadas à tarefa vinculada.
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="size-3" />
          Resumo / Notas
        </label>
        <div className="relative rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring transition-shadow">
          <textarea
            placeholder="Pautas, decisões, próximos passos..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full bg-transparent px-4 pt-3 pb-3 text-sm text-foreground outline-none placeholder:text-muted-foreground min-h-[90px] resize-none rounded-xl"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
          Cancelar
        </Button>
        <Button type="submit" className="rounded-xl gap-1.5">
          <Plus className="size-4" />
          {initial ? "Salvar Alterações" : "Registrar Reunião"}
        </Button>
      </div>
    </form>
  )
}

// ─── Meeting Card ─────────────────────────────────────────────────
function MeetingCard({
  meeting,
  onEdit,
  onDelete,
  onAddHours,
}: {
  meeting: Meeting
  onEdit: () => void
  onDelete: () => void
  onAddHours: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sc = statusConfig[meeting.status]
  const StatusIcon = sc.icon

  return (
    <div
      className={cn(
        "group rounded-2xl border border-border bg-card overflow-hidden",
        "transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-black/5",
        meeting.status === "cancelled" && "opacity-60"
      )}
    >
      {/* Main Row */}
      <div className="flex items-start gap-4 p-4">
        {/* Time column */}
        <div className="flex flex-col items-center gap-1 shrink-0 w-14 pt-0.5">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/8 border border-primary/15">
            <Video className="size-4 text-primary" />
          </div>
          {meeting.startTime && (
            <span className="text-[10px] font-mono text-muted-foreground">{meeting.startTime}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={cn(
                "font-semibold text-card-foreground truncate",
                meeting.status === "cancelled" && "line-through text-muted-foreground"
              )}>
                {meeting.title}
              </h3>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {fmtDate(meeting.date)}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="size-3" />
                  {fmtDuration(meeting.durationMinutes)}
                </span>
                {meeting.client && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
                    <Building2 className="size-3 text-primary" />
                    {meeting.client}
                  </span>
                )}
                {meeting.linkedTaskCode && (
                  <span className="flex items-center gap-1 text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                    <Link2 className="size-2.5" />
                    {meeting.linkedTaskCode}
                  </span>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span className={cn(
              "shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              sc.bg
            )}>
              <StatusIcon className="size-3" />
              {sc.label}
            </span>
          </div>

          {/* Summary preview */}
          {meeting.summary && !expanded && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {meeting.summary}
            </p>
          )}

          {/* Expanded summary */}
          {expanded && meeting.summary && (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 animate-in fade-in duration-150">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="size-3" /> Resumo
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{meeting.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 bg-muted/20">
        <div className="flex items-center gap-1">
          {/* Add hours to task */}
          {meeting.linkedTaskId && meeting.status === "completed" && (
            meeting.hoursAddedToTask ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                {fmtDuration(meeting.durationMinutes)} adicionados à tarefa
              </span>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                onClick={onAddHours}
                className="h-7 gap-1.5 text-xs rounded-lg text-primary hover:bg-primary/10"
              >
                <ArrowRight className="size-3" />
                Adicionar {fmtDuration(meeting.durationMinutes)} à tarefa
              </Button>
            )
          )}
        </div>

        <div className="flex items-center gap-1">
          {meeting.summary && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {expanded ? "Ocultar resumo" : "Ver resumo"}
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-1 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Editar reunião"
          >
            <Edit3 className="size-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Excluir reunião"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────
type FilterType = "all" | MeetingStatus

export function MeetingsView() {
  const { meetings, addMeeting, updateMeeting, deleteMeeting, addMeetingHoursToTask } = useApp()

  const [showForm, setShowForm]   = useState(false)
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null)
  const [filter, setFilter]       = useState<FilterType>("all")
  const [sortDesc, setSortDesc]   = useState(true)

  const filtered = useMemo(() => {
    let list = filter === "all" ? meetings : meetings.filter((m) => m.status === filter)
    list = [...list].sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
      return sortDesc ? diff : -diff
    })
    return list
  }, [meetings, filter, sortDesc])

  const totalMinutes = useMemo(
    () => meetings.filter((m) => m.status === "completed").reduce((acc, m) => acc + m.durationMinutes, 0),
    [meetings]
  )

  const handleSave = (m: Omit<Meeting, "id">) => {
    if (editMeeting) {
      updateMeeting(editMeeting.id, m)
      setEditMeeting(null)
    } else {
      addMeeting(m)
      setShowForm(false)
    }
  }

  const filterOptions: { key: FilterType; label: string; count: number }[] = [
    { key: "all",       label: "Todas",      count: meetings.length },
    { key: "planned",   label: "Planejadas", count: meetings.filter((m) => m.status === "planned").length },
    { key: "completed", label: "Concluídas", count: meetings.filter((m) => m.status === "completed").length },
    { key: "cancelled", label: "Canceladas", count: meetings.filter((m) => m.status === "cancelled").length },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[860px] flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Video className="size-4.5 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Reuniões</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Registre suas calls, acompanhe durações e vincule às tarefas
            </p>
          </div>
          <Button
            onClick={() => { setShowForm(true); setEditMeeting(null) }}
            className="rounded-xl gap-2 shadow-sm shadow-primary/20 hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            Nova Reunião
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total",      value: meetings.length,                                                   icon: Video,        color: "text-primary",   bg: "bg-primary/8" },
            { label: "Planejadas", value: meetings.filter((m) => m.status === "planned").length,             icon: Circle,       color: "text-blue-500",  bg: "bg-blue-500/8" },
            { label: "Concluídas", value: meetings.filter((m) => m.status === "completed").length,           icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/8" },
            { label: "Horas em reuniões", value: fmtDuration(totalMinutes),                                  icon: Clock,        color: "text-violet-500", bg: "bg-violet-500/8" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className={cn("flex size-8 items-center justify-center rounded-lg mb-3", s.bg)}>
                <s.icon className={cn("size-4", s.color)} />
              </div>
              <p className="text-xl font-bold text-card-foreground tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* New / Edit Form */}
        {(showForm || editMeeting) && (
          <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Video className="size-4 text-primary" />
                {editMeeting ? "Editar Reunião" : "Nova Reunião"}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditMeeting(null) }}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-accent transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <MeetingForm
              initial={editMeeting ?? undefined}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditMeeting(null) }}
            />
          </div>
        )}

        {/* Filter Tabs + Sort */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border">
            {filterOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                  filter === f.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
              >
                {f.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-bold",
                  filter === f.key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortDesc((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <CalendarDays className="size-3.5" />
            {sortDesc ? "Mais recentes" : "Mais antigas"}
            {sortDesc ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </button>
        </div>

        {/* Meetings List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center animate-in fade-in duration-300">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
              <Video className="size-7 text-muted-foreground/50" />
            </div>
            <p className="text-base font-semibold text-muted-foreground">
              {filter === "all" ? "Nenhuma reunião registrada" : `Nenhuma reunião ${statusConfig[filter as MeetingStatus]?.label.toLowerCase()}`}
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {filter === "all" && "Clique em \"Nova Reunião\" para começar a registrar suas calls."}
            </p>
            {filter === "all" && (
              <Button
                className="mt-6 rounded-xl gap-2"
                onClick={() => setShowForm(true)}
              >
                <Plus className="size-4" />
                Registrar primeira reunião
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((m, i) => (
              <div
                key={m.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-200"
                style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
              >
                <MeetingCard
                  meeting={m}
                  onEdit={() => { setEditMeeting(m); setShowForm(false) }}
                  onDelete={() => deleteMeeting(m.id)}
                  onAddHours={() => m.linkedTaskId && addMeetingHoursToTask(m.id, m.linkedTaskId)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

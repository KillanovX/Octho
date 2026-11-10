"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Briefcase, Building, ChevronLeft, ChevronRight, Clock, ExternalLink } from "lucide-react"
import { useApp } from "@/lib/context"
import { buildDayClosing, dmy } from "@/lib/itsm"
import { startOfDay } from "@/lib/hours"
import { obsidianUrl } from "@/lib/obsidian"
import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"

const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** Fechamento do dia: o que apontar no ITSM, por chamado, com alertas antes de fechar. */
export function ClosingView() {
  const { timeEntries, userData, currentUser, timer } = useApp()
  const [day, setDay] = useState(() => startOfDay(new Date()))
  const closing = useMemo(() => buildDayClosing(day, timeEntries, userData.tasks, currentUser.id), [day, timeEntries, userData.tasks, currentUser.id])

  const isToday = startOfDay(new Date()).getTime() === day.getTime()
  const shift = (days: number) => setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days))
  const warnings = [...closing.warnings]
  if (isToday && timer.taskId) warnings.unshift(`Timer ainda ${timer.running ? "rodando" : "pausado"} em ${timer.taskCode}: registre antes de fechar o dia.`)

  const allText = closing.groups
    .filter((g) => g.task)
    .map((g) => [`${g.task!.externalRef ? `#${g.task!.externalRef}` : g.task!.code} — ${g.task!.title} (${g.hoursItsm.toFixed(1)}h)`, ...g.sessions.map((s) => s.heading), "", g.minuta].join("\n"))
    .join("\n\n---\n\n")

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Fechamento do dia</h2>
            <p className="text-xs text-muted-foreground">Sessões por chamado no formato do worklog e minutas prontas para o apontamento ITSM</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Dia anterior">
              <ChevronLeft className="size-4" />
            </button>
            <input
              type="date"
              value={toInput(day)}
              onChange={(e) => e.target.value && setDay(startOfDay(new Date(`${e.target.value}T12:00:00`)))}
              aria-label="Dia"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => shift(1)}
              disabled={isToday}
              className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
              aria-label="Próximo dia"
            >
              <ChevronRight className="size-4" />
            </button>
            <CopyButton text={allText} label="Copiar tudo" className="h-9" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat icon={<Briefcase className="size-4" />} label="Faturável (chamados)" value={`${closing.billableItsm.toFixed(1)}h`} sub="Arredondado em blocos de 30 min" />
          <Stat icon={<Building className="size-4" />} label="Interno / sem chamado" value={`${closing.internalItsm.toFixed(1)}h`} sub="Não entra no apontamento do cliente" />
          <Stat icon={<Clock className="size-4" />} label="Tempo real registrado" value={`${closing.totalHours.toFixed(2)}h`} sub={dmy(day.getTime())} />
        </div>

        {warnings.length > 0 && (
          <div role="status" className="flex flex-col gap-2 rounded-xl border border-chart-3/40 bg-chart-3/10 p-4">
            {warnings.map((w) => (
              <p key={w} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-3" aria-hidden="true" />
                {w}
              </p>
            ))}
          </div>
        )}

        {closing.groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhum lançamento em {dmy(day.getTime())}.
          </div>
        ) : (
          closing.groups.map((g, i) => (
            <article
              key={g.task?.id ?? "sem-tarefa"}
              className="rounded-xl border border-border bg-card animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-2">
                  {g.task?.externalRef ? (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">#{g.task.externalRef}</span>
                  ) : (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{g.task ? "Sem chamado" : "Sem tarefa"}</span>
                  )}
                  <h3 className="truncate text-sm font-semibold text-card-foreground">{g.task ? `${g.task.code} — ${g.task.title}` : "Lançamentos avulsos"}</h3>
                  {obsidianUrl(g.task?.vaultPath) && (
                    <a href={obsidianUrl(g.task?.vaultPath)!} className="text-muted-foreground hover:text-primary" title="Abrir chamado no Obsidian" aria-label="Abrir chamado no Obsidian">
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
                <span className={cn("text-sm font-bold tabular-nums", g.billable ? "text-foreground" : "text-muted-foreground")}>{g.hoursItsm.toFixed(1)}h</span>
              </header>
              <div className="grid gap-4 p-5 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Worklog</h4>
                    <CopyButton text={g.sessions.map((s) => s.heading).join("\n\n")} />
                  </div>
                  <pre className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">{g.sessions.map((s) => s.heading).join("\n")}</pre>
                </div>
                {g.minuta && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minuta SControl</h4>
                      <CopyButton text={g.minuta} />
                    </div>
                    <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-foreground">{g.minuta}</p>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-card-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

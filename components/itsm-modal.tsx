"use client"

import { useMemo, useState } from "react"
import { ClipboardCheck, X } from "lucide-react"
import { useApp } from "@/lib/context"
import { useModal } from "@/lib/use-modal"
import { buildMinuta, toSession } from "@/lib/itsm"
import { periodStart, type Period } from "@/lib/hours"
import type { Task } from "@/lib/data"
import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Semana" },
  { id: "all", label: "Tudo" },
]

/** Apontamento de uma tarefa: sessões no formato do worklog do vault + minuta para o SControl. */
export function ItsmModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: Task }) {
  const { timeEntries, currentUser } = useApp()
  const [period, setPeriod] = useState<Period>("today")
  const [draft, setDraft] = useState<string | null>(null)
  const panelRef = useModal(open, onClose)

  const entries = useMemo(() => {
    const start = periodStart(period)?.getTime() ?? 0
    return timeEntries
      .filter((e) => e.taskId === task.id && e.userId === currentUser.id && e.startedAt >= start)
      .sort((a, b) => a.startedAt - b.startedAt)
  }, [timeEntries, task.id, currentUser.id, period])

  const sessions = entries.map(toSession)
  const total = sessions.reduce((a, s) => a + s.hoursItsm, 0)
  const minuta = draft ?? buildMinuta(task, entries)
  const worklog = sessions.map((s) => s.heading).join("\n\n")

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Apontamento ITSM de ${task.code}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">Apontamento ITSM</h3>
              <p className="text-xs text-muted-foreground">
                {task.code}
                {task.externalRef ? ` · chamado #${task.externalRef}` : " · sem chamado vinculado"} · blocos de 30 min arredondados para cima
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Período" className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={period === p.id}
                  onClick={() => {
                    setPeriod(p.id)
                    setDraft(null)
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    period === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Total para apontar: <span className="font-bold tabular-nums text-foreground">{total.toFixed(1)}h</span>
            </p>
          </div>

          {sessions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhum lançamento seu nesta tarefa no período.
            </p>
          ) : (
            <>
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Worklog (formato do vault)</h4>
                  <CopyButton text={worklog} label="Copiar worklog" />
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
                  {worklog}
                </pre>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minuta para o SControl</h4>
                  <CopyButton text={minuta} label="Copiar minuta" />
                </div>
                <textarea
                  value={minuta}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  aria-label="Minuta para o SControl"
                  className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Rascunho gerado a partir das notas das sessões e da próxima ação. Revise e complete com o que foi constatado e a causa antes de apontar.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

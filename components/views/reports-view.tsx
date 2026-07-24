"use client"

import React, { useState } from "react"
import { BarChart3, PieChart, Download, Users, CheckCircle2, Calendar, Target, Award, ArrowUpRight } from "lucide-react"
import { useApp, users } from "@/lib/context"
import { Select, SelectOption } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const timeframeOptions: SelectOption<string>[] = [
  { value: "month", label: "Este Mês", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "quarter", label: "Este Trimestre", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "year", label: "Este Ano", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
]

export function ReportsView() {
  const { userData } = useApp()
  const { tasks } = userData

  const [timeframe, setTimeframe] = useState("month")
  const [exported, setExported] = useState(false)

  // Aggregations
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.column === "done").length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalLogged = tasks.reduce((acc, t) => acc + t.hoursLogged, 0)
  const totalEstimated = tasks.reduce((acc, t) => acc + t.estimate, 0)
  const avgHoursPerTask = completedTasks > 0 ? (totalLogged / completedTasks).toFixed(1) : "0"

  // Hours by assignee
  const assigneeStats = users.map((u) => {
    const userTasks = tasks.filter((t) => {
      const target = [u.id, u.name, u.email, u.avatar].filter(Boolean).map((s) => s.toLowerCase())
      const a = (t.assignee || "").toLowerCase()
      const an = (t.assigneeName || "").toLowerCase()
      const aa = (t.assigneeAvatar || "").toLowerCase()
      return target.some((val) => val === a || val === an || val === aa)
    })
    const hours = userTasks.reduce((acc, t) => acc + t.hoursLogged, 0)
    const done = userTasks.filter((t) => t.column === "done").length
    return { ...u, hours, done, total: userTasks.length }
  })

  // Priority breakdown
  const prioritiesCount = {
    urgent: tasks.filter((t) => t.priority === "urgent").length,
    high: tasks.filter((t) => t.priority === "high").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    low: tasks.filter((t) => t.priority === "low").length,
    none: tasks.filter((t) => t.priority === "none").length,
  }

  const handleExportCSV = () => {
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="size-4" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Relatórios & Analytics</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Métricas de desempenho, produtividade da equipe e alocação de tempo
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                value={timeframe}
                onChange={setTimeframe}
                options={timeframeOptions}
                triggerClassName="h-9 text-xs"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-sm shadow-primary/20"
            >
              <Download className="size-3.5" />
              <span>{exported ? "Exportado!" : "Exportar CSV"}</span>
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de Conclusão</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground tabular-nums">{completionRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedTasks} de {totalTasks} tarefas concluídas
            </p>
          </div>

          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horas Trabalhadas</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Target className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground tabular-nums">{totalLogged.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Meta estimada: {totalEstimated.toFixed(1)}h
            </p>
          </div>

          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Média h/tarefa</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Award className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground tabular-nums">{avgHoursPerTask}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nas tarefas entregues
            </p>
          </div>

          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Equipe Ativa</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Users className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground tabular-nums">{users.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Membros atribuídos
            </p>
          </div>
        </div>

        {/* Breakdown Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Performance por Usuário */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2 mb-1">
              <Users className="size-4 text-primary" />
              Horas Lançadas por Membro
            </h3>
            <p className="text-xs text-muted-foreground mb-5">Produtividade acumulada</p>

            <div className="space-y-4">
              {assigneeStats.map((u) => {
                const maxH = Math.max(...assigneeStats.map((s) => s.hours), 1)
                const pct = Math.round((u.hours / maxH) * 100)
                return (
                  <div key={u.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6 border border-border">
                          {u.imageUrl && <AvatarImage src={u.imageUrl} alt={u.name} />}
                          <AvatarFallback style={{ backgroundColor: u.avatarColor, color: "#fff" }} className="text-[9px] font-bold">
                            {u.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-foreground">{u.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">{u.done} entregues</span>
                        <span className="font-bold text-foreground tabular-nums w-12 text-right">{u.hours}h</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: u.avatarColor }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Distribuição por Prioridade */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2 mb-1">
              <PieChart className="size-4 text-primary" />
              Distribuição por Prioridade
            </h3>
            <p className="text-xs text-muted-foreground mb-5">Volume de tarefas por urgência</p>

            <div className="space-y-4">
              {[
                { label: "Urgente", count: prioritiesCount.urgent, color: "bg-destructive text-destructive" },
                { label: "Alta", count: prioritiesCount.high, color: "bg-chart-5 text-chart-5" },
                { label: "Média", count: prioritiesCount.medium, color: "bg-chart-3 text-chart-3" },
                { label: "Baixa", count: prioritiesCount.low, color: "bg-chart-2 text-chart-2" },
                { label: "Sem prioridade", count: prioritiesCount.none, color: "bg-muted-foreground text-muted-foreground" },
              ].map((p) => {
                const pct = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0
                return (
                  <div key={p.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`size-2.5 rounded-full ${p.color.split(" ")[0]}`} />
                      <span className="font-semibold text-foreground truncate">{p.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono">{p.count} tarefas</span>
                      <span className="font-bold text-foreground tabular-nums w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

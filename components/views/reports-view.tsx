"use client"

import React, { useState } from "react"
import { BarChart3, PieChart, Download, Users, CheckCircle2, Calendar, Target, Award } from "lucide-react"
import { useApp } from "@/lib/context"
import { periodStart, roundItsmHours, type Period } from "@/lib/hours"
import { Select, SelectOption } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const timeframeOptions: SelectOption<string>[] = [
  { value: "month", label: "Este Mês", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "quarter", label: "Este Trimestre", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "year", label: "Este Ano", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "all", label: "Todo o período", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
]

function csvCell(v: unknown) {
  const str = v === null || v === undefined ? "" : String(v)
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function ReportsView() {
  const { userData, timeEntries, profilesList } = useApp()
  const { tasks } = userData

  const [timeframe, setTimeframe] = useState("month")
  const [exported, setExported] = useState(false)

  const start = periodStart(timeframe as Period)?.getTime() ?? 0
  const entries = timeEntries.filter((e) => e.startedAt >= start)
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  // Concluídas = finalizadas dentro do período; ativas = todas em aberto agora
  const completedTasks = tasks.filter((t) => t.column === "done" && (t.completedAt ?? 0) >= start).length
  const activeTasks = tasks.filter((t) => t.column !== "done").length
  const totalTasks = completedTasks + activeTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalLogged = entries.reduce((acc, e) => acc + e.hours, 0)
  const totalEstimated = tasks.filter((t) => t.column !== "done").reduce((acc, t) => acc + t.estimate, 0)
  const avgHoursPerTask = completedTasks > 0 ? (totalLogged / completedTasks).toFixed(1) : "0"

  // Horas por membro a partir dos lançamentos; entregas pelas tarefas atribuídas
  const members = profilesList.filter((p) => p.role === "member" || p.role === "admin")
  const assigneeStats = members
    .map((u) => {
      const hours = Math.round(entries.filter((e) => e.userId === u.id).reduce((acc, e) => acc + e.hours, 0) * 100) / 100
      const keys = [u.id, u.name, u.email, u.avatar].filter(Boolean).map((s) => s.toLowerCase())
      const userTasks = tasks.filter((t) =>
        [t.assignee, t.assigneeName, t.assigneeAvatar].some((v) => v && keys.includes(v.toLowerCase()))
      )
      const done = userTasks.filter((t) => t.column === "done" && (t.completedAt ?? 0) >= start).length
      return { ...u, hours, done, total: userTasks.length }
    })
    .sort((a, b) => b.hours - a.hours)
  const activeMembers = assigneeStats.filter((u) => u.hours > 0).length

  const prioritiesCount = {
    urgent: tasks.filter((t) => t.column !== "done" && t.priority === "urgent").length,
    high: tasks.filter((t) => t.column !== "done" && t.priority === "high").length,
    medium: tasks.filter((t) => t.column !== "done" && t.priority === "medium").length,
    low: tasks.filter((t) => t.column !== "done" && t.priority === "low").length,
    none: tasks.filter((t) => t.column !== "done" && t.priority === "none").length,
  }

  const handleExportCSV = () => {
    const userById = new Map(profilesList.map((p) => [p.id, p.name]))
    const header = ["data", "inicio", "membro", "tarefa", "titulo", "chamado", "cliente", "origem", "horas", "horas_apontamento", "nota"]
    const rows = [...entries]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((e) => {
        const t = e.taskId ? taskById.get(e.taskId) : undefined
        const d = new Date(e.startedAt)
        return [
          d.toLocaleDateString("pt-BR"),
          d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          userById.get(e.userId) ?? e.userId,
          t?.code ?? "",
          t?.title ?? "",
          t?.externalRef ?? "",
          t?.client ?? "",
          e.source,
          e.hours.toFixed(2).replace(".", ","),
          roundItsmHours(e.hours).toFixed(1).replace(".", ","),
          e.note ?? "",
        ]
      })
    // ; e BOM para abrir direto no Excel em pt-BR
    const csv = "﻿" +[header, ...rows].map((r) => r.map(csvCell).join(";")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `octho-horas-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Relatórios & Analytics</h2>
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
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="size-3.5" />
              <span>{exported ? "Exportado!" : "Exportar CSV"}</span>
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Taxa de Conclusão</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{completionRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{completedTasks} de {totalTasks} tarefas concluídas</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Horas Trabalhadas</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{totalLogged.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">Estimativa em aberto: {totalEstimated}h</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Média por Tarefa</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                <Target className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{avgHoursPerTask}h</p>
            <p className="mt-1 text-xs text-muted-foreground">Média em tarefas concluídas</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Membros Ativos</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <Users className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{activeMembers}</p>
            <p className="mt-1 text-xs text-muted-foreground">Contribuidores no período</p>
          </div>
        </div>

        {/* Charts & Graphs Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Produtividade da Equipe */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">Desempenho por Membro</h3>
                <p className="text-xs text-muted-foreground">Horas registradas e entregas</p>
              </div>
              <Award className="size-4 text-primary" />
            </div>

            <div className="flex flex-col gap-4">
              {assigneeStats.length === 0 && <p className="text-xs text-muted-foreground">Nenhum membro cadastrado.</p>}
              {assigneeStats.map((u) => {
                const maxH = Math.max(...assigneeStats.map((s) => s.hours), 1)
                const pct = Math.round((u.hours / maxH) * 100)
                return (
                  <div key={u.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          {u.imageUrl && <AvatarImage src={u.imageUrl} alt={u.name} />}
                          <AvatarFallback style={{ backgroundColor: u.avatarColor, color: "#fff" }} className="text-[10px] font-bold">
                            {u.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{u.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{u.hours.toFixed(1)}h ({u.done}/{u.total} concluídas)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: u.avatarColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Distribuição por Prioridade */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">Volume por Prioridade</h3>
                <p className="text-xs text-muted-foreground">Distribuição das tarefas ativas</p>
              </div>
              <PieChart className="size-4 text-chart-3" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <span className="text-xs font-semibold text-destructive uppercase">Urgentes</span>
                <p className="text-xl font-bold text-foreground mt-1">{prioritiesCount.urgent}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <span className="text-xs font-semibold text-chart-5 uppercase">Alta</span>
                <p className="text-xl font-bold text-foreground mt-1">{prioritiesCount.high}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <span className="text-xs font-semibold text-chart-3 uppercase">Média</span>
                <p className="text-xl font-bold text-foreground mt-1">{prioritiesCount.medium}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <span className="text-xs font-semibold text-chart-2 uppercase">Baixa</span>
                <p className="text-xl font-bold text-foreground mt-1">{prioritiesCount.low}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center col-span-2 sm:col-span-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Sem prioridade</span>
                <p className="text-xl font-bold text-foreground mt-1">{prioritiesCount.none}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

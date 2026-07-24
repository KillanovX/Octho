"use client"

import React, { useState } from "react"
import { Clock, Calendar, Filter, Search, CheckCircle2, TrendingUp, Sparkles, Folder } from "lucide-react"
import { useApp } from "@/lib/context"
import { Select, type SelectOption } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const avatarMap: Record<string, string> = {
  MA: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
  FA: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
  JS: "https://images.shadcnspace.com/assets/profiles/user-2.jpg",
  RP: "https://images.shadcnspace.com/assets/profiles/user-4.jpg",
}

const periodOptions: SelectOption<string>[] = [
  { value: "all", label: "Todo o período", icon: <Calendar className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "month", label: "Este mês", icon: <Calendar className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "week", label: "Esta semana", icon: <Calendar className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "today", label: "Hoje", icon: <Calendar className="size-3.5 text-muted-foreground shrink-0" /> },
]

const categoryOptions: SelectOption<string>[] = [
  { value: "all", label: "Todas as categorias", icon: <Filter className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "Frontend", label: "Frontend" },
  { value: "Backend", label: "Backend" },
  { value: "Design", label: "Design" },
  { value: "Conteúdo", label: "Conteúdo" },
  { value: "Pesquisa", label: "Pesquisa" },
]

export function TimeLogView() {
  const { userData } = useApp()
  const { tasks } = userData

  const [periodFilter, setPeriodFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter tasks with logged hours
  const tasksWithHours = tasks.filter((t) => t.hoursLogged > 0)

  const filteredTasks = tasksWithHours.filter((task) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesText = task.title.toLowerCase().includes(q) || task.code.toLowerCase().includes(q)
      if (!matchesText) return false
    }
    if (categoryFilter !== "all") {
      const matchesCat = task.labels.some((l) => l.name.toLowerCase() === categoryFilter.toLowerCase())
      if (!matchesCat) return false
    }
    return true
  })

  const totalLogged = tasksWithHours.reduce((acc, t) => acc + t.hoursLogged, 0)
  const totalEstimated = tasks.reduce((acc, t) => acc + t.estimate, 0)
  const topTask = tasksWithHours.reduce((prev, curr) => (curr.hoursLogged > (prev?.hoursLogged ?? 0) ? curr : prev), tasksWithHours[0])

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-4" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Registro de Horas</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Acompanhe a alocação de tempo e histórico de lançamentos por tarefa
            </p>
          </div>
        </div>

        {/* Resumo / Métricas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Registrado</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Clock className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground tabular-nums">{totalLogged.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Em {tasksWithHours.length} tarefa{tasksWithHours.length !== 1 ? "s" : ""} ativas
            </p>
          </div>

          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimativa Total</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <TrendingUp className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground tabular-nums">{totalEstimated.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalEstimated > 0 ? `${Math.round((totalLogged / totalEstimated) * 100)}% da carga prevista` : "Nenhuma estimativa"}
            </p>
          </div>

          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maior Alocação</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Sparkles className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground truncate">{topTask ? topTask.code : "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {topTask ? `${topTask.hoursLogged}h — ${topTask.title}` : "Sem dados"}
            </p>
          </div>

          <div className="interactive-card rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conclusão Média</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <CheckCircle2 className="size-4.5" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-card-foreground tabular-nums">
              {tasks.length > 0 ? `${Math.round((tasks.filter(t => t.column === "done").length / tasks.length) * 100)}%` : "0%"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tasks.filter(t => t.column === "done").length} de {tasks.length} concluídas
            </p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar lançamento por código ou título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                triggerClassName="h-9 text-xs"
              />
            </div>
            <div className="w-40">
              <Select
                value={periodFilter}
                onChange={setPeriodFilter}
                options={periodOptions}
                triggerClassName="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Lista de Registros */}
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
            <div className="col-span-6 sm:col-span-5">Tarefa</div>
            <div className="col-span-3 sm:col-span-3">Responsável</div>
            <div className="col-span-3 sm:col-span-2 text-right">Horas Lançadas</div>
            <div className="hidden sm:block sm:col-span-2 text-right">Progresso</div>
          </div>

          {filteredTasks.length > 0 ? (
            filteredTasks.map((t, i) => {
              const pct = t.estimate > 0 ? Math.min(Math.round((t.hoursLogged / t.estimate) * 100), 100) : 0
              return (
                <div
                  key={t.id}
                  style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
                  className="grid grid-cols-12 gap-4 px-5 py-4 items-center text-sm hover:bg-accent/40 transition-colors animate-in fade-in"
                >
                  <div className="col-span-6 sm:col-span-5 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md shrink-0">
                        {t.code}
                      </span>
                      <span className="font-medium text-foreground truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.labels.map((l) => (
                        <span
                          key={l.name}
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shrink-0"
                          style={{ backgroundColor: l.color }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-3 sm:col-span-3 flex items-center gap-2 min-w-0">
                    <Avatar className="size-6 shrink-0 border border-border">
                      {avatarMap[t.assignee] && <AvatarImage src={avatarMap[t.assignee]} alt={t.assignee} />}
                      <AvatarFallback style={{ backgroundColor: t.assigneeColor || "#6366f1", color: "#fff" }} className="text-[9px] font-bold">
                        {t.assigneeAvatar || (t.assignee ? t.assignee.slice(0, 2).toUpperCase() : "US")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground truncate">{t.assigneeName || t.assignee}</span>
                  </div>

                  <div className="col-span-3 sm:col-span-2 text-right">
                    <span className="font-bold text-foreground tabular-nums">{t.hoursLogged}h</span>
                    <span className="text-xs text-muted-foreground block font-mono">/ {t.estimate}h</span>
                  </div>

                  <div className="hidden sm:block sm:col-span-2 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary progress-bar-fill rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-medium text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <Folder className="size-10 text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-foreground">Nenhum registro de horas encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Lançamentos de horas aparecerão aqui à medida que forem registrados nas tarefas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

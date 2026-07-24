"use client"

import React, { useState } from "react"
import { Clock, Calendar, Plus, Filter, Search, CheckCircle2, TrendingUp } from "lucide-react"
import { useApp, timeAgo } from "@/lib/context"
import { Select, SelectOption } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const avatarMap: Record<string, string> = {
  MA: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
  FA: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
  JS: "https://images.shadcnspace.com/assets/profiles/user-2.jpg",
  RP: "https://images.shadcnspace.com/assets/profiles/user-4.jpg",
}

const periodOptions: SelectOption<string>[] = [
  { value: "all", label: "Todo o período", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "month", label: "Este mês", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "week", label: "Esta semana", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
  { value: "today", label: "Hoje", icon: <Calendar className="size-3.5 text-muted-foreground" /> },
]

const categoryOptions: SelectOption<string>[] = [
  { value: "all", label: "Todas as categorias", icon: <Filter className="size-3.5 text-muted-foreground" /> },
  { value: "Frontend", label: "Frontend" },
  { value: "Backend", label: "Backend" },
  { value: "Design", label: "Design" },
  { value: "Conteúdo", label: "Conteúdo" },
  { value: "Pesquisa", label: "Pesquisa" },
]

export function TimeLogView() {
  const { userData, currentUser } = useApp()
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
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Registro de Horas</h2>
            <p className="text-xs text-muted-foreground">
              Acompanhe a alocação de tempo e histórico de lançamentos
            </p>
          </div>
        </div>

        {/* Resumo / Métricas */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Registrado</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{totalLogged.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Em {tasksWithHours.length} tarefas ativas
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Estimativa Total</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{totalEstimated.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalEstimated > 0 ? `${Math.round((totalLogged / totalEstimated) * 100)}% da carga prevista` : "Nenhuma estimativa"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Maior Alocação</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <p className="mt-2 truncate text-base font-bold text-card-foreground">
              {topTask ? topTask.code : "N/A"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {topTask ? `${topTask.hoursLogged}h — ${topTask.title}` : "Sem tarefas"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Usuário Ativo</span>
              <Avatar className="size-8">
                {avatarMap[currentUser.avatar] && <AvatarImage src={avatarMap[currentUser.avatar]} alt={currentUser.name} />}
                <AvatarFallback style={{ backgroundColor: currentUser.avatarColor, color: "#fff" }} className="text-xs font-semibold">
                  {currentUser.avatar}
                </AvatarFallback>
              </Avatar>
            </div>
            <p className="mt-2 text-base font-bold text-card-foreground">{currentUser.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex flex-1 items-center gap-2 min-w-[200px]">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código ou título da tarefa..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <Select
                value={periodFilter}
                onChange={setPeriodFilter}
                options={periodOptions}
                triggerClassName="h-9 text-xs"
              />
            </div>
            <div className="w-48">
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                triggerClassName="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5 font-semibold text-sm text-card-foreground">
            Histórico de Lançamentos
          </div>

          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTasks.map((task) => {
                const pct = task.estimate > 0 ? Math.min(Math.round((task.hoursLogged / task.estimate) * 100), 100) : 100
                return (
                  <div key={task.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-accent/30 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="size-8 shrink-0">
                        {avatarMap[task.assignee] && <AvatarImage src={avatarMap[task.assignee]} alt={task.assignee} />}
                        <AvatarFallback style={{ backgroundColor: task.assigneeColor, color: "#fff" }} className="text-xs font-semibold">
                          {task.assignee}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-muted-foreground">{task.code}</span>
                          <span className="font-medium text-sm text-foreground truncate">{task.title}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {task.labels.map((l) => (
                            <span key={l.name} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px]">
                              <span className="size-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end shrink-0">
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground font-mono">{task.hoursLogged}h / {task.estimate}h</span>
                          <span className="font-semibold text-card-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-sm font-bold text-foreground min-w-[60px] justify-end">
                        <Clock className="size-3.5 text-primary" />
                        <span>{task.hoursLogged}h</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
              <Clock className="size-8 text-muted-foreground/50 mb-2" />
              Nenhum registro de hora encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import React from "react"
import { Layers, Clock, Users, ArrowUpRight, CheckCircle2, Sparkles, FolderKanban, ShieldCheck } from "lucide-react"
import { useApp, users } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type Project = {
  id: string
  name: string
  code: string
  description: string
  category: string
  status: "active" | "planning" | "completed"
  statusLabel: string
  progress: number
  tasksCount: number
  hoursLogged: number
  estimate: number
  members: string[] // user avatars
}

const projectList: Project[] = [
  {
    id: "p1",
    name: "Octho Core Dashboard",
    code: "OCT-01",
    description: "Plataforma central de gestão de tarefas, controle de horas e inteligência para equipes.",
    category: "SaaS Application",
    status: "active",
    statusLabel: "Em andamento",
    progress: 78,
    tasksCount: 15,
    hoursLogged: 48.5,
    estimate: 65,
    members: ["JS", "MA", "FA", "RP"],
  },
  {
    id: "p2",
    name: "Acebuilder V2",
    code: "ACE-02",
    description: "Construtor de páginas de alta conversão integrado ao Stripe e analytics.",
    category: "Web Application",
    status: "active",
    statusLabel: "Em andamento",
    progress: 45,
    tasksCount: 8,
    hoursLogged: 18,
    estimate: 40,
    members: ["MA", "JS"],
  },
  {
    id: "p3",
    name: "Integração Suri Elétricas",
    code: "SURI-03",
    description: "Automação de dados de pedidos e integrações com ERP de fornecedores.",
    category: "Integração & API",
    status: "planning",
    statusLabel: "Em planejamento",
    progress: 20,
    tasksCount: 5,
    hoursLogged: 4,
    estimate: 25,
    members: ["RP", "FA"],
  },
  {
    id: "p4",
    name: "Design System Pro",
    code: "DSP-04",
    description: "Biblioteca de componentes UI responsivos, acessíveis e customizáveis.",
    category: "Design & UI",
    status: "completed",
    statusLabel: "Concluído",
    progress: 100,
    tasksCount: 12,
    hoursLogged: 32,
    estimate: 32,
    members: ["JS", "RP"],
  },
]

export function ProjectsView() {
  const { setActiveView } = useApp()

  const activeCount = projectList.filter((p) => p.status === "active").length
  const completedCount = projectList.filter((p) => p.status === "completed").length
  const totalHours = projectList.reduce((acc, p) => acc + p.hoursLogged, 0)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Gestão de Projetos</h2>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de escopo, progresso e membros dos projetos da organização
            </p>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Projetos Totais</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{projectList.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Workspace principal</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Em Andamento</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                <FolderKanban className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{activeCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Foco ativo da equipe</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Projetos Entregues</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{completedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Entregas finalizadas</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Horas Investidas</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <Clock className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">{totalHours.toFixed(0)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">Em todos os projetos</p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {projectList.map((project) => (
            <div
              key={project.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">{project.code}</span>
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {project.category}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-card-foreground">{project.name}</h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      project.status === "completed"
                        ? "bg-chart-4/10 text-chart-4"
                        : project.status === "active"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        project.status === "completed"
                          ? "bg-chart-4"
                          : project.status === "active"
                          ? "bg-primary"
                          : "bg-muted-foreground"
                      }`}
                    />
                    {project.statusLabel}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-5">{project.description}</p>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso do Projeto</span>
                    <span className="font-semibold text-card-foreground">{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-500 ${
                        project.progress === 100 ? "bg-chart-4" : "bg-primary"
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  {/* Member avatars */}
                  <div className="flex -space-x-2">
                    {project.members.map((initials) => {
                      const user = users.find((u) => u.avatar === initials)
                      return (
                        <Avatar key={initials} className="size-6 border-2 border-card">
                          {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={initials} />}
                          <AvatarFallback style={{ backgroundColor: user?.avatarColor ?? "#6366f1", color: "#fff" }} className="text-[9px] font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      )
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">{project.tasksCount} tarefas</span>
                </div>

                <button
                  onClick={() => setActiveView("kanban")}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Ver Kanban</span>
                  <ArrowUpRight className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import { Layers, Clock, ArrowUpRight, CheckCircle2, FolderKanban, Plus, X, FolderPlus } from "lucide-react"
import { useApp } from "@/lib/context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export type Project = {
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
  members: string[]
}

export function ProjectsView() {
  const { setActiveView, currentUser } = useApp()
  const [projectsList, setProjectsList] = useState<Project[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")

  const storageKey = `octho_user_projects_${currentUser?.id || "guest"}`

  useEffect(() => {
    const pid = currentUser?.id
    if (!pid) return

    const loadProjects = async () => {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .or(`user_id.eq.${pid},profile_id.eq.${pid}`)
            .order("created_at", { ascending: false })
          if (!error && data && data.length > 0) {
            const list: Project[] = data.map((row: any) => ({
              id: row.id,
              name: row.name,
              code: row.code,
              description: row.description || "",
              category: row.category || "Geral",
              status: row.status || "active",
              statusLabel: row.status === "completed" ? "Concluído" : "Em andamento",
              progress: row.progress || 0,
              tasksCount: 0,
              hoursLogged: Number(row.hours_logged || 0),
              estimate: Number(row.estimate || 0),
              members: row.members || [],
            }))
            setProjectsList(list)
            try {
              localStorage.setItem(storageKey, JSON.stringify(list))
            } catch {}
            return
          }
        } catch (e) {
          console.error("Error loading projects from Supabase:", e)
        }
      }

      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) setProjectsList(JSON.parse(raw))
      } catch {}
    }

    loadProjects()
  }, [currentUser?.id, storageKey])

  const saveProjects = async (newList: Project[], newProject?: Project) => {
    setProjectsList(newList)
    try {
      localStorage.setItem(storageKey, JSON.stringify(newList))
    } catch (e) {
      console.error("Error saving projects:", e)
    }

    if (isSupabaseConfigured() && supabase && currentUser?.id && newProject) {
      try {
        await supabase.from("projects").upsert({
          id: newProject.id,
          profile_id: currentUser.id,
          user_id: currentUser.id.length > 5 ? currentUser.id : null,
          name: newProject.name,
          code: newProject.code,
          description: newProject.description,
          category: newProject.category,
          status: newProject.status,
          progress: newProject.progress,
          hours_logged: newProject.hoursLogged,
          estimate: newProject.estimate,
          members: newProject.members,
        })
      } catch (e) {
        console.error("Error saving project to Supabase:", e)
      }
    }
  }

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase() || `PRJ-0${projectsList.length + 1}`,
      description: description.trim() || "Projeto da organização.",
      category: category.trim() || "Geral",
      status: "active",
      statusLabel: "Em andamento",
      progress: 0,
      tasksCount: 0,
      hoursLogged: 0,
      estimate: 0,
      members: [currentUser.avatar || "FA"],
    }

    const updated = [newProject, ...projectsList]
    saveProjects(updated, newProject)

    setName("")
    setCode("")
    setCategory("")
    setDescription("")
    setIsModalOpen(false)
  }

  const activeCount = projectsList.filter((p) => p.status === "active").length
  const completedCount = projectsList.filter((p) => p.status === "completed").length
  const totalHours = projectsList.reduce((acc, p) => acc + p.hoursLogged, 0)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Gestão de Projetos</h2>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de escopo, progresso e entregas da sua organização
            </p>
          </div>

          <Button onClick={() => setIsModalOpen(true)} className="rounded-xl flex items-center gap-2">
            <Plus className="size-4" />
            <span>Novo Projeto</span>
          </Button>
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
            <p className="mt-2 text-2xl font-bold text-card-foreground">{projectsList.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Seus projetos ativos</p>
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

        {/* Projects Grid / Empty State */}
        {projectsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16 px-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <FolderPlus className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">Nenhum projeto cadastrado ainda</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
              Os projetos sample foram removidos do seu perfil. Clique abaixo para cadastrar seu primeiro projeto real.
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="rounded-xl flex items-center gap-2">
              <Plus className="size-4" />
              <span>Criar Primeiro Projeto</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {projectsList.map((project) => (
              <div
                key={project.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-all shadow-sm"
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
                    <Avatar className="size-6 border-2 border-card">
                      <AvatarFallback style={{ backgroundColor: currentUser.avatarColor || "#6366f1", color: "#fff" }} className="text-[9px] font-bold">
                        {currentUser.avatar || "FA"}
                      </AvatarFallback>
                    </Avatar>
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
        )}
      </div>

      {/* Modal Criar Projeto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="size-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Novo Projeto</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome do Projeto</label>
                <Input
                  placeholder="Ex: Novo App Mobile"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Código</label>
                  <Input
                    placeholder="Ex: MOB-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="rounded-xl text-sm uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Input
                    placeholder="Ex: Web, SaaS, Design"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <textarea
                  placeholder="Objetivos e escopo do projeto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-xl">
                  Criar Projeto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatCards } from "@/components/stat-cards"
import { WeeklyHoursChart } from "@/components/weekly-hours-chart"
import { ActivityBreakdown } from "@/components/activity-breakdown"
import { KanbanBoard } from "@/components/kanban-board"
import { ActivityFeed } from "@/components/activity-feed"
import { SearchModal } from "@/components/search-modal"
import { TaskModal } from "@/components/task-modal"
import { AuthModal } from "@/components/auth-modal"
import { useApp } from "@/lib/context"
import { Task } from "@/lib/data"
import { KanbanSquare, Layers, Clock, BarChart3, Settings, Inbox, Construction } from "lucide-react"

import { TimeLogView } from "@/components/views/time-log-view"
import { ReportsView } from "@/components/views/reports-view"
import { ProjectsView } from "@/components/views/projects-view"
import { InboxView } from "@/components/views/inbox-view"
import { SettingsView } from "@/components/views/settings-view"

function MyTasksView() {
  const { userData, currentUser } = useApp()
  const [editTask, setEditTask] = useState<Task | null>(null)

  const myTasks = userData.tasks.filter(t => t.assignee === currentUser.avatar)

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[900px]">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Minhas Tarefas</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Tarefas atribuídas a {currentUser.name.split(" ")[0]}
          </p>
          {myTasks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {myTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => setEditTask(t)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                  <span className="flex-1 text-sm text-card-foreground">{t.title}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t.column === "backlog" ? "Backlog" : t.column === "todo" ? "A fazer" : t.column === "in_progress" ? "Em progresso" : "Concluído"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-sm text-muted-foreground">
              Nenhuma tarefa atribuída a você
            </div>
          )}
        </div>
      </div>
      <TaskModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
    </>
  )
}

import SignInForm from "@/components/ui/sign-in-form"
import { BeamsBackground } from "@/components/ui/beams-background"

export default function Page() {
  const { activeView, isAuthenticated, isAuthModalOpen, closeAuthModal } = useApp()
  const [searchOpen, setSearchOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const handleSelectTask = (task: Task) => {
    setSearchOpen(false)
    setEditTask(task)
  }

  if (!isAuthenticated || activeView === "login") {
    return (
      <BeamsBackground intensity="strong">
        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          <SignInForm />
        </div>
      </BeamsBackground>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onOpenSearch={() => setSearchOpen(true)} />

      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />

        {activeView === "dashboard" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
              <StatCards />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <WeeklyHoursChart />
                </div>
                <ActivityBreakdown />
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
                <KanbanBoard />
                <ActivityFeed />
              </div>
            </div>
          </div>
        )}

        {activeView === "kanban" && (
          <div className="flex-1 overflow-y-auto p-6">
            <KanbanBoard fullWidth />
          </div>
        )}

        {activeView === "my-tasks" && <MyTasksView />}
        {activeView === "inbox" && <InboxView />}
        {activeView === "projects" && <ProjectsView />}
        {activeView === "time-log" && <TimeLogView />}
        {activeView === "reports" && <ReportsView />}
        {activeView === "settings" && <SettingsView />}
      </main>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onSelectTask={handleSelectTask} />
      <TaskModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
      <AuthModal open={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  )
}

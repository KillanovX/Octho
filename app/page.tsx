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
import { TaskDetailsModal } from "@/components/task-details-modal"
import { AuthModal } from "@/components/auth-modal"
import { useApp } from "@/lib/context"
import { Task } from "@/lib/data"

import { TimeLogView } from "@/components/views/time-log-view"
import { ReportsView } from "@/components/views/reports-view"
import { ProjectsView } from "@/components/views/projects-view"
import { InboxView } from "@/components/views/inbox-view"
import { SettingsView } from "@/components/views/settings-view"
import { AdminView } from "@/components/views/admin-view"
import { MeetingsView } from "@/components/views/meetings-view"

import SignInForm from "@/components/ui/sign-in-form"
import { BeamsBackground } from "@/components/ui/beams-background"

// Wraps any view content with the CSS fade-in animation
function ViewWrapper({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  return (
    <div key={viewKey} className="flex-1 flex flex-col overflow-hidden view-animate">
      {children}
    </div>
  )
}

function MyTasksView() {
  const { userData, currentUser } = useApp()
  const [editTask, setEditTask] = useState<Task | null>(null)

  const myTasks = userData.tasks.filter(t => t.assignee === currentUser.avatar)

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[900px]">
          <h2 className="mb-1 text-xl font-bold text-foreground">Minhas Tarefas</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Tarefas atribuídas a {currentUser.name.split(" ")[0]}
          </p>
          {myTasks.length > 0 ? (
            <div className="flex flex-col gap-2">
              {myTasks.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setEditTask(t)}
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                  className="interactive-card count-animate flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left"
                >
                  <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">{t.code}</span>
                  <span className="flex-1 text-sm font-medium text-card-foreground">{t.title}</span>
                  <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                    {t.column === "backlog" ? "Backlog" : t.column === "todo" ? "A fazer" : t.column === "in_progress" ? "Em progresso" : "Concluído"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
              <span className="text-4xl mb-3">✅</span>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa atribuída a você</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tarefas atribuídas para {currentUser.name.split(" ")[0]} aparecerão aqui</p>
            </div>
          )}
        </div>
      </div>
      <TaskDetailsModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
    </>
  )
}

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
          <ViewWrapper viewKey="dashboard">
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
          </ViewWrapper>
        )}

        {activeView === "kanban" && (
          <ViewWrapper viewKey="kanban">
            <div className="flex-1 overflow-y-auto p-6">
              <KanbanBoard fullWidth />
            </div>
          </ViewWrapper>
        )}

        {activeView === "my-tasks" && (
          <ViewWrapper viewKey="my-tasks">
            <MyTasksView />
          </ViewWrapper>
        )}

        {activeView === "inbox" && (
          <ViewWrapper viewKey="inbox">
            <InboxView />
          </ViewWrapper>
        )}

        {activeView === "projects" && (
          <ViewWrapper viewKey="projects">
            <ProjectsView />
          </ViewWrapper>
        )}

        {activeView === "time-log" && (
          <ViewWrapper viewKey="time-log">
            <TimeLogView />
          </ViewWrapper>
        )}

        {activeView === "reports" && (
          <ViewWrapper viewKey="reports">
            <ReportsView />
          </ViewWrapper>
        )}

        {activeView === "settings" && (
          <ViewWrapper viewKey="settings">
            <SettingsView />
          </ViewWrapper>
        )}

        {activeView === "admin" && (
          <ViewWrapper viewKey="admin">
            <AdminView />
          </ViewWrapper>
        )}

        {activeView === "meetings" && (
          <ViewWrapper viewKey="meetings">
            <MeetingsView />
          </ViewWrapper>
        )}
      </main>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onSelectTask={handleSelectTask} />
      <TaskDetailsModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
      <AuthModal open={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  )
}

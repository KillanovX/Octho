"use client"

import { useState, useRef } from "react"
import { Play, Plus, Bell, Square, RotateCcw, ChevronDown, Check } from "lucide-react"
import { useApp, getGreeting } from "@/lib/context"
import { TaskModal } from "@/components/task-modal"
import { NotificationPanel } from "@/components/notification-panel"

export function DashboardHeader() {
  const {
    currentUser,
    timer,
    setTimerRunning,
    logTimerHours,
    resetTimer,
    startTimer,
    userData,
    unreadCount,
  } = useApp()

  const [showNewTask, setShowNewTask] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  const activeTasks = userData.tasks.filter(t => t.column !== "done")

  const h = Math.floor(timer.seconds / 3600)
  const m = Math.floor((timer.seconds % 3600) / 60)
  const s = timer.seconds % 60
  const fmt = (n: number) => n.toString().padStart(2, "0")

  const handleToggleTimer = () => {
    if (timer.running) {
      setTimerRunning(false)
    } else if (timer.taskId) {
      setTimerRunning(true)
    }
  }

  const handleLogAndReset = () => {
    if (timer.seconds >= 60) {
      logTimerHours()
    } else {
      resetTimer()
    }
  }

  return (
    <>
      <header className="flex flex-col gap-4 border-b border-border bg-background/80 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {getGreeting()}, {(currentUser?.name || "Usuário").split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="relative flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
            {timer.taskId ? (
              <>
                <button
                  onClick={handleToggleTimer}
                  className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-label={timer.running ? "Pausar cronômetro" : "Retomar cronômetro"}
                >
                  {timer.running ? (
                    <Square className="size-2.5 fill-current" />
                  ) : (
                    <Play className="size-3 fill-current" />
                  )}
                </button>
                <span className="font-mono text-sm tabular-nums text-card-foreground">
                  {fmt(h)}:{fmt(m)}:{fmt(s)}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{timer.taskCode}</span>
                {!timer.running && timer.seconds > 0 && (
                  <button
                    onClick={handleLogAndReset}
                    className="flex size-5 items-center justify-center rounded text-chart-4 transition-colors hover:bg-accent"
                    aria-label="Registrar horas e resetar"
                    title="Registrar horas"
                  >
                    <Check className="size-3.5" />
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Resetar cronômetro"
                >
                  <RotateCcw className="size-3" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowTaskPicker(!showTaskPicker)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Play className="size-3" />
                <span>Iniciar timer</span>
                <ChevronDown className="size-3" />
              </button>
            )}

            {/* Task Picker Dropdown */}
            {showTaskPicker && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-card p-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Selecionar tarefa
                </p>
                {activeTasks.length > 0 ? (
                  <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                    {activeTasks.map(t => (
                      <button
                        key={t.id}
                        onClick={() => {
                          startTimer(t.id, t.code)
                          setShowTaskPicker(false)
                        }}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                      >
                        <span className="font-mono text-muted-foreground">{t.code}</span>
                        <span className="flex-1 truncate text-card-foreground">{t.title}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">Nenhuma tarefa ativa</p>
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Notificações"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
          </div>

          {/* New Task */}
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nova tarefa</span>
          </button>
        </div>
      </header>

      <TaskModal open={showNewTask} onClose={() => setShowNewTask(false)} />
    </>
  )
}

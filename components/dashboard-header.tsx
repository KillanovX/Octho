"use client"

import { useEffect, useState } from "react"
import { Play, Plus, Bell } from "lucide-react"

export function DashboardHeader() {
  const [seconds, setSeconds] = useState(2 * 3600 + 14 * 60)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const fmt = (n: number) => n.toString().padStart(2, "0")

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background/80 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Bom dia, Marina</h1>
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
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label={running ? "Pausar cronômetro" : "Iniciar cronômetro"}
          >
            {running ? <span className="size-2 rounded-sm bg-primary-foreground" /> : <Play className="size-3" />}
          </button>
          <span className="font-mono text-sm tabular-nums text-card-foreground">
            {fmt(h)}:{fmt(m)}:{fmt(s)}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">FLX-243</span>
        </div>

        <button
          className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="size-4" />
        </button>

        <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nova tarefa</span>
        </button>
      </div>
    </header>
  )
}

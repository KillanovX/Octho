export type Priority = "urgent" | "high" | "medium" | "low" | "none"

export type ColumnId = "backlog" | "todo" | "in_progress" | "done"

export type Label = {
  name: string
  color: string // hex-ish for the dot
}

export type Task = {
  id: string
  code: string
  title: string
  column: ColumnId
  priority: Priority
  labels: Label[]
  assignee: string // initials
  assigneeColor: string
  hoursLogged: number
  estimate: number
}

export const columns: { id: ColumnId; name: string; accent: string }[] = [
  { id: "backlog", name: "Backlog", accent: "text-muted-foreground" },
  { id: "todo", name: "A fazer", accent: "text-muted-foreground" },
  { id: "in_progress", name: "Em progresso", accent: "text-chart-3" },
  { id: "done", name: "Concluído", accent: "text-chart-4" },
]

const L = {
  design: { name: "Design", color: "#8b5cf6" },
  frontend: { name: "Frontend", color: "#3b82f6" },
  backend: { name: "Backend", color: "#10b981" },
  bug: { name: "Bug", color: "#ef4444" },
  content: { name: "Conteúdo", color: "#f59e0b" },
  research: { name: "Pesquisa", color: "#14b8a6" },
} satisfies Record<string, Label>

export const tasks: Task[] = []

// Horas registradas nos últimos 7 dias (seg -> dom)
export const weeklyHours: { day: string; hours: number; goal: number }[] = [
  { day: "Seg", hours: 0, goal: 8 },
  { day: "Ter", hours: 0, goal: 8 },
  { day: "Qua", hours: 0, goal: 8 },
  { day: "Qui", hours: 0, goal: 8 },
  { day: "Sex", hours: 0, goal: 8 },
  { day: "Sáb", hours: 0, goal: 4 },
  { day: "Dom", hours: 0, goal: 0 },
]

// Distribuição de horas por atividade no mês
export const activityBreakdown: { name: string; hours: number; color: string }[] = []

export type ActivityEvent = {
  id: string
  user: string
  userColor: string
  action: string
  target: string
  time: string
}

export const activityFeed: ActivityEvent[] = []

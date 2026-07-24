export type Priority = "urgent" | "high" | "medium" | "low" | "none"

export type ColumnId = "backlog" | "todo" | "in_progress" | "done"

export type Tag = {
  id?: string
  name: string
  color: string
  icon?: string
}

export type Label = Tag // Alias for compatibility

export type TaskCheckpoint = {
  id: string
  title: string
  completed: boolean
}

export type TaskComment = {
  id: string
  authorName: string
  authorAvatar: string
  authorColor: string
  text: string
  createdAt: number
}

export type TaskHistoryEvent = {
  id: string
  action: string
  authorName: string
  createdAt: number
}

export type Task = {
  id: string
  code: string
  title: string
  column: ColumnId
  priority: Priority
  labels: Tag[]
  client?: string
  assignee: string // User full name or ID
  assigneeName?: string // Full name of user
  assigneeAvatar?: string // Photo or initials
  assigneeColor: string
  hoursLogged: number
  estimate: number
  description?: string
  checkpoints?: TaskCheckpoint[]
  comments?: TaskComment[]
  history?: TaskHistoryEvent[]
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

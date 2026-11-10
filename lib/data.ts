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
  /** log = entrada do histórico/worklog do chamado; action = próxima ação */
  kind?: "log" | "action"
  /** Detalhes (tópicos do worklog, prazo da ação) */
  note?: string
  /** "vault": sincronizado do Obsidian; ids começam com "vault-" e são substituídos a cada push */
  source?: "vault"
}

export const isVaultCheckpoint = (c: Pick<TaskCheckpoint, "id">) => c.id.startsWith("vault-")

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
  createdBy?: string // user_id do criador
  completedAt?: number
  // Integração Obsidian / Hermes
  externalRef?: string // ID do chamado ITSM (ex: 12345)
  source?: string // octho | obsidian
  vaultPath?: string
}

export type TimeEntrySource = "timer" | "meeting" | "manual" | "agent"

export type TimeEntry = {
  id: string
  userId: string
  taskId?: string
  meetingId?: string
  startedAt: number
  endedAt?: number
  hours: number
  source: TimeEntrySource
  note?: string
}

export const columns: { id: ColumnId; name: string; accent: string }[] = [
  { id: "backlog", name: "Backlog", accent: "text-muted-foreground" },
  { id: "todo", name: "A fazer", accent: "text-muted-foreground" },
  { id: "in_progress", name: "Em progresso", accent: "text-chart-3" },
  { id: "done", name: "Concluído", accent: "text-chart-4" },
]

export type ActivityEvent = {
  id: string
  user: string
  userColor: string
  action: string
  target: string
  time: string
  /** autor (profiles.id); eventos antigos só têm as iniciais em `user` */
  userId?: string
}

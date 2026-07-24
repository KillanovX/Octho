// ─── Meeting types ───────────────────────────────────────────────
export type MeetingStatus = "planned" | "completed" | "cancelled"

export type Meeting = {
  id: string
  title: string
  date: string           // ISO date string "2024-07-23"
  startTime?: string     // "09:00"
  durationMinutes: number
  client?: string        // Nome do cliente / empresa
  linkedTaskId?: string  // optional link to a Task
  linkedTaskCode?: string
  linkedTaskTitle?: string
  summary?: string
  participants?: string[]
  status: MeetingStatus
  hoursAddedToTask?: boolean
}

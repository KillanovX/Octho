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

export const tasks: Task[] = [
  {
    id: "1",
    code: "FLX-179",
    title: "Redesenhar página de onboarding v2",
    column: "backlog",
    priority: "high",
    labels: [L.design],
    assignee: "JS",
    assigneeColor: "#3b82f6",
    hoursLogged: 0,
    estimate: 8,
  },
  {
    id: "2",
    code: "FLX-148",
    title: "Fluxo de captação de clientes (ler descrição)",
    column: "backlog",
    priority: "urgent",
    labels: [L.research],
    assignee: "MA",
    assigneeColor: "#10b981",
    hoursLogged: 0,
    estimate: 5,
  },
  {
    id: "3",
    code: "FLX-213",
    title: "Alterar precificação — planos free / pro / custom",
    column: "backlog",
    priority: "high",
    labels: [L.content],
    assignee: "JS",
    assigneeColor: "#3b82f6",
    hoursLogged: 0,
    estimate: 4,
  },
  {
    id: "4",
    code: "FLX-208",
    title: "Componente de biblioteca de UI",
    column: "backlog",
    priority: "medium",
    labels: [L.frontend, L.design],
    assignee: "RP",
    assigneeColor: "#f59e0b",
    hoursLogged: 0,
    estimate: 6,
  },
  {
    id: "5",
    code: "FLX-228",
    title: "Otimizar prompts para o assistente de IA",
    column: "todo",
    priority: "urgent",
    labels: [L.backend],
    assignee: "MA",
    assigneeColor: "#10b981",
    hoursLogged: 1.5,
    estimate: 6,
  },
  {
    id: "6",
    code: "FLX-199",
    title: "Gravação do tutorial no YouTube",
    column: "todo",
    priority: "high",
    labels: [L.content],
    assignee: "JS",
    assigneeColor: "#3b82f6",
    hoursLogged: 0,
    estimate: 3,
  },
  {
    id: "7",
    code: "FLX-235",
    title: "Iniciar integração com Suri Elétricas",
    column: "todo",
    priority: "medium",
    labels: [L.research],
    assignee: "RP",
    assigneeColor: "#f59e0b",
    hoursLogged: 0,
    estimate: 4,
  },
  {
    id: "8",
    code: "FLX-225",
    title: "Segmentar clientes: fundos, escritórios e imobiliárias",
    column: "todo",
    priority: "low",
    labels: [L.research, L.content],
    assignee: "MA",
    assigneeColor: "#10b981",
    hoursLogged: 0,
    estimate: 2,
  },
  {
    id: "9",
    code: "FLX-243",
    title: "Lista de blocos de componentes para o Pro",
    column: "in_progress",
    priority: "high",
    labels: [L.frontend],
    assignee: "RP",
    assigneeColor: "#f59e0b",
    hoursLogged: 3.5,
    estimate: 6,
  },
  {
    id: "10",
    code: "FLX-250",
    title: "Adicionar 4 novos componentes por dia ao Pro",
    column: "in_progress",
    priority: "medium",
    labels: [L.frontend, L.design],
    assignee: "JS",
    assigneeColor: "#3b82f6",
    hoursLogged: 2,
    estimate: 8,
  },
  {
    id: "11",
    code: "FLX-249",
    title: "Checklist de lançamento do Acebuilder",
    column: "in_progress",
    priority: "urgent",
    labels: [L.content],
    assignee: "MA",
    assigneeColor: "#10b981",
    hoursLogged: 1,
    estimate: 3,
  },
  {
    id: "12",
    code: "FLX-245",
    title: "Corrigir bug de scroll no dashboard mobile",
    column: "in_progress",
    priority: "high",
    labels: [L.bug, L.frontend],
    assignee: "RP",
    assigneeColor: "#f59e0b",
    hoursLogged: 2.5,
    estimate: 4,
  },
  {
    id: "13",
    code: "FLX-244",
    title: "Adicionar links de compra do Stripe no site",
    column: "done",
    priority: "medium",
    labels: [L.backend],
    assignee: "JS",
    assigneeColor: "#3b82f6",
    hoursLogged: 4,
    estimate: 4,
  },
  {
    id: "14",
    code: "FLX-240",
    title: "Configurar analytics de conversão",
    column: "done",
    priority: "low",
    labels: [L.backend],
    assignee: "MA",
    assigneeColor: "#10b981",
    hoursLogged: 2,
    estimate: 3,
  },
  {
    id: "15",
    code: "FLX-238",
    title: "Escrever documentação da API pública",
    column: "done",
    priority: "medium",
    labels: [L.content],
    assignee: "RP",
    assigneeColor: "#f59e0b",
    hoursLogged: 5,
    estimate: 5,
  },
]

// Horas registradas nos últimos 7 dias (seg -> dom)
export const weeklyHours: { day: string; hours: number; goal: number }[] = [
  { day: "Seg", hours: 6.5, goal: 8 },
  { day: "Ter", hours: 7.2, goal: 8 },
  { day: "Qua", hours: 8.1, goal: 8 },
  { day: "Qui", hours: 5.4, goal: 8 },
  { day: "Sex", hours: 6.8, goal: 8 },
  { day: "Sáb", hours: 2.1, goal: 4 },
  { day: "Dom", hours: 0, goal: 0 },
]

// Distribuição de horas por atividade no mês
export const activityBreakdown: { name: string; hours: number; color: string }[] = [
  { name: "Frontend", hours: 42, color: "var(--chart-1)" },
  { name: "Design", hours: 28, color: "var(--chart-2)" },
  { name: "Backend", hours: 34, color: "var(--chart-4)" },
  { name: "Conteúdo", hours: 19, color: "var(--chart-3)" },
  { name: "Reuniões", hours: 15, color: "var(--chart-5)" },
]

export type ActivityEvent = {
  id: string
  user: string
  userColor: string
  action: string
  target: string
  time: string
}

export const activityFeed: ActivityEvent[] = [
  {
    id: "a1",
    user: "JS",
    userColor: "#3b82f6",
    action: "concluiu",
    target: "FLX-244 — Links de compra do Stripe",
    time: "há 12 min",
  },
  {
    id: "a2",
    user: "RP",
    userColor: "#f59e0b",
    action: "registrou 2h30 em",
    target: "FLX-245 — Bug de scroll no mobile",
    time: "há 40 min",
  },
  {
    id: "a3",
    user: "MA",
    userColor: "#10b981",
    action: "moveu para Em progresso",
    target: "FLX-249 — Checklist de lançamento",
    time: "há 1 h",
  },
  {
    id: "a4",
    user: "JS",
    userColor: "#3b82f6",
    action: "criou",
    target: "FLX-179 — Redesenhar onboarding v2",
    time: "há 3 h",
  },
  {
    id: "a5",
    user: "RP",
    userColor: "#f59e0b",
    action: "comentou em",
    target: "FLX-243 — Lista de blocos de componentes",
    time: "há 5 h",
  },
]

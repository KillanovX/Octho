"use client"

import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, ReactNode } from "react"
import {
  type Task,
  type TaskCheckpoint,
  type TaskComment,
  type TaskHistoryEvent,
  type ActivityEvent,
  type TimeEntry,
  type TimeEntrySource,
  type ColumnId,
  type Label,
  type Priority,
  columns,
} from "./data"
import { supabase, isSupabaseConfigured, signOutSupabase, getUserProfile, getAllProfiles, type ProfileRow } from "./supabase"
import { type Meeting, type MeetingStatus } from "./meetings"
import { loadTags } from "./tags-service"
import { loadClients } from "./clients-service"
import { secondsToHours } from "./hours"
import { positionBetween, byPosition, nextCode, computeWeeklyHours, computeActivityBreakdown, computeHoursMonth, computeCompletedThisMonth } from "./derive"

// ─── User Profiles ──────────────────────────────────────────
export type UserRole = "pending" | "member" | "admin"

export type UserProfile = {
  id: string
  name: string
  email: string
  avatar: string
  avatarColor: string
  role?: UserRole
  imageUrl?: string
  verified?: boolean
}

// ─── Views ──────────────────────────────────────────────────
export type ViewId = "dashboard" | "inbox" | "my-tasks" | "kanban" | "projects" | "time-log" | "reports" | "settings" | "admin" | "meetings" | "closing"

// ─── User Data ──────────────────────────────────────────────
export type UserData = {
  tasks: Task[]
  weeklyHours: { day: string; hours: number; goal: number }[]
  activityBreakdown: { name: string; hours: number; color: string }[]
  activityFeed: (ActivityEvent & { createdAt: number })[]
}

// ─── Timer ──────────────────────────────────────────────────
export type TimerState = {
  taskId: string | null
  taskCode: string
  seconds: number
  running: boolean
}

type StoredTimer = {
  taskId: string
  taskCode: string
  firstStartedAt: number
  accumulatedMs: number
  runningSince: number | null
}

export type NewTimeEntry = {
  taskId?: string
  meetingId?: string
  startedAt: number
  endedAt?: number
  hours: number
  source: TimeEntrySource
  note?: string
}

// ─── Context Type ───────────────────────────────────────────
type AppContextType = {
  // User & Auth
  currentUser: UserProfile
  profilesList: UserProfile[]
  isAuthenticated: boolean
  isAuthLoading: boolean
  isPendingApproval: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
  isSupabaseActive: boolean
  updateMyProfile: (updates: { name?: string; imageUrl?: string; avatarColor?: string }) => Promise<boolean>
  // Sync status
  isDataLoading: boolean
  /** true até a primeira carga terminar (esqueletos) */
  isInitialLoading: boolean
  /** tarefas alteradas por outra pessoa/agente nos últimos segundos (Realtime) */
  recentlyChangedTaskIds: Set<string>
  syncError: string | null
  dismissSyncError: () => void
  reportError: (message: string) => void
  refreshData: () => Promise<void>
  // View
  activeView: ViewId
  setActiveView: (view: ViewId) => void
  // Data
  userData: UserData
  timeEntries: TimeEntry[]
  // Task CRUD
  addTask: (task: Omit<Task, "id" | "code">) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, column: ColumnId, overTaskId?: string) => void
  logActivity: (action: string, target: string) => void
  // Time entries
  addTimeEntry: (entry: NewTimeEntry) => Promise<TimeEntry | null>
  deleteTimeEntry: (id: string) => void
  // Timer
  timer: TimerState
  startTimer: (taskId: string, taskCode: string) => void
  pauseTimer: () => void
  resetTimer: () => void
  logTimerHours: (note?: string) => void
  setTimerRunning: (running: boolean) => void
  // Notifications
  unreadCount: number
  lastReadAt: number
  markAllRead: () => void
  // Computed (usuário atual)
  hoursMonth: number
  completedTasksMonth: number
  // Meetings
  meetings: Meeting[]
  addMeeting: (m: Omit<Meeting, "id">) => Meeting
  updateMeeting: (id: string, updates: Partial<Meeting>) => void
  deleteMeeting: (id: string) => void
  addMeetingHoursToTask: (meetingId: string, taskId: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const EMPTY_USER: UserProfile = { id: "", name: "", email: "", avatar: "", avatarColor: "#6366f1" }

export function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return "agora mesmo"
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return `há ${Math.floor(diff / 86400)} d`
}

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return "Bom dia"
  if (h >= 12 && h < 18) return "Boa tarde"
  return "Boa noite"
}

function profileToUser(p: ProfileRow): UserProfile {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    avatar: (p.avatar || p.name.slice(0, 2)).toUpperCase(),
    avatarColor: p.avatar_color || "#6366f1",
    role: (p.role as UserRole) || "pending",
    imageUrl: p.image_url || undefined,
    verified: true,
  }
}

const ts = (v: unknown) => (v ? new Date(v as string).getTime() : undefined)

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    code: row.code as string,
    title: row.title as string,
    column: row.column as ColumnId,
    priority: row.priority as Priority,
    labels: (row.labels ?? []) as Label[],
    client: (row.client as string) || undefined,
    assignee: (row.assignee as string) || "",
    assigneeName: (row.assignee_name as string) || undefined,
    assigneeAvatar: (row.assignee_avatar as string) || undefined,
    assigneeColor: (row.assignee_color as string) || "#888",
    hoursLogged: Number(row.hours_logged ?? 0),
    estimate: Number(row.estimate ?? 0),
    description: (row.description as string) || undefined,
    checkpoints: (row.checkpoints as TaskCheckpoint[]) || [],
    comments: (row.comments as TaskComment[]) || [],
    history: (row.history as TaskHistoryEvent[]) || [],
    createdBy: (row.user_id as string) || undefined,
    completedAt: ts(row.completed_at),
    externalRef: (row.external_ref as string) || undefined,
    source: (row.source as string) || undefined,
    vaultPath: (row.vault_path as string) || undefined,
    position: row.position == null ? undefined : Number(row.position),
  }
}

// hours_logged não é enviado: é mantido pelo trigger a partir de time_entries
function taskToRow(task: Task) {
  return {
    id: task.id,
    code: task.code,
    title: task.title,
    column: task.column,
    priority: task.priority,
    labels: task.labels || [],
    client: task.client || null,
    assignee: task.assignee || "",
    assignee_name: task.assigneeName || null,
    assignee_avatar: task.assigneeAvatar || null,
    assignee_color: task.assigneeColor || "#888",
    estimate: task.estimate || 0,
    description: task.description || null,
    checkpoints: task.checkpoints || [],
    comments: task.comments || [],
    history: task.history || [],
    completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
    external_ref: task.externalRef || null,
    vault_path: task.vaultPath || null,
    position: task.position ?? Date.now() / 1000,
  }
}

function rowToMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    title: row.title as string,
    date: row.date as string,
    startTime: (row.start_time as string) || undefined,
    durationMinutes: Number(row.duration_minutes ?? 60),
    client: (row.client as string) || undefined,
    linkedTaskId: (row.linked_task_id as string) || undefined,
    linkedTaskCode: (row.linked_task_code as string) || undefined,
    linkedTaskTitle: (row.linked_task_title as string) || undefined,
    summary: (row.summary as string) || undefined,
    participants: (row.participants as string[]) || [],
    status: (row.status as MeetingStatus) || "planned",
    hoursAddedToTask: Boolean(row.hours_added_to_task),
    granolaId: (row.granola_id as string) || undefined,
    externalRef: (row.external_ref as string) || undefined,
    vaultPath: (row.vault_path as string) || undefined,
  }
}

function meetingToRow(m: Meeting) {
  return {
    id: m.id,
    title: m.title,
    date: m.date,
    start_time: m.startTime || null,
    duration_minutes: m.durationMinutes,
    client: m.client || null,
    linked_task_id: m.linkedTaskId || null,
    linked_task_code: m.linkedTaskCode || null,
    linked_task_title: m.linkedTaskTitle || null,
    summary: m.summary || null,
    participants: m.participants || [],
    status: m.status,
    hours_added_to_task: m.hoursAddedToTask || false,
    external_ref: m.externalRef || null,
    vault_path: m.vaultPath || null,
  }
}

function rowToEntry(row: Record<string, unknown>): TimeEntry {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    taskId: (row.task_id as string) || undefined,
    meetingId: (row.meeting_id as string) || undefined,
    startedAt: new Date(row.started_at as string).getTime(),
    endedAt: ts(row.ended_at),
    hours: Number(row.hours),
    source: row.source as TimeEntrySource,
    note: (row.note as string) || undefined,
  }
}

function rowToEvent(row: Record<string, unknown>): ActivityEvent & { createdAt: number } {
  return {
    id: row.id as string,
    user: row.user_initials as string,
    userId: (row.user_id as string) || undefined,
    userColor: row.user_color as string,
    action: row.action as string,
    target: row.target as string,
    time: "",
    createdAt: new Date(row.created_at as string).getTime(),
  }
}

/** Remove dados legados do modo local (inclui senhas em texto puro de versões antigas). */
function purgeLegacyStorage() {
  try {
    const legacy = ["octho_registered_users", "octho_user", "octho_custom_tags", "octho_custom_clients"]
    legacy.forEach((k) => localStorage.removeItem(k))
    Object.keys(localStorage)
      .filter((k) => /^octho_(data|meetings|user_projects)_/.test(k))
      .forEach((k) => localStorage.removeItem(k))
  } catch {}
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// ─── Provider ───────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile>(EMPTY_USER)
  const [profilesList, setProfilesList] = useState<UserProfile[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [activeView, setActiveView] = useState<ViewId>("dashboard")

  const [tasks, setTasks] = useState<Task[]>([])
  const [activityFeed, setActivityFeed] = useState<(ActivityEvent & { createdAt: number })[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [recentlyChangedTaskIds, setRecentlyChangedTaskIds] = useState<Set<string>>(() => new Set())
  // ids de tarefas escritas por esta aba (para não destacar a própria alteração vinda do Realtime)
  const localWrites = useRef(new Map<string, number>())
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastRead, setLastRead] = useState(0)

  const [storedTimer, setStoredTimer] = useState<StoredTimer | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const isMember = currentUser.role === "member" || currentUser.role === "admin"
  const isAdmin = currentUser.role === "admin"
  const isPendingApproval = isAuthenticated && !isMember

  // Refs para callbacks estáveis que precisam do estado mais recente
  const tasksRef = useRef(tasks)
  const meetingsRef = useRef(meetings)
  const userRef = useRef(currentUser)
  const entriesRef = useRef(timeEntries)
  useLayoutEffect(() => {
    tasksRef.current = tasks
    meetingsRef.current = meetings
    userRef.current = currentUser
    entriesRef.current = timeEntries
  })

  // ── Sessão ──
  useEffect(() => {
    purgeLegacyStorage()
    const client = supabase
    // Sem Supabase a página mostra NotConfiguredScreen antes de olhar isAuthLoading
    if (!client) return

    const apply = async (userId: string | null) => {
      if (!userId) {
        setCurrentUser(EMPTY_USER)
        setIsAuthenticated(false)
        setTasks([])
        setMeetings([])
        setTimeEntries([])
        setActivityFeed([])
        setProfilesList([])
        setIsAuthLoading(false)
        return
      }
      const profile = await getUserProfile(userId)
      const { data } = await client.auth.getUser()
      const authUser = data.user
      const user: UserProfile = profile
        ? profileToUser(profile)
        : {
            id: userId,
            name: authUser?.user_metadata?.name || authUser?.email?.split("@")[0] || "Usuário",
            email: authUser?.email || "",
            avatar: (authUser?.email || "US").slice(0, 2).toUpperCase(),
            avatarColor: "#6366f1",
            role: "pending",
          }
      setCurrentUser(user)
      setIsAuthenticated(true)
      setIsAuthLoading(false)
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return
      // setTimeout: o SDK não permite chamadas ao Supabase dentro do callback
      setTimeout(() => apply(session?.user?.id ?? null), 0)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Carga de dados ──
  const refreshData = useCallback(async () => {
    const client = supabase
    const me = userRef.current
    if (!client || !me.id) return
    setIsDataLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - 400)

    const [profilesRes, tasksRes, eventsRes, meetingsRes, entriesRes] = await Promise.all([
      getAllProfiles(),
      client.from("tasks").select("*").order("position", { ascending: true }),
      client.from("activity_events").select("*").order("created_at", { ascending: false }).limit(50),
      client.from("meetings").select("*").eq("user_id", me.id).order("date", { ascending: false }),
      client.from("time_entries").select("*").gte("started_at", since.toISOString()).order("started_at", { ascending: false }),
    ])

    const errors = [tasksRes.error, eventsRes.error, meetingsRes.error, entriesRes.error].filter(Boolean)
    if (errors.length) setSyncError(`Falha ao carregar dados: ${errors[0]!.message}`)

    setProfilesList(profilesRes.map(profileToUser))
    if (!tasksRes.error) setTasks((tasksRes.data ?? []).map(rowToTask))
    if (!eventsRes.error) setActivityFeed((eventsRes.data ?? []).map(rowToEvent))
    if (!meetingsRes.error) setMeetings((meetingsRes.data ?? []).map(rowToMeeting))
    if (!entriesRes.error) setTimeEntries((entriesRes.data ?? []).map(rowToEntry))

    try {
      await Promise.all([loadTags(), loadClients()])
    } catch (e) {
      setSyncError((e as Error).message)
    }
    setIsDataLoading(false)
    setHasLoaded(true)
  }, [])

  useEffect(() => {
    if (!currentUser.id || !isMember) return
    // Estado local por usuário (localStorage é sistema externo; leitura só existe no cliente)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastRead(readJSON<number>(`octho_last_read_${currentUser.id}`) ?? 0)
    setStoredTimer(readJSON<StoredTimer>(`octho_timer_${currentUser.id}`))
    refreshData()
  }, [currentUser.id, isMember, refreshData])

  // ── Realtime: mudanças de outras pessoas / do Hermes chegam sem recarregar ──
  useEffect(() => {
    const client = supabase
    if (!client || !currentUser.id || !isMember) return
    let debounce: ReturnType<typeof setTimeout> | null = null
    const flashTimers: ReturnType<typeof setTimeout>[] = []
    const schedule = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => refreshData(), 600)
    }
    const channel = client.channel(`octho-live-${currentUser.id}`)
    for (const table of ["tasks", "time_entries", "meetings", "activity_events"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        if (table === "tasks") {
          const row = (payload.new && "id" in payload.new ? payload.new : payload.old) as { id?: string } | null
          const id = row?.id
          const wroteAt = id ? localWrites.current.get(id) : undefined
          if (wroteAt && Date.now() - wroteAt < 4000) return // própria escrita: estado local já está certo
          if (id) {
            setRecentlyChangedTaskIds((prev) => new Set(prev).add(id))
            flashTimers.push(
              setTimeout(
                () =>
                  setRecentlyChangedTaskIds((prev) => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                  }),
                2600
              )
            )
          }
        }
        schedule()
      })
    }
    channel.subscribe()
    return () => {
      if (debounce) clearTimeout(debounce)
      flashTimers.forEach(clearTimeout)
      client.removeChannel(channel)
    }
  }, [currentUser.id, isMember, refreshData])

  /** Executa uma escrita no Supabase; em caso de erro mostra o aviso e recarrega o estado real. */
  const persist = useCallback(
    async (label: string, op: PromiseLike<{ error: { message: string } | null }>) => {
      try {
        const { error } = await op
        if (!error) return true
        setSyncError(`${label}: ${error.message}`)
      } catch (e) {
        setSyncError(`${label}: ${(e as Error).message}`)
      }
      refreshData()
      return false
    },
    [refreshData]
  )

  // ── Timer ──
  useEffect(() => {
    if (!storedTimer?.runningSince) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [storedTimer?.runningSince])

  const saveTimer = useCallback((next: StoredTimer | null) => {
    setStoredTimer(next)
    setNow(Date.now())
    if (userRef.current.id) writeJSON(`octho_timer_${userRef.current.id}`, next)
  }, [])

  const timerSeconds = storedTimer
    ? Math.floor((storedTimer.accumulatedMs + (storedTimer.runningSince ? now - storedTimer.runningSince : 0)) / 1000)
    : 0

  const timer: TimerState = {
    taskId: storedTimer?.taskId ?? null,
    taskCode: storedTimer?.taskCode ?? "",
    seconds: Math.max(0, timerSeconds),
    running: !!storedTimer?.runningSince,
  }

  // ── Derivados do usuário atual ──
  const userData = useMemo<UserData>(
    () => ({
      tasks,
      weeklyHours: computeWeeklyHours(timeEntries, currentUser.id),
      activityBreakdown: computeActivityBreakdown(timeEntries, tasks, currentUser.id),
      activityFeed,
    }),
    [tasks, timeEntries, activityFeed, currentUser.id]
  )

  const hoursMonth = useMemo(() => computeHoursMonth(timeEntries, currentUser.id), [timeEntries, currentUser.id])
  const completedTasksMonth = useMemo(() => computeCompletedThisMonth(tasks), [tasks])

  const unreadCount = activityFeed.filter((e) => e.createdAt > lastRead).length

  // ── Auth / perfil ──
  const handleSignOut = useCallback(async () => {
    await signOutSupabase()
    setActiveView("dashboard")
  }, [])

  const updateMyProfile = useCallback(
    async (updates: { name?: string; imageUrl?: string; avatarColor?: string }) => {
      const me = userRef.current
      if (!supabase || !me.id) return false
      const row: Record<string, unknown> = {}
      const next = { ...me }
      if (updates.name?.trim()) {
        next.name = updates.name.trim()
        next.avatar =
          next.name
            .split(/\s+/)
            .map((p) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "US"
        row.name = next.name
        row.avatar = next.avatar
      }
      if (updates.imageUrl !== undefined) {
        next.imageUrl = updates.imageUrl
        row.image_url = updates.imageUrl
      }
      if (updates.avatarColor) {
        next.avatarColor = updates.avatarColor
        row.avatar_color = updates.avatarColor
      }
      const ok = await persist("Falha ao salvar perfil", supabase.from("profiles").update(row).eq("id", me.id))
      if (ok) {
        setCurrentUser(next)
        setProfilesList((prev) => prev.map((p) => (p.id === next.id ? next : p)))
      }
      return ok
    },
    [persist]
  )

  // ── Atividade ──
  const logActivity = useCallback(
    (action: string, target: string) => {
      const me = userRef.current
      if (!supabase || !me.id) return
      const event = {
        id: crypto.randomUUID(),
        user: me.avatar || "EU",
        userId: me.id,
        userColor: me.avatarColor || "#6366f1",
        action,
        target,
        time: "agora mesmo",
        createdAt: Date.now(),
      }
      setActivityFeed((prev) => [event, ...prev].slice(0, 50))
      persist(
        "Falha ao registrar atividade",
        supabase.from("activity_events").insert({
          id: event.id,
          user_initials: event.user,
          user_color: event.userColor,
          action,
          target,
          created_at: new Date(event.createdAt).toISOString(),
        })
      )
    },
    [persist]
  )

  // ── Tarefas ──
  const saveTask = useCallback(
    (task: Task) => {
      if (!supabase) return
      localWrites.current.set(task.id, Date.now())
      persist("Falha ao salvar tarefa", supabase.from("tasks").upsert(taskToRow(task)))
    },
    [persist]
  )

  const addTask = useCallback(
    (taskData: Omit<Task, "id" | "code">) => {
      const task: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        code: nextCode(tasksRef.current),
        position: positionBetween(
          tasksRef.current.filter((t) => t.column === taskData.column).sort(byPosition).at(-1)?.position,
          undefined
        ),
        hoursLogged: 0,
        createdBy: userRef.current.id,
        completedAt: taskData.column === "done" ? Date.now() : undefined,
      }
      setTasks((prev) => [...prev, task])
      localWrites.current.set(task.id, Date.now())
      logActivity("criou", `${task.code} — ${task.title}`)
      if (supabase) {
        persist("Falha ao criar tarefa", supabase.from("tasks").insert({ ...taskToRow(task), user_id: userRef.current.id }))
      }
    },
    [logActivity, persist]
  )

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      const task = tasksRef.current.find((t) => t.id === id)
      if (!task) return
      const next: Task = { ...task, ...updates }
      if (updates.column && updates.column !== task.column) {
        next.completedAt = updates.column === "done" ? Date.now() : undefined
      }
      setTasks((prev) => prev.map((t) => (t.id === id ? next : t)))
      logActivity("editou", `${task.code} — ${task.title}`)
      saveTask(next)
    },
    [logActivity, saveTask]
  )

  const deleteTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id)
      if (!task) return
      setTasks((prev) => prev.filter((t) => t.id !== id))
      localWrites.current.set(id, Date.now())
      logActivity("excluiu", `${task.code} — ${task.title}`)
      if (supabase) persist("Falha ao excluir tarefa", supabase.from("tasks").delete().eq("id", id))
    },
    [logActivity, persist]
  )

  const moveTask = useCallback(
    (id: string, column: ColumnId, overTaskId?: string) => {
      const task = tasksRef.current.find((t) => t.id === id)
      if (!task) return
      const colName = columns.find((c) => c.id === column)?.name ?? column

      // nova posição: antes do card de destino, ou no fim da coluna
      const siblings = tasksRef.current.filter((t) => t.column === column && t.id !== id).sort(byPosition)
      const overIdx = overTaskId ? siblings.findIndex((t) => t.id === overTaskId) : -1
      const position =
        overIdx >= 0
          ? positionBetween(siblings[overIdx - 1]?.position, siblings[overIdx].position)
          : positionBetween(siblings.at(-1)?.position, undefined)

      if (task.column === column && overTaskId === id) return
      const updated: Task = {
        ...task,
        column,
        position,
        completedAt: column === task.column ? task.completedAt : column === "done" ? Date.now() : undefined,
      }
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
      saveTask(updated)
      if (task.column !== column) logActivity(`moveu para ${colName}`, `${task.code} — ${task.title}`)
    },
    [logActivity, saveTask]
  )

  // ── Lançamentos de horas ──
  const addTimeEntry = useCallback(
    async (input: NewTimeEntry): Promise<TimeEntry | null> => {
      const me = userRef.current
      if (!supabase || !me.id) return null
      const hours = Math.round(input.hours * 100) / 100
      if (!(hours > 0 && hours <= 24)) {
        setSyncError("Lançamento inválido: as horas devem estar entre 0 e 24.")
        return null
      }
      const entry: TimeEntry = { ...input, hours, id: crypto.randomUUID(), userId: me.id }
      setTimeEntries((prev) => [entry, ...prev])
      if (entry.taskId) {
        localWrites.current.set(entry.taskId, Date.now()) // o trigger atualiza tasks.hours_logged
        setTasks((prev) => prev.map((t) => (t.id === entry.taskId ? { ...t, hoursLogged: Math.round((t.hoursLogged + hours) * 100) / 100 } : t)))
      }
      const ok = await persist(
        "Falha ao registrar horas",
        supabase.from("time_entries").insert({
          id: entry.id,
          task_id: entry.taskId ?? null,
          meeting_id: entry.meetingId ?? null,
          started_at: new Date(entry.startedAt).toISOString(),
          ended_at: entry.endedAt ? new Date(entry.endedAt).toISOString() : null,
          hours,
          source: entry.source,
          note: entry.note ?? null,
        })
      )
      return ok ? entry : null
    },
    [persist]
  )

  const deleteTimeEntry = useCallback(
    (id: string) => {
      if (!supabase) return
      const entry = entriesRef.current.find((e) => e.id === id)
      if (!entry) return
      setTimeEntries((prev) => prev.filter((e) => e.id !== id))
      if (entry.taskId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === entry.taskId ? { ...t, hoursLogged: Math.max(0, Math.round((t.hoursLogged - entry.hours) * 100) / 100) } : t))
        )
      }
      persist("Falha ao excluir lançamento", supabase.from("time_entries").delete().eq("id", id))
    },
    [persist]
  )

  // ── Timer (persistido por usuário; sobrevive a recarregar a página) ──
  const startTimer = useCallback(
    (taskId: string, taskCode: string) => {
      const t = Date.now()
      saveTimer({ taskId, taskCode, firstStartedAt: t, accumulatedMs: 0, runningSince: t })
    },
    [saveTimer]
  )

  const setTimerRunning = useCallback(
    (running: boolean) => {
      setStoredTimer((cur) => {
        if (!cur) return cur
        const t = Date.now()
        let next = cur
        if (running && !cur.runningSince) next = { ...cur, runningSince: t }
        if (!running && cur.runningSince) next = { ...cur, accumulatedMs: cur.accumulatedMs + (t - cur.runningSince), runningSince: null }
        if (userRef.current.id) writeJSON(`octho_timer_${userRef.current.id}`, next)
        return next
      })
      setNow(Date.now())
    },
    []
  )

  const pauseTimer = useCallback(() => setTimerRunning(false), [setTimerRunning])
  const resetTimer = useCallback(() => saveTimer(null), [saveTimer])

  const logTimerHours = useCallback((note?: string) => {
    const cur = storedTimer
    if (!cur) return
    const end = Date.now()
    const ms = cur.accumulatedMs + (cur.runningSince ? end - cur.runningSince : 0)
    if (ms < 60_000) {
      setSyncError("O timer precisa de pelo menos 1 minuto para ser registrado.")
      return
    }
    const task = tasksRef.current.find((t) => t.id === cur.taskId)
    const hours = secondsToHours(ms / 1000)
    addTimeEntry({ taskId: cur.taskId, startedAt: cur.firstStartedAt, endedAt: end, hours, source: "timer", note: note?.trim() || undefined }).then((entry) => {
      if (entry && task) logActivity(`registrou ${hours.toFixed(2)}h em`, `${task.code} — ${task.title}`)
    })
    saveTimer(null)
  }, [storedTimer, addTimeEntry, logActivity, saveTimer])

  // ── Reuniões ──
  const saveMeeting = useCallback(
    (m: Meeting) => {
      if (!supabase) return
      persist("Falha ao salvar reunião", supabase.from("meetings").upsert(meetingToRow(m)))
    },
    [persist]
  )

  const meetingAction = (status: MeetingStatus) =>
    status === "completed" ? "concluiu reunião" : status === "cancelled" ? "cancelou reunião" : "agendou reunião"

  const addMeeting = useCallback(
    (m: Omit<Meeting, "id">): Meeting => {
      const newMeeting: Meeting = { ...m, id: crypto.randomUUID() }
      setMeetings((prev) => [newMeeting, ...prev])
      logActivity(meetingAction(newMeeting.status), newMeeting.title)
      if (supabase) {
        persist(
          "Falha ao criar reunião",
          supabase.from("meetings").insert({ ...meetingToRow(newMeeting), user_id: userRef.current.id })
        )
      }
      return newMeeting
    },
    [logActivity, persist]
  )

  const updateMeeting = useCallback(
    (id: string, updates: Partial<Meeting>) => {
      const existing = meetingsRef.current.find((m) => m.id === id)
      if (!existing) return
      const next = { ...existing, ...updates }
      setMeetings((prev) => prev.map((m) => (m.id === id ? next : m)))
      saveMeeting(next)
      if (updates.status && updates.status !== existing.status) logActivity(meetingAction(updates.status), next.title)
    },
    [logActivity, saveMeeting]
  )

  const deleteMeeting = useCallback(
    (id: string) => {
      const existing = meetingsRef.current.find((m) => m.id === id)
      if (!existing) return
      setMeetings((prev) => prev.filter((m) => m.id !== id))
      logActivity("excluiu reunião", existing.title)
      if (supabase) persist("Falha ao excluir reunião", supabase.from("meetings").delete().eq("id", id))
    },
    [logActivity, persist]
  )

  const addMeetingHoursToTask = useCallback(
    (meetingId: string, taskId: string) => {
      const meeting = meetingsRef.current.find((m) => m.id === meetingId)
      const task = tasksRef.current.find((t) => t.id === taskId)
      if (!meeting || meeting.hoursAddedToTask || !task) return
      const hours = Math.round((meeting.durationMinutes / 60) * 100) / 100
      const start = new Date(`${meeting.date}T${meeting.startTime || "09:00"}:00`).getTime()
      addTimeEntry({
        taskId,
        meetingId,
        startedAt: isNaN(start) ? Date.now() : start,
        endedAt: isNaN(start) ? undefined : start + meeting.durationMinutes * 60_000,
        hours,
        source: "meeting",
        note: meeting.title,
      }).then((entry) => {
        if (!entry) return
        updateMeeting(meetingId, { hoursAddedToTask: true, linkedTaskId: taskId, linkedTaskCode: task.code, linkedTaskTitle: task.title })
        logActivity(`adicionou ${hours.toFixed(2)}h (reunião) em`, `${task.code} — ${task.title}`)
      })
    },
    [addTimeEntry, updateMeeting, logActivity]
  )

  // ── Notificações ──
  const markAllRead = useCallback(() => {
    const t = Date.now()
    setLastRead(t)
    if (userRef.current.id) writeJSON(`octho_last_read_${userRef.current.id}`, t)
  }, [])

  const contextValue: AppContextType = {
    currentUser,
    profilesList,
    isAuthenticated,
    isAuthLoading,
    isPendingApproval,
    isAdmin,
    signOut: handleSignOut,
    isSupabaseActive: isSupabaseConfigured(),
    updateMyProfile,
    isDataLoading,
    isInitialLoading: isMember && !hasLoaded,
    recentlyChangedTaskIds,
    syncError,
    dismissSyncError: () => setSyncError(null),
    reportError: setSyncError,
    refreshData,
    activeView,
    setActiveView,
    userData,
    timeEntries,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    logActivity,
    addTimeEntry,
    deleteTimeEntry,
    timer,
    startTimer,
    pauseTimer,
    resetTimer,
    logTimerHours,
    setTimerRunning,
    unreadCount,
    lastReadAt: lastRead,
    markAllRead,
    hoursMonth,
    completedTasksMonth,
    meetings,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addMeetingHoursToTask,
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within an AppProvider")
  return context
}

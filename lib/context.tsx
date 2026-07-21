"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import {
  Task,
  ActivityEvent,
  tasks as sampleTasks,
  weeklyHours as sampleWeeklyHours,
  activityBreakdown as sampleActivityBreakdown,
  activityFeed as sampleActivityFeed,
  type ColumnId,
  type Label,
  type Priority,
  columns,
} from "./data"
import { supabase, isSupabaseConfigured, signOutSupabase, getUserProfile } from "./supabase"

// ─── User Profiles ──────────────────────────────────────────
export type UserProfile = {
  id: string
  name: string
  email: string
  avatar: string
  avatarColor: string
  role?: string
  imageUrl?: string
  verified?: boolean
}

export const users: UserProfile[] = [
  {
    id: "FA",
    name: "Flavio Alves",
    email: "flavio.adsv@gmail.com",
    avatar: "FA",
    avatarColor: "#6366f1",
    role: "Tech Lead",
    imageUrl: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
    verified: true,
  },
  {
    id: "MA",
    name: "Marina Alves",
    email: "flavio.adsv@gmail.com",
    avatar: "MA",
    avatarColor: "#10b981",
    role: "Product Owner",
    imageUrl: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
    verified: true,
  },
  {
    id: "JS",
    name: "João Silva",
    email: "joao@octho.app",
    avatar: "JS",
    avatarColor: "#3b82f6",
    role: "Frontend Engineer",
    imageUrl: "https://images.shadcnspace.com/assets/profiles/user-2.jpg",
    verified: false,
  },
  {
    id: "RP",
    name: "Rafaela Pires",
    email: "rafaela@octho.app",
    avatar: "RP",
    avatarColor: "#f59e0b",
    role: "UI/UX Designer",
    imageUrl: "https://images.shadcnspace.com/assets/profiles/user-4.jpg",
    verified: false,
  },
]

// ─── Views ──────────────────────────────────────────────────
export type ViewId = "dashboard" | "inbox" | "my-tasks" | "kanban" | "projects" | "time-log" | "reports" | "settings"

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

// ─── Context Type ───────────────────────────────────────────
type AppContextType = {
  // User & Auth
  currentUser: UserProfile
  setCurrentUser: (user: UserProfile) => void
  profilesList: UserProfile[]
  addProfile: (profile: UserProfile) => void
  isAuthModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  signOut: () => Promise<void>
  isSupabaseActive: boolean
  // View
  activeView: ViewId
  setActiveView: (view: ViewId) => void
  // Data
  userData: UserData
  // Task CRUD
  addTask: (task: Omit<Task, "id" | "code">) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, column: ColumnId, overTaskId?: string) => void
  // Timer
  timer: TimerState
  startTimer: (taskId: string, taskCode: string) => void
  pauseTimer: () => void
  resetTimer: () => void
  logTimerHours: () => void
  setTimerRunning: (running: boolean) => void
  // Notifications
  unreadCount: number
  markAllRead: () => void
  // Computed
  hoursMonth: number
  completedTasksMonth: number
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// ─── Helper: generate task code ─────────────────────────────
let codeCounter = 300
function nextCode(): string {
  codeCounter++
  return `FLX-${codeCounter}`
}

// ─── Helper: time-ago formatter ─────────────────────────────
export function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return "agora mesmo"
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  return `há ${Math.floor(diff / 86400)} d`
}

// ─── Helper: greeting ───────────────────────────────────────
export function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return "Bom dia"
  if (h >= 12 && h < 18) return "Boa tarde"
  return "Boa noite"
}

// ─── Initial Data ───────────────────────────────────────────
function buildMarinaData(): UserData {
  return {
    tasks: sampleTasks,
    weeklyHours: sampleWeeklyHours,
    activityBreakdown: sampleActivityBreakdown,
    activityFeed: sampleActivityFeed.map((e, i) => ({
      ...e,
      createdAt: Date.now() - (i + 1) * 15 * 60 * 1000,
    })),
  }
}

function buildDefaultUserData(): UserData {
  return {
    tasks: sampleTasks,
    weeklyHours: [
      { day: "Seg", hours: 6.5, goal: 8 },
      { day: "Ter", hours: 7.2, goal: 8 },
      { day: "Qua", hours: 8.1, goal: 8 },
      { day: "Qui", hours: 5.4, goal: 8 },
      { day: "Sex", hours: 6.8, goal: 8 },
      { day: "Sáb", hours: 2.1, goal: 4 },
      { day: "Dom", hours: 0, goal: 0 },
    ],
    activityBreakdown: [
      { name: "Frontend", hours: 42, color: "var(--chart-1)" },
      { name: "Design", hours: 28, color: "var(--chart-2)" },
      { name: "Backend", hours: 34, color: "var(--chart-4)" },
      { name: "Conteúdo", hours: 19, color: "var(--chart-3)" },
      { name: "Reuniões", hours: 15, color: "var(--chart-5)" },
    ],
    activityFeed: sampleActivityFeed.map((e, i) => ({
      ...e,
      createdAt: Date.now() - (i + 1) * 15 * 60 * 1000,
    })),
  }
}

// ─── Supabase Sync ──────────────────────────────────────────
async function loadTasksFromSupabase(profileId: string): Promise<Task[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .or(`user_id.eq.${profileId},profile_id.eq.${profileId}`)
      .order("created_at", { ascending: true })
    if (error) {
      console.error("Supabase load tasks error:", error)
      return null
    }
    if (!data || data.length === 0) return null
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      code: row.code as string,
      title: row.title as string,
      column: row.column as ColumnId,
      priority: row.priority as Priority,
      labels: (row.labels ?? []) as Label[],
      assignee: row.assignee as string,
      assigneeColor: row.assignee_color as string,
      hoursLogged: Number(row.hours_logged ?? 0),
      estimate: Number(row.estimate ?? 0),
    }))
  } catch {
    return null
  }
}

async function saveTaskToSupabase(profileId: string, task: Task) {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from("tasks").upsert({
      id: task.id,
      profile_id: profileId,
      user_id: profileId.length > 5 ? profileId : null,
      code: task.code,
      title: task.title,
      column: task.column,
      priority: task.priority,
      labels: task.labels,
      assignee: task.assignee,
      assignee_color: task.assigneeColor,
      hours_logged: task.hoursLogged,
      estimate: task.estimate,
    })
  } catch (e) {
    console.error("Supabase save task error:", e)
  }
}

async function deleteTaskFromSupabase(taskId: string) {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from("tasks").delete().eq("id", taskId)
  } catch (e) {
    console.error("Supabase delete task error:", e)
  }
}

async function saveActivityToSupabase(profileId: string, event: ActivityEvent & { createdAt: number }) {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from("activity_events").insert({
      id: event.id,
      profile_id: profileId,
      user_id: profileId.length > 5 ? profileId : null,
      user_initials: event.user,
      user_color: event.userColor,
      action: event.action,
      target: event.target,
      created_at: new Date(event.createdAt).toISOString(),
    })
  } catch (e) {
    console.error("Supabase save event error:", e)
  }
}

async function loadEventsFromSupabase(profileId: string): Promise<(ActivityEvent & { createdAt: number })[] | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from("activity_events")
      .select("*")
      .or(`user_id.eq.${profileId},profile_id.eq.${profileId}`)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) {
      console.error("Supabase load events error:", error)
      return null
    }
    if (!data || data.length === 0) return null
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      user: row.user_initials as string,
      userColor: row.user_color as string,
      action: row.action as string,
      target: row.target as string,
      time: "",
      createdAt: new Date(row.created_at as string).getTime(),
    }))
  } catch {
    return null
  }
}

// ─── Provider ───────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserVal] = useState<UserProfile>(users[0])
  const [profilesList, setProfilesList] = useState<UserProfile[]>(users)
  const [activeView, setActiveView] = useState<ViewId>("dashboard")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const addProfile = useCallback((newProfile: UserProfile) => {
    setProfilesList((prev) => {
      if (prev.some((p) => p.id === newProfile.id || p.email === newProfile.email)) return prev
      return [...prev, newProfile]
    })
    setUsersStore((prev) => ({
      ...prev,
      [newProfile.id]: buildDefaultUserData(),
    }))
  }, [])

  const [usersStore, setUsersStore] = useState<Record<string, UserData>>({
    MA: buildMarinaData(),
    FA: buildDefaultUserData(),
  })

  const [timer, setTimer] = useState<TimerState>({
    taskId: null,
    taskCode: "",
    seconds: 0,
    running: false,
  })

  const [lastReadTimestamp, setLastReadTimestamp] = useState<Record<string, number>>({
    MA: Date.now(),
    FA: Date.now(),
  })

  const [supabaseLoaded, setSupabaseLoaded] = useState<Record<string, boolean>>({})

  // ── Listen to Supabase Auth State ──
  useEffect(() => {
    if (!supabase) return

    // Get current active session on boot
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = session.user
        const profile = await getUserProfile(u.id)
        const name = profile?.name || u.user_metadata?.name || u.email?.split("@")[0] || "Usuário"
        const avatar = (profile?.avatar || u.user_metadata?.avatar || name.slice(0, 2)).toUpperCase()
        setCurrentUserVal({
          id: u.id,
          name,
          email: u.email || "",
          avatar,
          avatarColor: profile?.avatar_color || "#6366f1",
          verified: true,
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const u = session.user
        const profile = await getUserProfile(u.id)
        const name = profile?.name || u.user_metadata?.name || u.email?.split("@")[0] || "Usuário"
        const avatar = (profile?.avatar || u.user_metadata?.avatar || name.slice(0, 2)).toUpperCase()
        setCurrentUserVal({
          id: u.id,
          name,
          email: u.email || "",
          avatar,
          avatarColor: profile?.avatar_color || "#6366f1",
          verified: true,
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // ── Load from Supabase on user switch ──
  useEffect(() => {
    const pid = currentUser.id
    if (supabaseLoaded[pid]) return
    const load = async () => {
      const tasks = await loadTasksFromSupabase(pid)
      const events = await loadEventsFromSupabase(pid)
      if (tasks !== null || events !== null) {
        setUsersStore((prev) => ({
          ...prev,
          [pid]: {
            ...prev[pid] || buildDefaultUserData(),
            ...(tasks !== null ? { tasks } : {}),
            ...(events !== null ? { activityFeed: events } : {}),
          },
        }))
      }
      setSupabaseLoaded((prev) => ({ ...prev, [pid]: true }))
    }
    load()
  }, [currentUser.id, supabaseLoaded])

  // ── Timer tick ──
  useEffect(() => {
    if (!timer.running) return
    const interval = setInterval(() => setTimer((t) => ({ ...t, seconds: t.seconds + 1 })), 1000)
    return () => clearInterval(interval)
  }, [timer.running])

  // ── Derived state ──
  const userData = usersStore[currentUser.id] || buildDefaultUserData()

  const hoursMonth = userData.tasks.reduce((acc, t) => acc + t.hoursLogged, 0)
  const completedTasksMonth = userData.tasks.filter((t) => t.column === "done").length

  const unreadCount = userData.activityFeed.filter(
    (e) => e.createdAt > (lastReadTimestamp[currentUser.id] ?? 0)
  ).length

  // ── Auth Actions ──
  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), [])

  const handleSignOut = useCallback(async () => {
    await signOutSupabase()
    setCurrentUserVal(users[0])
  }, [])

  // ── Mutations ──
  const mutateData = useCallback(
    (updater: (prev: UserData) => UserData) => {
      setUsersStore((prev) => ({
        ...prev,
        [currentUser.id]: updater(prev[currentUser.id] || buildDefaultUserData()),
      }))
    },
    [currentUser.id]
  )

  const logActivity = useCallback(
    (action: string, target: string) => {
      const event: ActivityEvent & { createdAt: number } = {
        id: crypto.randomUUID(),
        user: currentUser.avatar,
        userColor: currentUser.avatarColor,
        action,
        target,
        time: "agora mesmo",
        createdAt: Date.now(),
      }
      mutateData((prev) => ({
        ...prev,
        activityFeed: [event, ...prev.activityFeed].slice(0, 50),
      }))
      saveActivityToSupabase(currentUser.id, event)
    },
    [currentUser, mutateData]
  )

  const addTask = useCallback(
    (taskData: Omit<Task, "id" | "code">) => {
      const task: Task = { ...taskData, id: crypto.randomUUID(), code: nextCode() }
      mutateData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
      logActivity("criou", `${task.code} — ${task.title}`)
      saveTaskToSupabase(currentUser.id, task)
    },
    [currentUser.id, mutateData, logActivity]
  )

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      mutateData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== id) return t
          return { ...t, ...updates }
        }),
      }))
      const task = userData.tasks.find((t) => t.id === id)
      if (task) {
        logActivity("editou", `${task.code} — ${task.title}`)
        saveTaskToSupabase(currentUser.id, { ...task, ...updates })
      }
    },
    [currentUser.id, mutateData, logActivity, userData.tasks]
  )

  const deleteTask = useCallback(
    (id: string) => {
      const task = userData.tasks.find((t) => t.id === id)
      mutateData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }))
      if (task) {
        logActivity("excluiu", `${task.code} — ${task.title}`)
        deleteTaskFromSupabase(id)
      }
    },
    [mutateData, logActivity, userData.tasks]
  )

  const moveTask = useCallback(
    (id: string, column: ColumnId, overTaskId?: string) => {
      const task = userData.tasks.find((t) => t.id === id)
      if (!task) return
      const colName = columns.find((c) => c.id === column)?.name ?? column

      mutateData((prev) => {
        const activeTask = prev.tasks.find((t) => t.id === id)
        if (!activeTask) return prev

        const cleanTasks = prev.tasks.filter((t) => t.id !== id)

        let insertIndex = cleanTasks.length
        if (overTaskId) {
          const idx = cleanTasks.findIndex((t) => t.id === overTaskId)
          if (idx !== -1) {
            insertIndex = idx
          }
        }

        const updatedTask = { ...activeTask, column }
        const newTasks = [...cleanTasks]
        newTasks.splice(insertIndex, 0, updatedTask)

        saveTaskToSupabase(currentUser.id, updatedTask)

        return {
          ...prev,
          tasks: newTasks,
        }
      })

      if (task.column !== column) {
        logActivity(`moveu para ${colName}`, `${task.code} — ${task.title}`)
      } else {
        logActivity(`reordenou`, `${task.code} — ${task.title}`)
      }
    },
    [currentUser.id, mutateData, logActivity, userData.tasks]
  )

  // ── Timer ──
  const startTimer = useCallback((taskId: string, taskCode: string) => {
    setTimer({ taskId, taskCode, seconds: 0, running: true })
  }, [])

  const pauseTimer = useCallback(() => {
    setTimer((t) => ({ ...t, running: false }))
  }, [])

  const resetTimer = useCallback(() => {
    setTimer({ taskId: null, taskCode: "", seconds: 0, running: false })
  }, [])

  const setTimerRunning = useCallback((running: boolean) => {
    setTimer((t) => ({ ...t, running }))
  }, [])

  const logTimerHours = useCallback(() => {
    if (!timer.taskId || timer.seconds < 60) return
    const hours = Math.round((timer.seconds / 3600) * 100) / 100
    const task = userData.tasks.find((t) => t.id === timer.taskId)
    if (task) {
      const updated = { ...task, hoursLogged: task.hoursLogged + hours }
      mutateData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === timer.taskId ? updated : t)),
      }))
      logActivity(`registrou ${hours.toFixed(1)}h em`, `${task.code} — ${task.title}`)
      saveTaskToSupabase(currentUser.id, updated)
    }
    setTimer({ taskId: null, taskCode: "", seconds: 0, running: false })
  }, [timer, userData.tasks, currentUser.id, mutateData, logActivity])

  // ── Notifications ──
  const markAllRead = useCallback(() => {
    setLastReadTimestamp((prev) => ({ ...prev, [currentUser.id]: Date.now() }))
  }, [currentUser.id])

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser: setCurrentUserVal,
        profilesList,
        addProfile,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signOut: handleSignOut,
        isSupabaseActive: isSupabaseConfigured(),
        activeView,
        setActiveView,
        userData,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        timer,
        startTimer,
        pauseTimer,
        resetTimer,
        logTimerHours,
        setTimerRunning,
        unreadCount,
        markAllRead,
        hoursMonth,
        completedTasksMonth,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within an AppProvider")
  return context
}

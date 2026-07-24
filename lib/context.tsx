"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import {
  Task,
  TaskCheckpoint,
  TaskComment,
  TaskHistoryEvent,
  ActivityEvent,
  type ColumnId,
  type Label,
  type Priority,
  columns,
} from "./data"
import { supabase, isSupabaseConfigured, signOutSupabase, getUserProfile } from "./supabase"
import { type Meeting, type MeetingStatus } from "./meetings"

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

export const users: UserProfile[] = []

// ─── Views ──────────────────────────────────────────────────
export type ViewId = "dashboard" | "inbox" | "my-tasks" | "kanban" | "projects" | "time-log" | "reports" | "settings" | "login" | "admin" | "meetings"

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
  isAuthenticated: boolean
  login: (user: UserProfile) => void
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
  // Meetings
  meetings: Meeting[]
  addMeeting: (m: Omit<Meeting, "id">) => Meeting
  updateMeeting: (id: string, updates: Partial<Meeting>) => void
  deleteMeeting: (id: string) => void
  addMeetingHoursToTask: (meetingId: string, taskId: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// ─── Helper: generate task code ─────────────────────────────
let codeCounter = 300
function nextCode(): string {
  codeCounter++
  return `OCT-${codeCounter}`
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

// ─── Initial Clean Data ──────────────────────────────────────
function buildDefaultUserData(): UserData {
  return {
    tasks: [],
    weeklyHours: [
      { day: "Seg", hours: 0, goal: 8 },
      { day: "Ter", hours: 0, goal: 8 },
      { day: "Qua", hours: 0, goal: 8 },
      { day: "Qui", hours: 0, goal: 8 },
      { day: "Sex", hours: 0, goal: 8 },
      { day: "Sáb", hours: 0, goal: 4 },
      { day: "Dom", hours: 0, goal: 0 },
    ],
    activityBreakdown: [],
    activityFeed: [],
  }
}

// ─── Supabase Sync ──────────────────────────────────────────
async function loadTasksFromSupabase(profileId: string): Promise<Task[] | null> {
  if (!isSupabaseConfigured() || !supabase || !profileId) return null
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
    if (!data) return null
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      code: row.code as string,
      title: row.title as string,
      column: row.column as ColumnId,
      priority: row.priority as Priority,
      labels: (row.labels ?? []) as Label[],
      assignee: row.assignee as string,
      assigneeName: (row.assignee_name as string) || undefined,
      assigneeAvatar: (row.assignee_avatar as string) || undefined,
      assigneeColor: (row.assignee_color as string) || "#888",
      hoursLogged: Number(row.hours_logged ?? 0),
      estimate: Number(row.estimate ?? 0),
      description: (row.description as string) || undefined,
      checkpoints: (row.checkpoints as TaskCheckpoint[]) || [],
      comments: (row.comments as TaskComment[]) || [],
      history: (row.history as TaskHistoryEvent[]) || [],
    }))
  } catch {
    return null
  }
}

async function saveTaskToSupabase(profileId: string, task: Task) {
  if (!isSupabaseConfigured() || !supabase || !profileId) return
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
      assignee_name: task.assigneeName || null,
      assignee_avatar: task.assigneeAvatar || null,
      assignee_color: task.assigneeColor,
      hours_logged: task.hoursLogged,
      estimate: task.estimate,
      description: task.description || null,
      checkpoints: task.checkpoints || [],
      comments: task.comments || [],
      history: task.history || [],
    })
  } catch (e) {
    console.error("Supabase save task error:", e)
  }
}

async function loadMeetingsFromSupabase(profileId: string): Promise<Meeting[] | null> {
  if (!isSupabaseConfigured() || !supabase || !profileId) return null
  try {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .or(`user_id.eq.${profileId},profile_id.eq.${profileId}`)
      .order("date", { ascending: false })
    if (error) {
      console.error("Supabase load meetings error:", error)
      return null
    }
    if (!data) return null
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      date: row.date as string,
      startTime: (row.start_time as string) || undefined,
      durationMinutes: Number(row.duration_minutes ?? 60),
      linkedTaskId: (row.linked_task_id as string) || undefined,
      linkedTaskCode: (row.linked_task_code as string) || undefined,
      linkedTaskTitle: (row.linked_task_title as string) || undefined,
      summary: (row.summary as string) || undefined,
      participants: (row.participants as string[]) || [],
      status: (row.status as MeetingStatus) || "planned",
      hoursAddedToTask: Boolean(row.hours_added_to_task),
    }))
  } catch {
    return null
  }
}

async function saveMeetingToSupabase(profileId: string, m: Meeting) {
  if (!isSupabaseConfigured() || !supabase || !profileId) return
  try {
    await supabase.from("meetings").upsert({
      id: m.id,
      profile_id: profileId,
      user_id: profileId.length > 5 ? profileId : null,
      title: m.title,
      date: m.date,
      start_time: m.startTime || null,
      duration_minutes: m.durationMinutes,
      linked_task_id: m.linkedTaskId || null,
      linked_task_code: m.linkedTaskCode || null,
      linked_task_title: m.linkedTaskTitle || null,
      summary: m.summary || null,
      participants: m.participants || [],
      status: m.status,
      hours_added_to_task: m.hoursAddedToTask || false,
    })
  } catch (e) {
    console.error("Supabase save meeting error:", e)
  }
}

async function deleteMeetingFromSupabase(meetingId: string) {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from("meetings").delete().eq("id", meetingId)
  } catch (e) {
    console.error("Supabase delete meeting error:", e)
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
  if (!isSupabaseConfigured() || !supabase || !profileId) return
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
  if (!isSupabaseConfigured() || !supabase || !profileId) return null
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
    if (!data) return null
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
  const [currentUser, setCurrentUserVal] = useState<UserProfile>({
    id: "",
    name: "",
    email: "",
    avatar: "",
    avatarColor: "#6366f1",
  })
  const [profilesList, setProfilesList] = useState<UserProfile[]>([])
  const [activeView, setActiveView] = useState<ViewId>("login")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [usersStore, setUsersStore] = useState<Record<string, UserData>>({})

  const [timer, setTimer] = useState<TimerState>({
    taskId: null,
    taskCode: "",
    seconds: 0,
    running: false,
  })

  const [lastReadTimestamp, setLastReadTimestamp] = useState<Record<string, number>>({})
  const [supabaseLoaded, setSupabaseLoaded] = useState<Record<string, boolean>>({})

  // ── Meetings state (per-user localStorage) ──
  const [meetingsStore, setMeetingsStore] = useState<Record<string, Meeting[]>>({})

  const meetings: Meeting[] = React.useMemo(
    () => (currentUser.id ? (meetingsStore[currentUser.id] ?? []) : []),
    [meetingsStore, currentUser.id]
  )

  const mutateMeetings = useCallback(
    (updater: (prev: Meeting[]) => Meeting[]) => {
      if (!currentUser.id) return
      setMeetingsStore((prev) => {
        const current = prev[currentUser.id] ?? []
        const updated = updater(current)
        setTimeout(() => {
          try {
            localStorage.setItem(`octho_meetings_${currentUser.id}`, JSON.stringify(updated))
          } catch {}
        }, 0)
        return { ...prev, [currentUser.id]: updated }
      })
    },
    [currentUser.id]
  )

  // ── Restore Login Session & Persistence ──
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem("octho_user")
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr)
        if (savedUser && savedUser.id) {
          setCurrentUserVal(savedUser)
          setProfilesList((prev) => (prev.some((p) => p.id === savedUser.id) ? prev : [...prev, savedUser]))
          setIsAuthenticated(true)
          setActiveView("dashboard")

          const savedDataStr = localStorage.getItem(`octho_data_${savedUser.id}`)
          if (savedDataStr) {
            const savedData = JSON.parse(savedDataStr)
            setUsersStore((prev) => ({ ...prev, [savedUser.id]: savedData }))
          }

          const savedMeetingsStr = localStorage.getItem(`octho_meetings_${savedUser.id}`)
          if (savedMeetingsStr) {
            const savedMeetings = JSON.parse(savedMeetingsStr)
            setMeetingsStore((prev) => ({ ...prev, [savedUser.id]: savedMeetings }))
          }
        }
      }
    } catch (e) {
      console.error("Error restoring session:", e)
    }

    if (supabase) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const u = session.user
          const profile = await getUserProfile(u.id)
          const name = profile?.name || u.user_metadata?.name || u.email?.split("@")[0] || "Usuário"
          const avatar = (profile?.avatar || u.user_metadata?.avatar || name.slice(0, 2)).toUpperCase()
          const userObj: UserProfile = {
            id: u.id,
            name,
            email: u.email || "",
            avatar,
            avatarColor: profile?.avatar_color || "#6366f1",
            verified: true,
          }
          setCurrentUserVal(userObj)
          setProfilesList((prev) => (prev.some((p) => p.id === userObj.id) ? prev : [...prev, userObj]))
          setIsAuthenticated(true)
          setActiveView("dashboard")
          try {
            localStorage.setItem("octho_user", JSON.stringify(userObj))
          } catch {}
        }
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const u = session.user
          const profile = await getUserProfile(u.id)
          const name = profile?.name || u.user_metadata?.name || u.email?.split("@")[0] || "Usuário"
          const avatar = (profile?.avatar || u.user_metadata?.avatar || name.slice(0, 2)).toUpperCase()
          const userObj: UserProfile = {
            id: u.id,
            name,
            email: u.email || "",
            avatar,
            avatarColor: profile?.avatar_color || "#6366f1",
            verified: true,
          }
          setCurrentUserVal(userObj)
          setProfilesList((prev) => (prev.some((p) => p.id === userObj.id) ? prev : [...prev, userObj]))
          setIsAuthenticated(true)
          setActiveView("dashboard")
          try {
            localStorage.setItem("octho_user", JSON.stringify(userObj))
          } catch {}
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [])

  const login = useCallback((user: UserProfile) => {
    setCurrentUserVal(user)
    setIsAuthenticated(true)
    setActiveView("dashboard")
    setIsAuthModalOpen(false)
    setProfilesList((prev) => (prev.some((p) => p.id === user.id) ? prev : [...prev, user]))
    try {
      localStorage.setItem("octho_user", JSON.stringify(user))
    } catch {}
  }, [])

  const addProfile = useCallback((newProfile: UserProfile) => {
    setProfilesList((prev) => {
      if (prev.some((p) => p.id === newProfile.id || p.email === newProfile.email)) return prev
      return [...prev, newProfile]
    })
  }, [])

  // ── Load from Supabase on user switch ──
  useEffect(() => {
    const pid = currentUser.id
    if (!pid || supabaseLoaded[pid]) return
    const load = async () => {
      const tasks = await loadTasksFromSupabase(pid)
      const events = await loadEventsFromSupabase(pid)
      const dbMeetings = await loadMeetingsFromSupabase(pid)

      if (tasks !== null || events !== null) {
        setUsersStore((prev) => {
          const existing = prev[pid] || buildDefaultUserData()
          const updated = {
            ...existing,
            ...(tasks !== null ? { tasks } : {}),
            ...(events !== null ? { activityFeed: events } : {}),
          }
          try {
            localStorage.setItem(`octho_data_${pid}`, JSON.stringify(updated))
          } catch {}
          return {
            ...prev,
            [pid]: updated,
          }
        })
      }

      if (dbMeetings !== null) {
        setMeetingsStore((prev) => ({ ...prev, [pid]: dbMeetings }))
        try {
          localStorage.setItem(`octho_meetings_${pid}`, JSON.stringify(dbMeetings))
        } catch {}
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

  // ── Derived state for CURRENT USER ONLY ──
  const rawUserData = (currentUser.id ? usersStore[currentUser.id] : null) || buildDefaultUserData()

  const userData = {
    ...rawUserData,
    tasks: rawUserData.tasks,
    activityFeed: rawUserData.activityFeed,
  }

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
    try {
      localStorage.removeItem("octho_user")
    } catch {}
    setCurrentUserVal({ id: "", name: "", email: "", avatar: "", avatarColor: "#6366f1" })
    setIsAuthenticated(false)
    setActiveView("login")
    setIsAuthModalOpen(false)
  }, [])

  // ── Mutations ──
  const mutateData = useCallback(
    (updater: (prev: UserData) => UserData) => {
      if (!currentUser.id) return
      setUsersStore((prev) => {
        const current = prev[currentUser.id] || buildDefaultUserData()
        const updated = updater(current)
        setTimeout(() => {
          try {
            localStorage.setItem(`octho_data_${currentUser.id}`, JSON.stringify(updated))
          } catch {}
        }, 0)
        return {
          ...prev,
          [currentUser.id]: updated,
        }
      })
    },
    [currentUser.id]
  )

  const logActivity = useCallback(
    (action: string, target: string) => {
      if (!currentUser.id) return
      const event: ActivityEvent & { createdAt: number } = {
        id: crypto.randomUUID(),
        user: currentUser.avatar || "EU",
        userColor: currentUser.avatarColor || "#6366f1",
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
      if (!currentUser.id) return
      const task: Task = { ...taskData, id: crypto.randomUUID(), code: nextCode() }
      mutateData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
      logActivity("criou", `${task.code} — ${task.title}`)
      saveTaskToSupabase(currentUser.id, task)
    },
    [currentUser.id, mutateData, logActivity]
  )

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      if (!currentUser.id) return
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
      if (!currentUser.id) return
      const task = userData.tasks.find((t) => t.id === id)
      mutateData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }))
      if (task) {
        logActivity("excluiu", `${task.code} — ${task.title}`)
        deleteTaskFromSupabase(id)
      }
    },
    [currentUser.id, mutateData, logActivity, userData.tasks]
  )

  const moveTask = useCallback(
    (id: string, column: ColumnId, overTaskId?: string) => {
      if (!currentUser.id) return
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
    if (!timer.taskId || timer.seconds < 60 || !currentUser.id) return
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

  // ── Meetings CRUD ──
  const addMeeting = useCallback(
    (m: Omit<Meeting, "id">): Meeting => {
      const newMeeting: Meeting = { ...m, id: crypto.randomUUID() }
      mutateMeetings((prev) => [newMeeting, ...prev])
      const actionLabel =
        newMeeting.status === "completed"
          ? "concluiu reunião"
          : newMeeting.status === "cancelled"
          ? "cancelou reunião"
          : "agendou reunião"
      logActivity(actionLabel, newMeeting.title)
      return newMeeting
    },
    [mutateMeetings, logActivity]
  )

  const updateMeeting = useCallback(
    (id: string, updates: Partial<Meeting>) => {
      const existing = meetings.find((m) => m.id === id)
      mutateMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)))
      if (existing) {
        const title = updates.title ?? existing.title
        if (updates.status && updates.status !== existing.status) {
          const actionLabel =
            updates.status === "completed"
              ? "concluiu reunião"
              : updates.status === "cancelled"
              ? "cancelou reunião"
              : "agendou reunião"
          logActivity(actionLabel, title)
        }
      }
    },
    [meetings, mutateMeetings, logActivity]
  )

  const deleteMeeting = useCallback(
    (id: string) => {
      const existing = meetings.find((m) => m.id === id)
      mutateMeetings((prev) => prev.filter((m) => m.id !== id))
      if (existing) {
        logActivity("excluiu reunião", existing.title)
      }
    },
    [meetings, mutateMeetings, logActivity]
  )

  const addMeetingHoursToTask = useCallback(
    (meetingId: string, taskId: string) => {
      const meeting = meetings.find((m) => m.id === meetingId)
      if (!meeting || meeting.hoursAddedToTask) return
      const hours = Math.round((meeting.durationMinutes / 60) * 100) / 100
      const task = userData.tasks.find((t) => t.id === taskId)
      if (!task) return
      const updated = { ...task, hoursLogged: task.hoursLogged + hours }
      mutateData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? updated : t)),
      }))
      mutateMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? { ...m, hoursAddedToTask: true, linkedTaskId: taskId, linkedTaskCode: task.code, linkedTaskTitle: task.title }
            : m
        )
      )
      logActivity(`adicionou ${hours.toFixed(1)}h (reunião) em`, `${task.code} — ${task.title}`)
      saveTaskToSupabase(currentUser.id, updated)
    },
    [meetings, userData.tasks, currentUser.id, mutateData, mutateMeetings, logActivity]
  )

  // ── Notifications ──
  const markAllRead = useCallback(() => {
    if (!currentUser.id) return
    setLastReadTimestamp((prev) => ({ ...prev, [currentUser.id]: Date.now() }))
  }, [currentUser.id])

  const contextValue = React.useMemo(
    () => ({
      currentUser,
      setCurrentUser: setCurrentUserVal,
      profilesList,
      addProfile,
      isAuthenticated,
      login,
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
      meetings,
      addMeeting,
      updateMeeting,
      deleteMeeting,
      addMeetingHoursToTask,
    }),
    [
      currentUser,
      setCurrentUserVal,
      profilesList,
      addProfile,
      isAuthenticated,
      login,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
      handleSignOut,
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
      meetings,
      addMeeting,
      updateMeeting,
      deleteMeeting,
      addMeetingHoursToTask,
    ]
  )

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error("useApp must be used within an AppProvider")
  return context
}

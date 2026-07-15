"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import {
  Task,
  ActivityEvent,
  tasks as sampleTasks,
  weeklyHours as sampleWeeklyHours,
  activityBreakdown as sampleActivityBreakdown,
  activityFeed as sampleActivityFeed
} from "./data"

export type UserProfile = {
  id: string
  name: string
  email: string
  avatar: string
  avatarColor: string
}

export const users: UserProfile[] = [
  {
    id: "MA",
    name: "Marina Alves",
    email: "marina@fluxo.app",
    avatar: "MA",
    avatarColor: "var(--chart-4)",
  },
  {
    id: "FA",
    name: "Flavio Alves",
    email: "flavio@fluxo.app",
    avatar: "FA",
    avatarColor: "var(--chart-1)",
  },
]

export type UserData = {
  tasks: Task[]
  weeklyHours: typeof sampleWeeklyHours
  activityBreakdown: typeof sampleActivityBreakdown
  activityFeed: ActivityEvent[]
  hoursMonth: number
  completedTasksMonth: number
}

type AppContextType = {
  currentUser: UserProfile
  setCurrentUser: (user: UserProfile) => void
  userData: UserData
  setUserData: React.Dispatch<React.SetStateAction<UserData>>
  updateUserData: (updater: Partial<UserData> | ((prev: UserData) => UserData)) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const initialFlavioData: UserData = {
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
  activityBreakdown: [
    { name: "Frontend", hours: 0, color: "var(--chart-1)" },
    { name: "Design", hours: 0, color: "var(--chart-2)" },
    { name: "Backend", hours: 0, color: "var(--chart-4)" },
    { name: "Conteúdo", hours: 0, color: "var(--chart-3)" },
    { name: "Reuniões", hours: 0, color: "var(--chart-5)" },
  ],
  activityFeed: [],
  hoursMonth: 0,
  completedTasksMonth: 0
}

const initialMarinaData: UserData = {
  tasks: sampleTasks,
  weeklyHours: sampleWeeklyHours,
  activityBreakdown: sampleActivityBreakdown,
  activityFeed: sampleActivityFeed,
  hoursMonth: 138,
  completedTasksMonth: 24
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserVal] = useState<UserProfile>(users[0]) // Marina by default
  
  const [usersStore, setUsersStore] = useState<Record<string, UserData>>({
    MA: initialMarinaData,
    FA: initialFlavioData
  })

  const currentUserData = usersStore[currentUser.id]

  const updateUserData = (updater: Partial<UserData> | ((prev: UserData) => UserData)) => {
    setUsersStore(prevStore => {
      const currentData = prevStore[currentUser.id]
      const updatedData = typeof updater === "function" ? updater(currentData) : { ...currentData, ...updater }
      return {
        ...prevStore,
        [currentUser.id]: updatedData
      }
    })
  }

  const setUserData: React.Dispatch<React.SetStateAction<UserData>> = (value) => {
    setUsersStore(prevStore => {
      const currentData = prevStore[currentUser.id]
      const updatedData = typeof value === "function" ? (value as Function)(currentData) : value
      return {
        ...prevStore,
        [currentUser.id]: updatedData
      }
    })
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser: setCurrentUserVal,
        userData: currentUserData,
        setUserData,
        updateUserData
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}

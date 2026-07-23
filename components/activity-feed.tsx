"use client"

import { useState } from "react"
import { useApp, timeAgo } from "@/lib/context"
import { TaskDetailsModal } from "@/components/task-details-modal"
import type { Task } from "@/lib/data"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const nameMap: Record<string, string> = {
  MA: "Marina",
  JS: "João",
  RP: "Rafa",
  FA: "Flavio",
}

const avatarMap: Record<string, string> = {
  MA: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
  FA: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
  JS: "https://images.shadcnspace.com/assets/profiles/user-2.jpg",
  RP: "https://images.shadcnspace.com/assets/profiles/user-4.jpg",
}

export function ActivityFeed() {
  const { userData } = useApp()
  const { activityFeed } = userData
  const [editTask, setEditTask] = useState<Task | null>(null)

  const handleClickEvent = (target: string) => {
    const codeMatch = target.match(/^(FLX-\d+)/)
    if (codeMatch) {
      const task = userData.tasks.find(t => t.code === codeMatch[1])
      if (task) setEditTask(task)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Atividade recente</h3>
            <p className="text-xs text-muted-foreground">O que a equipe fez hoje</p>
          </div>
          {activityFeed.length > 0 && (
            <span className="text-xs tabular-nums font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
              {Math.min(activityFeed.length, 10)}
            </span>
          )}
        </div>

        {activityFeed.length > 0 ? (
          <ul className="mt-5 flex flex-col">
            {activityFeed.slice(0, 10).map((e, i) => (
              <li
                key={e.id}
                className="relative flex gap-3 pb-5 last:pb-0 animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                {i !== Math.min(activityFeed.length, 10) - 1 && (
                  <span className="absolute left-3.5 top-8 h-full w-px bg-border" aria-hidden />
                )}
                <Avatar className="z-10 size-7 shrink-0 border border-border/50 transition-transform duration-150 hover:scale-110">
                  {avatarMap[e.user] && <AvatarImage src={avatarMap[e.user]} alt={nameMap[e.user] ?? e.user} />}
                  <AvatarFallback style={{ backgroundColor: e.userColor, color: "#fff" }} className="text-[10px] font-semibold">
                    {e.user}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => handleClickEvent(e.target)}
                    className="text-left text-sm leading-snug text-card-foreground hover:underline decoration-muted-foreground underline-offset-2 transition-all"
                  >
                    <span className="font-semibold text-foreground">{nameMap[e.user] ?? e.user}</span>{" "}
                    <span className="text-muted-foreground">{e.action}</span>{" "}
                    <span className="text-card-foreground font-medium">{e.target}</span>
                  </button>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.createdAt ? timeAgo(e.createdAt) : e.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            <span className="text-2xl mb-2">💤</span>
            Nenhuma atividade registrada
          </div>
        )}
      </div>

      <TaskDetailsModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
    </>
  )
}

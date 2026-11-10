"use client"

import { useState } from "react"
import { useApp, timeAgo } from "@/lib/context"
import { TaskDetailsModal } from "@/components/task-details-modal"
import type { Task } from "@/lib/data"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { actorOf, taskCodeFromTarget } from "@/lib/people"



export function ActivityFeed() {
  const { userData, profilesList } = useApp()
  const { activityFeed } = userData
  const [editTask, setEditTask] = useState<Task | null>(null)

  const handleClickEvent = (target: string) => {
    const code = taskCodeFromTarget(target)
    const task = code ? userData.tasks.find((t) => t.code === code) : undefined
    if (task) setEditTask(task)
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Atividade recente</h3>
            <p className="text-xs text-muted-foreground">Últimas ações da equipe</p>
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
                <Avatar className="z-10 size-7 shrink-0 border border-border/50">
                  {actorOf(e, profilesList).imageUrl && <AvatarImage src={actorOf(e, profilesList).imageUrl} alt="" />}
                  <AvatarFallback style={{ backgroundColor: actorOf(e, profilesList).color, color: "#fff" }} className="text-[10px] font-semibold">
                    {actorOf(e, profilesList).initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => handleClickEvent(e.target)}
                    className="text-left text-sm leading-snug text-card-foreground hover:underline decoration-muted-foreground underline-offset-2 transition-all"
                  >
                    <span className="font-semibold text-foreground">{actorOf(e, profilesList).name}</span>{" "}
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

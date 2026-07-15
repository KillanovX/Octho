"use client"

import { useState } from "react"
import { useApp, timeAgo } from "@/lib/context"
import { TaskModal } from "@/components/task-modal"
import type { Task } from "@/lib/data"

const nameMap: Record<string, string> = {
  MA: "Marina",
  JS: "João",
  RP: "Rafa",
  FA: "Flavio",
}

export function ActivityFeed() {
  const { userData } = useApp()
  const { activityFeed } = userData
  const [editTask, setEditTask] = useState<Task | null>(null)

  const handleClickEvent = (target: string) => {
    // Try to find the task by code in target string (e.g. "FLX-244 — ...")
    const codeMatch = target.match(/^(FLX-\d+)/)
    if (codeMatch) {
      const task = userData.tasks.find(t => t.code === codeMatch[1])
      if (task) setEditTask(task)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-card-foreground">Atividade recente</h3>
        <p className="text-xs text-muted-foreground">O que a equipe fez hoje</p>

        {activityFeed.length > 0 ? (
          <ul className="mt-5 flex flex-col">
            {activityFeed.slice(0, 10).map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i !== Math.min(activityFeed.length, 10) - 1 && (
                  <span className="absolute left-3.5 top-8 h-full w-px bg-border" aria-hidden />
                )}
                <span
                  className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: e.userColor }}
                >
                  {e.user}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => handleClickEvent(e.target)}
                    className="text-left text-sm leading-snug text-card-foreground hover:underline"
                  >
                    <span className="font-medium">{nameMap[e.user] ?? e.user}</span>{" "}
                    <span className="text-muted-foreground">{e.action}</span>{" "}
                    <span className="text-card-foreground">{e.target}</span>
                  </button>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.createdAt ? timeAgo(e.createdAt) : e.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            Nenhuma atividade registrada
          </div>
        )}
      </div>

      <TaskModal open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />
    </>
  )
}

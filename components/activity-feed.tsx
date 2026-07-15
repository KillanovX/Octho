"use client"

import { useApp } from "@/lib/context"

export function ActivityFeed() {
  const { userData } = useApp()
  const { activityFeed } = userData

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-card-foreground">Atividade recente</h3>
      <p className="text-xs text-muted-foreground">O que a equipe fez hoje</p>

      {activityFeed.length > 0 ? (
        <ul className="mt-5 flex flex-col">
          {activityFeed.map((e, i) => (
            <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i !== activityFeed.length - 1 && (
                <span className="absolute left-3.5 top-8 h-full w-px bg-border" aria-hidden />
              )}
              <span
                className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: e.userColor }}
              >
                {e.user}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-card-foreground">
                  <span className="font-medium">
                    {e.user === "MA" ? "Marina" : e.user === "JS" ? "João" : e.user === "FA" ? "Flavio" : "Rafa"}
                  </span>{" "}
                  <span className="text-muted-foreground">{e.action}</span>{" "}
                  <span className="text-card-foreground">{e.target}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{e.time}</p>
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
  )
}

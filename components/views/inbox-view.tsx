"use client"

import React, { useState } from "react"
import { Bell, CheckCheck, MessageSquare, CheckCircle, Clock, AlertCircle, ArrowUpRight } from "lucide-react"
import { useApp, timeAgo } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { actorOf } from "@/lib/people"


export function InboxView() {
  const { userData, markAllRead, unreadCount, lastReadAt, profilesList } = useApp()
  const { activityFeed } = userData

  const [tab, setTab] = useState<"all" | "unread">("all")

  const filteredFeed = activityFeed.filter((item) => {
    if (tab === "unread") return item.createdAt > lastReadAt
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Caixa de Entrada</h2>
              {unreadCount > 0 && (
                <span className="flex h-5 items-center justify-center rounded-full bg-destructive px-2 text-[10px] font-bold text-white">
                  {unreadCount} novas
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Central de notificações, atualizações de tarefas e atividades da equipe
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <CheckCheck className="size-3.5" />
              <span>Marcar todas como lidas</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            Todas ({activityFeed.length})
          </button>
          <button
            onClick={() => setTab("unread")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "unread"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            Não lidas ({unreadCount})
          </button>
        </div>

        {/* Feed List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {filteredFeed.length > 0 ? (
            filteredFeed.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 hover:bg-accent/40 transition-colors"
              >
                <Avatar className="size-9 shrink-0 mt-0.5">
                  {actorOf(item, profilesList).imageUrl && <AvatarImage src={actorOf(item, profilesList).imageUrl} alt="" />}
                  <AvatarFallback style={{ backgroundColor: actorOf(item, profilesList).color, color: "#fff" }} className="text-xs font-semibold">
                    {actorOf(item, profilesList).initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{actorOf(item, profilesList).name}</span>
                    <span className="text-xs text-muted-foreground">{item.action}</span>
                    <span className="text-xs font-medium text-foreground bg-muted px-1.5 py-0.5 rounded truncate">
                      {item.target}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <Bell className="size-8 text-muted-foreground/50 mb-2" />
              Nenhuma notificação no momento.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

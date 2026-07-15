"use client"

import { useEffect, useRef } from "react"
import { useApp, timeAgo } from "@/lib/context"

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

const userNames: Record<string, string> = {
  MA: "Marina",
  JS: "João",
  RP: "Rafa",
  FA: "Flavio",
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { userData, markAllRead } = useApp()
  const panelRef = useRef<HTMLDivElement>(null)

  // Mark all as read when panel opens
  useEffect(() => {
    if (open) {
      markAllRead()
    }
  }, [open, markAllRead])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use a small delay so the click that opened the panel doesn't immediately close it
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler)
    }, 10)
    return () => {
      clearTimeout(t)
      document.removeEventListener("mousedown", handler)
    }
  }, [open, onClose])

  if (!open) return null

  const events = userData.activityFeed.slice(0, 15)

  return (
    <div
      ref={panelRef}
      className="animate-in fade-in slide-in-from-top-2 absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          Nenhuma notificação
        </div>
      ) : (
        <div className="flex flex-col">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/50"
            >
              {/* User Avatar */}
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: event.userColor }}
              >
                {event.user}
              </div>

              {/* Event Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm leading-snug text-foreground">
                  <span className="font-medium">
                    {userNames[event.user] ?? event.user}
                  </span>{" "}
                  <span className="text-muted-foreground">{event.action}</span>{" "}
                  <span className="font-medium">{event.target}</span>
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(event.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

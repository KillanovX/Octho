"use client"

import React from "react"
import { X, Check } from "lucide-react"
import { useApp } from "@/lib/context"
import { updateUserAvatarImage } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export const shadcnAvatars = [
  { id: "user-1", name: "Avatar 1", url: "https://images.shadcnspace.com/assets/profiles/user-1.jpg" },
  { id: "user-2", name: "Avatar 2", url: "https://images.shadcnspace.com/assets/profiles/user-2.jpg" },
  { id: "user-3", name: "Avatar 3", url: "https://images.shadcnspace.com/assets/profiles/user-3.jpg" },
  { id: "user-4", name: "Avatar 4", url: "https://images.shadcnspace.com/assets/profiles/user-4.jpg" },
  { id: "user-5", name: "Avatar 5", url: "https://images.shadcnspace.com/assets/profiles/user-5.jpg" },
  { id: "user-6", name: "Avatar 6", url: "https://images.shadcnspace.com/assets/profiles/user-6.jpg" },
  { id: "user-7", name: "Avatar 7", url: "https://images.shadcnspace.com/assets/profiles/user-7.jpg" },
  { id: "user-8", name: "Avatar 8", url: "https://images.shadcnspace.com/assets/profiles/user-8.jpg" },
  { id: "user-9", name: "Avatar 9", url: "https://images.shadcnspace.com/assets/profiles/user-9.jpg" },
  { id: "user-10", name: "Avatar 10", url: "https://images.shadcnspace.com/assets/profiles/user-10.jpg" },
]

type AvatarSelectorModalProps = {
  open: boolean
  onClose: () => void
}

export function AvatarSelectorModal({ open, onClose }: AvatarSelectorModalProps) {
  const { currentUser, setCurrentUser } = useApp()

  if (!open) return null

  const handleSelect = async (url: string) => {
    const updatedUser = {
      ...currentUser,
      imageUrl: url,
    }

    setCurrentUser(updatedUser)

    try {
      localStorage.setItem("octho_user", JSON.stringify(updatedUser))
    } catch {}

    if (currentUser?.id) {
      await updateUserAvatarImage(currentUser.id, url)
    }

    onClose()
  }

  const currentUrl = currentUser?.imageUrl || "https://images.shadcnspace.com/assets/profiles/user-1.jpg"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-border bg-card p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Escolher Avatar</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2.5 pt-1">
          {shadcnAvatars.map((item) => {
            const isSelected = currentUrl === item.url
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.url)}
                className={cn(
                  "relative size-12 rounded-full border-2 transition-all p-0.5 overflow-hidden outline-none",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-primary/50"
                )}
              >
                <img
                  src={item.url}
                  alt={item.name}
                  className="size-full rounded-full object-cover"
                />
                {isSelected && (
                  <span className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full text-white">
                    <Check className="size-4" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

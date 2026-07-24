"use client"

import React, { useState } from "react"
import { X, Check, Camera, Sparkles } from "lucide-react"
import { useApp } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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

  const [selectedUrl, setSelectedUrl] = useState<string>(
    currentUser?.imageUrl || "https://images.shadcnspace.com/assets/profiles/user-1.jpg"
  )

  if (!open) return null

  const handleSave = async () => {
    const updatedUser = {
      ...currentUser,
      imageUrl: selectedUrl,
    }

    setCurrentUser(updatedUser)

    try {
      localStorage.setItem("octho_user", JSON.stringify(updatedUser))
    } catch {}

    if (currentUser?.id) {
      await updateUserAvatarImage(currentUser.id, selectedUrl)
    }

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Escolher Avatar</h3>
              <p className="text-xs text-muted-foreground">Selecione um dos avatares disponíveis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Preview Atual */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-muted/20">
          <Avatar className="size-14 border border-primary/40 shadow-xs shrink-0">
            <AvatarImage src={selectedUrl} alt={currentUser?.name} />
            <AvatarFallback style={{ backgroundColor: currentUser?.avatarColor || "#6366f1", color: "#fff" }} className="text-base font-bold">
              {currentUser?.avatar || "US"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
            <span className="inline-flex items-center gap-1 mt-0.5 text-[11px] text-primary font-medium">
              <Sparkles className="size-3" /> Avatar selecionado
            </span>
          </div>
        </div>

        {/* Grade de Avatares */}
        <div className="grid grid-cols-5 gap-3 max-h-60 overflow-y-auto p-1">
          {shadcnAvatars.map((item) => {
            const isSelected = selectedUrl === item.url
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedUrl(item.url)}
                className={cn(
                  "relative flex items-center justify-center rounded-2xl p-1.5 transition-all duration-75 outline-none",
                  isSelected
                    ? "bg-primary/15 ring-2 ring-primary"
                    : "hover:bg-accent/60"
                )}
              >
                <div className="relative size-12 overflow-hidden rounded-full border border-border/80">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="size-full object-cover"
                  />
                </div>

                {isSelected && (
                  <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                    <Check className="size-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-9 text-xs">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="rounded-xl h-9 text-xs gap-1.5">
            <Check className="size-4" />
            Salvar Avatar
          </Button>
        </div>
      </div>
    </div>
  )
}

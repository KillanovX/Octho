"use client"

import React, { useState } from "react"
import { X, Check, Camera, Image as ImageIcon, Sparkles } from "lucide-react"
import { useApp } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export const avatarColors = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
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
  const [selectedColor, setSelectedColor] = useState<string>(currentUser?.avatarColor || "#6366f1")
  const [customUrl, setCustomUrl] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"preset" | "custom">("preset")

  if (!open) return null

  const handleSelectPreset = (url: string) => {
    setSelectedUrl(url)
  }

  const handleSave = async () => {
    const finalUrl = activeTab === "custom" && customUrl.trim() ? customUrl.trim() : selectedUrl

    const updatedUser = {
      ...currentUser,
      imageUrl: finalUrl,
      avatarColor: selectedColor,
    }

    setCurrentUser(updatedUser)

    try {
      localStorage.setItem("octho_user", JSON.stringify(updatedUser))
    } catch {}

    if (currentUser?.id) {
      await updateUserAvatarImage(currentUser.id, finalUrl)
    }

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="size-4.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Escolher Avatar</h3>
              <p className="text-xs text-muted-foreground">Selecione um dos avatares shadcn disponíveis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Current Preview */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
          <Avatar className="size-16 border-2 border-primary/40 shadow-sm">
            <AvatarImage
              src={activeTab === "custom" && customUrl.trim() ? customUrl.trim() : selectedUrl}
              alt={currentUser?.name}
            />
            <AvatarFallback style={{ backgroundColor: selectedColor, color: "#fff" }} className="text-xl font-bold">
              {currentUser?.avatar || "US"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary font-medium">
              <Sparkles className="size-3" /> Avatar selecionado
            </span>
          </div>
        </div>

        {/* Tabs: Presets vs Custom */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("preset")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
              activeTab === "preset"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Avatares Shadcn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
              activeTab === "custom"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            URL Personalizada
          </button>
        </div>

        {/* Presets Grid */}
        {activeTab === "preset" && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3 max-h-56 overflow-y-auto p-1">
              {shadcnAvatars.map((item) => {
                const isSelected = selectedUrl === item.url
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPreset(item.url)}
                    className={cn(
                      "group relative flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all duration-150",
                      isSelected
                        ? "bg-primary/10 ring-2 ring-primary scale-105"
                        : "hover:bg-accent hover:scale-105"
                    )}
                  >
                    <Avatar className="size-12 border border-border">
                      <AvatarImage src={item.url} alt={item.name} />
                      <AvatarFallback>{item.name[0]}</AvatarFallback>
                    </Avatar>

                    {isSelected && (
                      <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Color accent selection */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cor de fundo do Fallback
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {avatarColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "size-7 rounded-full transition-transform",
                      selectedColor === color ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom URL Tab */}
        {activeTab === "custom" && (
          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="size-3.5" />
              Link da Imagem
            </label>
            <Input
              type="url"
              placeholder="https://exemplo.com/sua-foto.jpg"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground pl-1">
              Cole a URL direta de uma imagem PNG, JPG ou WebP para usar como avatar.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="rounded-xl gap-1.5">
            <Check className="size-4" />
            Salvar Avatar
          </Button>
        </div>
      </div>
    </div>
  )
}

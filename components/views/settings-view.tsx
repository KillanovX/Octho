"use client"

import React, { useState } from "react"
import { User, Bell, Sliders, Shield, Save, Check, Moon, Sun, Monitor } from "lucide-react"
import { useApp } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

const avatarMap: Record<string, string> = {
  MA: "https://images.shadcnspace.com/assets/profiles/user-1.jpg",
  FA: "https://images.shadcnspace.com/assets/profiles/user-3.jpg",
}

export function SettingsView() {
  const { currentUser, setCurrentUser } = useApp()

  const [saved, setSaved] = useState(false)
  const [name, setName] = useState(currentUser.name)
  const [email, setEmail] = useState(currentUser.email)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [soundEffects, setSoundEffects] = useState(true)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentUser({
      ...currentUser,
      name,
      email,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-[900px] flex-col gap-6">
        {/* Header */}
        <div className="border-b border-border pb-4">
          <h2 className="text-xl font-bold text-foreground">Configurações</h2>
          <p className="text-xs text-muted-foreground">
            Gerencie seu perfil, preferências e preferências de sistema
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Perfil */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4 font-semibold text-sm text-card-foreground">
              <User className="size-4 text-primary" />
              <span>Perfil do Usuário</span>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar className="size-16 border-2 border-primary/20">
                {avatarMap[currentUser.avatar] && <AvatarImage src={avatarMap[currentUser.avatar]} alt={currentUser.name} />}
                <AvatarFallback style={{ backgroundColor: currentUser.avatarColor, color: "#fff" }} className="text-lg font-bold">
                  {currentUser.avatar}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email Profissional</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notificações & Preferências */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3 mb-4 font-semibold text-sm text-card-foreground">
              <Bell className="size-4 text-chart-3" />
              <span>Notificações & Alertas</span>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificações por Email</p>
                  <p className="text-xs text-muted-foreground">Receber resumos de atividades e menções em tarefas</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="size-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Sons do Timer</p>
                  <p className="text-xs text-muted-foreground">Reproduzir avisos ao concluir ou pausar o cronômetro</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="size-4 rounded border-border accent-primary cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Botão de Salvar */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {saved ? (
                <>
                  <Check className="size-4" />
                  <span>Salvo com sucesso!</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

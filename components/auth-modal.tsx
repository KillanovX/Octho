"use client"

import React, { useState } from "react"
import { X, Lock, Mail, User, LogIn, UserPlus, Zap, AlertCircle, CheckCircle2, Shield, Palette, Briefcase } from "lucide-react"
import { signInWithSupabase, signUpWithSupabase, isSupabaseConfigured } from "@/lib/supabase"
import { useApp, type UserProfile } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

const avatarColors = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Purple", hex: "#8b5cf6" },
  { name: "Rose", hex: "#f43f5e" },
]

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { setCurrentUser, profilesList, addProfile } = useApp()

  const [tab, setTab] = useState<"login" | "register">("login")

  // Form states
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("")
  const [selectedColor, setSelectedColor] = useState(avatarColors[0].hex)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isConfigured = isSupabaseConfigured()

  if (!open) return null

  const handleQuickSelectProfile = (profile: UserProfile) => {
    setCurrentUser(profile)
    setSuccessMsg(`Perfil ${profile.name} ativado!`)
    setTimeout(() => {
      onClose()
      setSuccessMsg(null)
    }, 600)
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (!isConfigured) {
        // Fallback local demo profile login
        const existing = profilesList.find((p) => p.email.toLowerCase() === email.toLowerCase())
        if (existing) {
          setCurrentUser(existing)
          setSuccessMsg(`Login efetuado como ${existing.name}!`)
        } else {
          const initials = email.slice(0, 2).toUpperCase()
          const demoUser: UserProfile = {
            id: email,
            name: email.split("@")[0],
            email,
            avatar: initials,
            avatarColor: selectedColor,
            verified: true,
          }
          addProfile(demoUser)
          setCurrentUser(demoUser)
          setSuccessMsg(`Login no modo demo realizado!`)
        }
        setTimeout(() => onClose(), 800)
        return
      }

      const { data, error } = await signInWithSupabase(email, password)
      if (error) {
        setErrorMsg(error.message || "Email ou senha incorretos.")
      } else if (data?.user) {
        const user = data.user
        const avatar = (user.user_metadata?.avatar || email.slice(0, 2)).toUpperCase()
        const userProfile: UserProfile = {
          id: user.id,
          name: user.user_metadata?.name || email.split("@")[0],
          email: user.email || email,
          avatar,
          avatarColor: "#6366f1",
          verified: true,
        }
        addProfile(userProfile)
        setCurrentUser(userProfile)
        setSuccessMsg("Login realizado com sucesso!")
        setTimeout(() => onClose(), 800)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao realizar login.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    if (!name.trim()) {
      setErrorMsg("Por favor, informe seu nome completo.")
      setLoading(false)
      return
    }

    const initials = name
      .trim()
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    try {
      if (!isConfigured) {
        // Fallback local demo registration
        const newProfile: UserProfile = {
          id: `usr_${Date.now()}`,
          name: name.trim(),
          email: email.trim() || `${initials.toLowerCase()}@octho.app`,
          avatar: initials,
          avatarColor: selectedColor,
          role: role.trim() || "Membro do Time",
          verified: true,
        }
        addProfile(newProfile)
        setCurrentUser(newProfile)
        setSuccessMsg("Perfil criado e ativado com sucesso!")
        setTimeout(() => onClose(), 1000)
        return
      }

      const { data, error } = await signUpWithSupabase(email, password, name.trim())
      if (error) {
        setErrorMsg(error.message || "Erro ao cadastrar conta no Supabase.")
      } else if (data?.user) {
        const user = data.user
        const newProfile: UserProfile = {
          id: user.id,
          name: name.trim(),
          email: email.trim(),
          avatar: initials,
          avatarColor: selectedColor,
          role: role.trim() || "Membro do Time",
          verified: true,
        }
        addProfile(newProfile)
        setCurrentUser(newProfile)
        setSuccessMsg("Conta e perfil criados com sucesso!")
        setTimeout(() => onClose(), 1200)
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao processar cadastro.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Zap className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Autenticação de Perfis</h2>
            <p className="text-xs text-muted-foreground">
              Selecione um perfil de acesso ou cadastre um novo membro
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab("login")
              setErrorMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              tab === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register")
              setErrorMsg(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              tab === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 2: LOGIN SUPABASE */}
        {tab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-2.5 text-xs text-primary font-medium flex items-center justify-between">
              <span>Conta vinculada: <b>flavio.adsv@gmail.com</b></span>
              <span className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">Senha: 12345</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="marina@octho.app"
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
            >
              <LogIn className="size-4" />
              <span>{loading ? "Entrando..." : "Entrar com Email"}</span>
            </button>
          </form>
        )}

        {/* TAB 3: CRIAR NOVO PERFIL */}
        {tab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo"
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Cargo / Função</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Product Designer"
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Email Profissional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@octho.app"
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="password"
                  required={isConfigured}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Avatar Color Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Palette className="size-3.5 text-muted-foreground" />
                <span>Cor do Avatar do Perfil</span>
              </label>
              <div className="flex items-center gap-2.5">
                {avatarColors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className={`size-7 rounded-full transition-transform ${
                      selectedColor === c.hex ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105 opacity-80"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 mt-3"
            >
              <UserPlus className="size-4" />
              <span>{loading ? "Cadastrando..." : "Criar e Ativar Perfil"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

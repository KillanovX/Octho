"use client"

import React, { useState } from "react"
import { X, Lock, Mail, User, LogIn, UserPlus, Zap, AlertCircle, CheckCircle2 } from "lucide-react"
import { signInWithSupabase, signUpWithSupabase, isSupabaseConfigured } from "@/lib/supabase"
import { useApp } from "@/lib/context"

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { setCurrentUser } = useApp()

  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isConfigured = isSupabaseConfigured()

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (mode === "login") {
        const { data, error } = await signInWithSupabase(email, password)
        if (error) {
          setErrorMsg(error.message || "Email ou senha incorretos.")
        } else if (data.user) {
          const avatar = (data.user.user_metadata?.avatar || email.slice(0, 2)).toUpperCase()
          setCurrentUser({
            id: data.user.id,
            name: data.user.user_metadata?.name || email.split("@")[0],
            email: data.user.email || email,
            avatar,
            avatarColor: "#6366f1",
            verified: true,
          })
          setSuccessMsg("Login realizado com sucesso!")
          setTimeout(() => {
            onClose()
          }, 800)
        }
      } else {
        if (!name.trim()) {
          setErrorMsg("Por favor, preencha seu nome.")
          setLoading(false)
          return
        }
        const { data, error } = await signUpWithSupabase(email, password, name.trim())
        if (error) {
          setErrorMsg(error.message || "Erro ao cadastrar conta.")
        } else if (data.user) {
          const avatar = name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
          setCurrentUser({
            id: data.user.id,
            name: name.trim(),
            email,
            avatar,
            avatarColor: "#6366f1",
            verified: true,
          })
          setSuccessMsg("Conta criada com sucesso! Verifique seu email se necessário.")
          setTimeout(() => {
            onClose()
          }, 1200)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao processar.")
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
        className="relative w-full max-w-md mx-4 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
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

        {/* Header logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Octho Dashboard</h2>
            <p className="text-xs text-muted-foreground">
              {mode === "login" ? "Entre com sua conta Supabase" : "Crie sua nova conta no Supabase"}
            </p>
          </div>
        </div>

        {/* Demo Mode Notice if not configured */}
        {!isConfigured && (
          <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-500">
            <p className="font-medium mb-1">Chaves do Supabase pendentes no .env.local</p>
            <p className="text-[11px] opacity-90">
              Você pode continuar utilizando o aplicativo no modo demo local.
            </p>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode("login")
              setErrorMsg(null)
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register")
              setErrorMsg(null)
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Error / Success Feedback */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@octho.app"
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
                minLength={6}
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
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
          >
            {mode === "login" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
            <span>{loading ? "Aguarde..." : mode === "login" ? "Entrar na Conta" : "Criar Conta"}</span>
          </button>
        </form>

        {/* Footer fallback */}
        <div className="mt-5 border-t border-border pt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Continuar no modo demonstração
          </button>
        </div>
      </div>
    </div>
  )
}

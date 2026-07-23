"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Lock, User, AlertCircle, CheckCircle2, Zap } from "lucide-react"
import { useApp, type UserProfile } from "@/lib/context"
import { signInWithSupabase, signUpWithSupabase, isSupabaseConfigured } from "@/lib/supabase"
import { authenticateLocalUser, registerUserAccount } from "@/lib/auth-service"

interface SignInFormProps {
  onSuccess?: () => void
  initialMode?: "signin" | "signup"
}

export default function SignInForm({ onSuccess, initialMode = "signin" }: SignInFormProps) {
  const { addProfile, login } = useApp()
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isConfigured = isSupabaseConfigured()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Por favor, preencha o e-mail e a senha.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 caracteres.")
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setErrorMsg("Por favor, informe seu nome completo.")
          setLoading(false)
          return
        }

        if (!isConfigured) {
          const { user, error } = registerUserAccount(name, email, password)
          if (error) {
            setErrorMsg(error)
            setLoading(false)
            return
          }
          if (user) {
            addProfile(user)
            login(user)
            setSuccessMsg("Conta criada com sucesso!")
            if (onSuccess) setTimeout(onSuccess, 500)
          }
          return
        }

        const { data, error } = await signUpWithSupabase(email, password, name.trim())
        if (error) {
          setErrorMsg(error.message || "Erro ao registrar conta.")
        } else if (data?.user) {
          const user = data.user
          const initials = name
            .trim()
            .split(" ")
            .map((p) => p[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "US"
          const userProfile: UserProfile = {
            id: user.id,
            name: name.trim(),
            email: user.email || email.trim(),
            avatar: initials,
            avatarColor: "#6366f1",
            verified: true,
          }
          addProfile(userProfile)
          login(userProfile)
          setSuccessMsg("Conta registrada com sucesso!")
          if (onSuccess) setTimeout(onSuccess, 500)
        }
      } else {
        // Sign in
        if (!isConfigured) {
          const { user, error } = authenticateLocalUser(email, password)
          if (error) {
            setErrorMsg(error)
            setLoading(false)
            return
          }
          if (user) {
            addProfile(user)
            login(user)
            setSuccessMsg(`Bem-vindo de volta, ${user.name}!`)
            if (onSuccess) setTimeout(onSuccess, 500)
          }
          return
        }

        const { data, error } = await signInWithSupabase(email, password)
        if (error) {
          setErrorMsg(error.message || "E-mail ou senha incorretos.")
        } else if (data?.user) {
          const user = data.user
          const nameFromMeta = user.user_metadata?.name || email.split("@")[0]
          const avatar = (user.user_metadata?.avatar || nameFromMeta.slice(0, 2)).toUpperCase()
          const userProfile: UserProfile = {
            id: user.id,
            name: nameFromMeta,
            email: user.email || email,
            avatar,
            avatarColor: "#6366f1",
            verified: true,
          }
          addProfile(userProfile)
          login(userProfile)
          setSuccessMsg("Login realizado com sucesso!")
          if (onSuccess) setTimeout(onSuccess, 500)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao autenticar.")
    } finally {
      setLoading(false)
    }
  }

  const handleSocialClick = (provider: string) => {
    setErrorMsg(`Login social via ${provider} desativado. Registre-se ou faça login com seu e-mail e senha.`)
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Ambient glowing backdrop ring */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/30 via-indigo-500/20 to-cyan-500/30 opacity-75 blur-xl pointer-events-none" />

      <Card className="relative w-full rounded-2xl border border-white/15 bg-card/95 backdrop-blur-md shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_40px_-5px_rgba(99,102,241,0.25)] transition-all">
      <CardContent className="p-6 flex flex-col gap-6">
        {/* Brand Header (Centered Logo & Name) */}
        <div className="flex flex-col items-center justify-center gap-2.5 pb-1">
          <div className="relative size-12 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0050D7] via-[#0F6FFF] to-[#5EC9FF] p-2.5 shadow-lg shadow-[#0F6FFF]/20">
            <Image
              src="/branding/symbol/octho-symbol-white-512.png"
              alt="Octho Symbol"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Octho</h2>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name Field if Sign Up */}
          {isSignUp && (
            <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
              <User className="h-5 w-5 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Nome completo"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          )}

          {/* Email */}
          <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="E-mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Password */}
          <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Senha"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          {/* Remember me & Forgot */}
          {!isSignUp && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" defaultChecked />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Lembrar-me
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setErrorMsg("Informe seu e-mail para receber as instruções de recuperação.")}
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={loading} variant="default" className="w-full h-12 text-base font-medium rounded-lg">
            {loading ? "Aguarde..." : isSignUp ? "Criar Conta" : "Entrar"}
          </Button>
        </form>

        {/* Social login buttons (Icon-only side by side) */}
        <div className="flex items-center justify-center gap-3 mt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialClick("Google")}
            title="Entrar com Google"
            className="flex-1 h-11 rounded-xl border-border/80 bg-background hover:bg-accent flex items-center justify-center transition-all"
          >
            <Image
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              width={20}
              height={20}
              className="size-5 shrink-0"
            />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialClick("Apple")}
            title="Entrar com Apple"
            className="flex-1 h-11 rounded-xl border-border/80 bg-background hover:bg-accent flex items-center justify-center transition-all"
          >
            <svg className="size-[22px] shrink-0 fill-foreground transition-colors" viewBox="0 0 24 24" aria-label="Apple">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.66c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.66-.97 1.73-.83 2.76 1.01.08 2.03-.51 2.53-1.26z" />
            </svg>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialClick("GitHub")}
            title="Entrar com GitHub"
            className="flex-1 h-11 rounded-xl border-border/80 bg-background hover:bg-accent flex items-center justify-center transition-all"
          >
            <svg className="size-[22px] shrink-0 fill-foreground transition-colors" viewBox="0 0 24 24" aria-label="GitHub">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </Button>
        </div>

        {/* Signup / Signin Toggle */}
        <p className="text-center text-sm text-muted-foreground mt-2">
          {isSignUp ? "Já possui uma conta?" : "Não tem uma conta?"}{" "}
          <span
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className="text-primary cursor-pointer hover:underline font-medium"
          >
            {isSignUp ? "Entrar" : "Registre-se"}
          </span>
        </p>
      </CardContent>
    </Card>
    </div>
  )
}

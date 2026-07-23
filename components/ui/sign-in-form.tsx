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
    <div className="relative w-full max-w-md">
      {/* Ambient glowing backdrop ring */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/30 via-indigo-500/20 to-cyan-500/30 opacity-75 blur-xl pointer-events-none" />

      <Card className="relative w-full rounded-2xl border border-white/15 bg-card/95 backdrop-blur-md shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_40px_-5px_rgba(99,102,241,0.25)] transition-all">
      <CardContent className="p-6 flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
              <Zap className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">Octho Gestão</h2>
              <p className="text-xs text-muted-foreground">
                {isSignUp ? "Crie sua conta para começar" : "Acesse seu workspace"}
              </p>
            </div>
          </div>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name Field if Sign Up */}
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
                <User className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
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
            {loading ? "Aguarde..." : isSignUp ? "Criar Conta" : "Sign In"}
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
            />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialClick("Apple")}
            title="Entrar com Apple"
            className="flex-1 h-11 rounded-xl border-border/80 bg-background hover:bg-accent flex items-center justify-center transition-all"
          >
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
              alt="Apple"
              width={20}
              height={20}
              unoptimized
              className="dark:invert"
            />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialClick("GitHub")}
            title="Entrar com GitHub"
            className="flex-1 h-11 rounded-xl border-border/80 bg-background hover:bg-accent flex items-center justify-center transition-all"
          >
            <Image
              src="https://www.svgrepo.com/show/303615/github-icon-1-logo.svg"
              alt="GitHub"
              width={20}
              height={20}
              className="dark:invert"
            />
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
            {isSignUp ? "Sign In" : "Sign Up"}
          </span>
        </p>
      </CardContent>
    </Card>
    </div>
  )
}

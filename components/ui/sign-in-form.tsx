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

interface SignInFormProps {
  onSuccess?: () => void
  initialMode?: "signin" | "signup"
}

export default function SignInForm({ onSuccess, initialMode = "signin" }: SignInFormProps) {
  const { setCurrentUser, profilesList, addProfile, login } = useApp()
  const [isSignUp, setIsSignUp] = useState(initialMode === "signup")
  const [email, setEmail] = useState("flavio.adsv@gmail.com")
  const [password, setPassword] = useState("12345")
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

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setErrorMsg("Por favor, informe seu nome.")
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

        if (!isConfigured) {
          const newProfile: UserProfile = {
            id: `usr_${Date.now()}`,
            name: name.trim(),
            email: email.trim() || `${initials.toLowerCase()}@octho.app`,
            avatar: initials,
            avatarColor: "#6366f1",
            role: "Membro do Time",
            verified: true,
          }
          addProfile(newProfile)
          login(newProfile)
          setSuccessMsg("Perfil criado e logado com sucesso!")
          if (onSuccess) setTimeout(onSuccess, 600)
          return
        }

        const { data, error } = await signUpWithSupabase(email, password, name.trim())
        if (error) {
          setErrorMsg(error.message || "Erro ao criar conta.")
        } else if (data?.user) {
          const user = data.user
          const newProfile: UserProfile = {
            id: user.id,
            name: name.trim(),
            email: user.email || email.trim(),
            avatar: initials,
            avatarColor: "#6366f1",
            verified: true,
          }
          addProfile(newProfile)
          login(newProfile)
          setSuccessMsg("Conta criada com sucesso!")
          if (onSuccess) setTimeout(onSuccess, 600)
        }
      } else {
        // Sign in
        if (!isConfigured) {
          const existing = profilesList.find((p) => p.email.toLowerCase() === email.toLowerCase())
          if (existing) {
            login(existing)
            setSuccessMsg(`Bem-vindo de volta, ${existing.name}!`)
          } else {
            const initials = (email.split("@")[0] || "US").slice(0, 2).toUpperCase()
            const demoUser: UserProfile = {
              id: email,
              name: email.split("@")[0],
              email,
              avatar: initials,
              avatarColor: "#6366f1",
              verified: true,
            }
            addProfile(demoUser)
            login(demoUser)
            setSuccessMsg(`Login efetuado!`)
          }
          if (onSuccess) setTimeout(onSuccess, 600)
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
          login(userProfile)
          setSuccessMsg("Login realizado com sucesso!")
          if (onSuccess) setTimeout(onSuccess, 600)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro no login.")
    } finally {
      setLoading(false)
    }
  }

  const handleQuickProfileSelect = (p: UserProfile) => {
    login(p)
    setSuccessMsg(`Logado como ${p.name}!`)
    if (onSuccess) setTimeout(onSuccess, 500)
  }

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-md border bg-background">
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
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
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
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setErrorMsg("Um link de redefinição de senha foi simulado para seu email.")}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={loading} variant="default" className="w-full h-12 text-base font-medium rounded-lg">
            {loading ? "Aguarde..." : isSignUp ? "Criar Conta" : "Sign In"}
          </Button>
        </form>

        {/* Quick Profile Selection */}
        <div className="flex flex-col gap-2 pt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
            Ou escolha um perfil ativo
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {profilesList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleQuickProfileSelect(p)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full text-[10px] text-white font-bold"
                  style={{ backgroundColor: p.avatarColor }}
                >
                  {p.avatar}
                </span>
                <span>{p.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Social login buttons */}
        <div className="flex flex-col gap-3 mt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleQuickProfileSelect(profilesList[0])}
            className="w-full h-12 rounded-lg flex items-center justify-center gap-3"
          >
            <Image
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              width={20}
              height={20}
            />
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleQuickProfileSelect(profilesList[1] || profilesList[0])}
            className="w-full h-12 rounded-lg flex items-center justify-center gap-3"
          >
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
              alt="Apple"
              width={20}
              height={20}
              unoptimized
            />
            Continue with Apple
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleQuickProfileSelect(profilesList[0])}
            className="w-full h-12 rounded-lg flex items-center justify-center gap-3"
          >
            <Image
              src="https://www.svgrepo.com/show/303615/github-icon-1-logo.svg"
              alt="GitHub"
              width={20}
              height={20}
            />
            Continue with GitHub
          </Button>
        </div>

        {/* Signup / Signin Toggle */}
        <p className="text-center text-sm text-muted-foreground mt-2">
          {isSignUp ? "Já possui uma conta?" : "Don’t have an account?"}{" "}
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
  )
}

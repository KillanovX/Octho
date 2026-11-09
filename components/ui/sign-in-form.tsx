"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { signInWithSupabase, requestPasswordReset } from "@/lib/supabase"

interface SignInFormProps {
  onSuccess?: () => void
}

// Contas são criadas pelo administrador (painel Administração). Não há cadastro público.
export default function SignInForm({ onSuccess }: SignInFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleForgotPassword = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!email.trim()) {
      setErrorMsg("Preencha seu e-mail no campo acima para receber as instruções.")
      return
    }
    setLoading(true)
    const { error } = await requestPasswordReset(email)
    setLoading(false)
    if (error) {
      setErrorMsg(error.message || "Não foi possível enviar o e-mail de recuperação.")
    } else {
      // Mensagem neutra: não revela se o e-mail existe
      setSuccessMsg("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    if (!email.trim() || !password) {
      setErrorMsg("Por favor, preencha o e-mail e a senha.")
      return
    }
    setLoading(true)
    const { error } = await signInWithSupabase(email, password)
    setLoading(false)
    if (error) {
      setErrorMsg("E-mail ou senha incorretos.")
      return
    }
    // A sessão é aplicada pelo AppProvider (onAuthStateChange)
    onSuccess?.()
  }

  return (
    <div className="w-full max-w-sm">
      <Card className="w-full rounded-2xl border border-border bg-card">
      <CardContent className="p-6 flex flex-col gap-6">
        {/* Brand Header (Centered Gradient Symbol) */}
        <div className="flex items-center justify-center py-1">
          <Image
            src="/branding/symbol/octho-symbol-gradient-1024.png"
            alt="Octho Symbol"
            width={64}
            height={64}
            className="size-14 object-contain drop-shadow-md"
            priority
          />
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
              
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-primary hover:underline disabled:opacity-50"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading} variant="default" className="w-full h-12 text-base font-medium rounded-lg">
            {loading ? "Aguarde..." : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito. Peça a criação da sua conta a um administrador.
        </p>
      </CardContent>
    </Card>
    </div>
  )
}

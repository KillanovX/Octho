"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { BeamsBackground } from "@/components/ui/beams-background"
import { updateUserPassword } from "@/lib/auth-service"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const email = searchParams.get("email") || ""
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!password || !confirmPassword) {
      setErrorMsg("Por favor, preencha ambos os campos de senha.")
      return
    }

    if (password.length < 6) {
      setErrorMsg("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem. Digite novamente.")
      return
    }

    setLoading(true)

    const targetEmail = email || "sua conta"

    try {
      // 1. Sync & update password directly in Supabase Auth via server API
      await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password }),
      })
    } catch (err) {
      console.error("Supabase password sync error:", err)
    }

    // 2. Sync local user credentials
    const res = updateUserPassword(targetEmail, password)

    setLoading(false)

    if (res.success) {
      setSuccessMsg("Senha atualizada no Supabase com sucesso! Redirecionando para o login...")
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } else {
      setErrorMsg(res.error || "Não foi possível atualizar a senha. Tente novamente.")
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Card className="w-full rounded-2xl border border-border bg-card">
        <CardContent className="p-6 flex flex-col gap-5">
          {/* Brand Header */}
          <div className="flex flex-col items-center justify-center gap-2 py-1">
            <Image
              src="/branding/symbol/octho-symbol-gradient-1024.png"
              alt="Octho Symbol"
              width={56}
              height={56}
              className="size-12 object-contain drop-shadow-md"
              priority
            />
            <h2 className="text-lg font-bold text-foreground mt-1">Criar Nova Senha</h2>
            {email && (
              <p className="text-xs text-muted-foreground text-center">
                Para a conta <span className="font-semibold text-foreground">{email}</span>
              </p>
            )}
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
            {/* New Password */}
            <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Nova Senha (min. 6 caracteres)"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirmar Nova Senha"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              variant="default"
              className="w-full h-12 text-base font-medium rounded-lg mt-1"
            >
              {loading ? "Salvando..." : "Salvar Nova Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <BeamsBackground intensity="strong">
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <Suspense fallback={<div className="text-white text-sm">Carregando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </BeamsBackground>
  )
}

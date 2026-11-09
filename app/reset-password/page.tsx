"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { BeamsBackground } from "@/components/ui/beams-background"
import { supabase } from "@/lib/supabase"

// O link do e-mail é gerado pelo Supabase Auth (resetPasswordForEmail). Ao abrir esta página, o SDK
// valida o token da URL e cria uma sessão de recuperação; só então a senha pode ser trocada.
function ResetPasswordForm() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [linkState, setLinkState] = useState<"checking" | "valid" | "invalid">("checking")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLinkState("invalid")
      return
    }
    const markValid = (userEmail?: string) => {
      setEmail(userEmail ?? "")
      setLinkState("valid")
    }
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) markValid(session.user.email)
    })
    // Fallback: se o evento já ocorreu antes da inscrição, a sessão existe
    const timeout = setTimeout(async () => {
      const { data: s } = await client.auth.getSession()
      if (s.session) markValid(s.session.user.email)
      else setLinkState((cur) => (cur === "checking" ? "invalid" : cur))
    }, 1500)
    return () => {
      data.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (password.length < 8) {
      setErrorMsg("A nova senha deve ter no mínimo 8 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem. Digite novamente.")
      return
    }
    if (!supabase) return

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setErrorMsg(error.message || "Não foi possível atualizar a senha. Solicite um novo link.")
      return
    }
    setSuccessMsg("Senha atualizada com sucesso! Redirecionando...")
    setTimeout(() => router.push("/"), 1500)
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

          {linkState === "checking" && (
            <p className="text-center text-sm text-muted-foreground">Validando link...</p>
          )}

          {linkState === "invalid" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                Link inválido ou expirado. Volte ao login e use &quot;Esqueceu a senha?&quot; para receber um novo.
              </p>
              <Button variant="outline" onClick={() => router.push("/")}>
                Ir para o login
              </Button>
            </div>
          )}

          {linkState === "valid" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* New Password */}
            <div className="flex items-center gap-2 border rounded-lg px-3 h-12 focus-within:ring-2 focus-within:ring-ring">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Nova senha (mín. 8 caracteres)"
                required
                minLength={8}
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
                minLength={8}
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
          )}
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

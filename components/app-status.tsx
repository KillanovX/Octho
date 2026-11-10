"use client"

import { AlertTriangle, Clock3, LogOut, RefreshCw, X } from "lucide-react"
import { useApp } from "@/lib/context"
import { Button } from "@/components/ui/button"

/** Aviso fixo quando uma escrita/leitura no Supabase falha (antes os erros só iam para o console). */
export function SyncErrorBanner() {
  const { syncError, dismissSyncError, refreshData } = useApp()
  if (!syncError) return null
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[70] flex w-[min(560px,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 rounded-xl border border-destructive/30 bg-card p-3 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="flex-1 text-sm text-card-foreground">{syncError}</p>
      <button
        onClick={() => {
          dismissSyncError()
          refreshData()
        }}
        className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Recarregar dados"
        title="Recarregar dados"
      >
        <RefreshCw className="size-4" />
      </button>
      <button
        onClick={dismissSyncError}
        className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Fechar aviso"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">{children}</div>
    </div>
  )
}

export function PendingApprovalScreen() {
  const { currentUser, signOut } = useApp()
  return (
    <CenteredCard>
      <Clock3 className="mx-auto mb-3 size-10 text-primary" />
      <h1 className="text-lg font-bold text-foreground">Acesso aguardando aprovação</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A conta <span className="font-medium text-foreground">{currentUser.email}</span> foi criada, mas ainda não foi
        liberada por um administrador do Octho.
      </p>
      <Button variant="outline" className="mt-5" onClick={() => signOut()}>
        <LogOut className="size-4" />
        Sair
      </Button>
    </CenteredCard>
  )
}

export function NotConfiguredScreen() {
  return (
    <CenteredCard>
      <AlertTriangle className="mx-auto mb-3 size-10 text-destructive" />
      <h1 className="text-lg font-bold text-foreground">Supabase não configurado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Defina <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> no ambiente (veja{" "}
        <code className="font-mono text-xs">.env.local.example</code>).
      </p>
    </CenteredCard>
  )
}

"use client"

import { Keyboard, X } from "lucide-react"
import { useModal } from "@/lib/use-modal"
import { ACTION_KEYS, GOTO_KEYS } from "@/lib/use-shortcuts"

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-[0_1px_0_var(--border)]">
      {children}
    </kbd>
  )
}

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useModal(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Atalhos de teclado"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Keyboard className="size-4 text-primary" aria-hidden="true" />
            Atalhos de teclado
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</h4>
            <ul className="flex flex-col gap-2">
              {ACTION_KEYS.map((a) => (
                <li key={a.keys + a.label} className="flex items-center justify-between gap-3 text-sm text-foreground">
                  {a.label}
                  <span className="flex gap-1">
                    {a.keys.split(" ").map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ir para (G e depois)</h4>
            <ul className="flex flex-col gap-2">
              {GOTO_KEYS.map((g) => (
                <li key={g.key} className="flex items-center justify-between gap-3 text-sm text-foreground">
                  {g.label}
                  <span className="flex gap-1">
                    <Kbd>G</Kbd>
                    <Kbd>{g.key.toUpperCase()}</Kbd>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

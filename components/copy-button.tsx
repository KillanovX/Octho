"use client"

import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

/** Copia texto para a área de transferência com confirmação visual (e anúncio para leitor de tela). */
export function CopyButton({ text, label = "Copiar", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
        } catch {
          setCopied(false)
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50",
        copied && "border-chart-4/40 text-chart-4",
        className
      )}
    >
      {copied ? (
        <Check className="size-3.5 animate-in zoom-in-50 duration-200" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span aria-live="polite">{copied ? "Copiado" : label}</span>
    </button>
  )
}

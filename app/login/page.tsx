"use client"

import { useRouter } from "next/navigation"
import SignInForm from "@/components/ui/sign-in-form"
import { useApp } from "@/lib/context"
import { useEffect } from "react"
import { Zap } from "lucide-react"

export default function LoginPage() {
  const { isAuthenticated, setActiveView } = useApp()
  const router = RouterSafe()

  useEffect(() => {
    if (isAuthenticated) {
      setActiveView("dashboard")
      if (router) router.push("/")
    }
  }, [isAuthenticated, router, setActiveView])

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration matching app design */}
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6">
        <SignInForm onSuccess={() => {
          if (router) router.push("/")
        }} />
      </div>
    </div>
  )
}

function RouterSafe() {
  try {
    return useRouter()
  } catch {
    return null
  }
}

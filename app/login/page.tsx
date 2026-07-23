"use client"

import { useRouter } from "next/navigation"
import SignInForm from "@/components/ui/sign-in-form"
import { BeamsBackground } from "@/components/ui/beams-background"
import { useApp } from "@/lib/context"
import { useEffect } from "react"

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
    <BeamsBackground intensity="strong">
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        <SignInForm onSuccess={() => {
          if (router) router.push("/")
        }} />
      </div>
    </BeamsBackground>
  )
}

function RouterSafe() {
  try {
    return useRouter()
  } catch {
    return null
  }
}

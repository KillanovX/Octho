import { createClient, User as SupabaseUser } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ""

export const supabase =
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("YOUR_PROJECT")
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

// ─── Auth Helpers ───────────────────────────────────────────
export async function signUpWithSupabase(email: string, password: string, name: string) {
  if (!supabase) return { data: null, error: new Error("Supabase não configurado") }

  const avatar = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "US"

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, avatar },
    },
  })

  if (error) return { data: null, error }

  if (data.user) {
    // Upsert profile record
    await supabase.from("profiles").upsert({
      id: data.user.id,
      name,
      email,
      avatar,
      avatar_color: "#6366f1",
    })
  }

  return { data, error: null }
}

export async function signInWithSupabase(email: string, password: string) {
  if (!supabase) return { data: null, error: new Error("Supabase não configurado") }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOutSupabase() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getUserProfile(userId: string) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

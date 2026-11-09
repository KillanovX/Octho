import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
// Chave pública: aceita o nome novo (publishable) e o antigo (anon)
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const supabase =
  supabaseUrl && supabasePublicKey && !supabaseUrl.includes("YOUR_PROJECT")
    ? createClient(supabaseUrl, supabasePublicKey)
    : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

export type ProfileRow = {
  id: string
  name: string
  email: string
  avatar: string
  avatar_color: string
  image_url: string | null
  role: "pending" | "member" | "admin" | null
  created_at: string
}

export async function signInWithSupabase(email: string, password: string) {
  if (!supabase) return { data: null, error: new Error("Supabase não configurado") }
  return supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
}

export async function signOutSupabase() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Envia o e-mail de recuperação do próprio Supabase Auth (link com token validado pelo Supabase). */
export async function requestPasswordReset(email: string) {
  if (!supabase) return { error: new Error("Supabase não configurado") }
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined
  return supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
}

export async function getUserProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()
  return error ? null : (data as ProfileRow)
}

export async function getAllProfiles(): Promise<ProfileRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from("profiles").select("*").order("name")
  return error ? [] : ((data ?? []) as ProfileRow[])
}

/** fetch para as rotas /api do próprio app, com o token da sessão atual. */
export async function authFetch(input: string, init: RequestInit = {}) {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  return fetch(input, { ...init, headers })
}

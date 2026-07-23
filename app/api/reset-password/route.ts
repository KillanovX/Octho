import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "E-mail e nova senha são obrigatórios." }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter no mínimo 6 caracteres." }, { status: 400 })
    }

    // 1. If SUPABASE_SERVICE_ROLE_KEY is provided, update password directly in Supabase Auth Admin
    if (supabaseUrl && supabaseServiceKey) {
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers()
      if (!listError && usersData?.users) {
        const found = usersData.users.find((u) => u.email?.toLowerCase() === email.trim().toLowerCase())
        if (found) {
          const { error: updateError } = await adminSupabase.auth.admin.updateUserById(found.id, {
            password: password,
          })
          if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
          }
          return NextResponse.json({ success: true, message: "Senha atualizada no Supabase Auth com sucesso!" })
        }
      }
    }

    // 2. If Service Role Key is not set or user created account anew, attempt signUp in Supabase Auth
    if (supabaseUrl && supabaseAnonKey) {
      const clientSupabase = createClient(supabaseUrl, supabaseAnonKey)
      const { error: signInErr } = await clientSupabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })
      if (!signInErr) {
        return NextResponse.json({ success: true, message: "Senha confirmada no Supabase." })
      }

      const { data: signUpData } = await clientSupabase.auth.signUp({
        email: email.trim(),
        password: password,
      })

      if (signUpData?.user) {
        return NextResponse.json({ success: true, message: "Conta e senha criadas no Supabase Auth." })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao atualizar senha no Supabase." }, { status: 500 })
  }
}

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

    const targetEmail = email.trim().toLowerCase()

    // 1. Primary: Use SUPABASE_SERVICE_ROLE_KEY for direct admin Auth update
    if (supabaseUrl && supabaseServiceKey) {
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // Fetch all users with perPage: 1000 to guarantee finding the user
      const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 })
      }

      const found = usersData?.users?.find((u) => u.email?.toLowerCase() === targetEmail)

      if (found) {
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(found.id, {
          password: password,
          email_confirm: true,
        })
        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, message: "Senha atualizada no Supabase Auth com sucesso!" })
      } else {
        // Create user in Supabase Auth directly if not found
        const { error: createError } = await adminSupabase.auth.admin.createUser({
          email: targetEmail,
          password: password,
          email_confirm: true,
        })
        if (createError) {
          return NextResponse.json({ error: createError.message }, { status: 500 })
        }
        return NextResponse.json({ success: true, message: "Nova conta criada no Supabase Auth com a nova senha!" })
      }
    }

    // 2. Fallback using client anon key if service key is missing
    if (supabaseUrl && supabaseAnonKey) {
      const clientSupabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data, error } = await clientSupabase.auth.signUp({
        email: targetEmail,
        password: password,
      })
      if (error && !error.message.includes("already registered")) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Configuração do Supabase ausente." }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro ao atualizar senha no Supabase." }, { status: 500 })
  }
}

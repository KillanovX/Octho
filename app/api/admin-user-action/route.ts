import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

export async function POST(req: Request) {
  try {
    const { action, email, name, password } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório." }, { status: 400 })
    }

    const adminSupabase =
      supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        : null

    const clientSupabase =
      supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null

    const normalizedEmail = email.trim().toLowerCase()

    if (action === "update-name") {
      if (!name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })

      const initials = name
        .trim()
        .split(" ")
        .map((p: string) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "US"

      // 1. Update in Supabase profiles table
      if (clientSupabase) {
        await clientSupabase
          .from("profiles")
          .update({ name: name.trim(), avatar: initials })
          .eq("email", normalizedEmail)
      }
      if (adminSupabase) {
        await adminSupabase
          .from("profiles")
          .update({ name: name.trim(), avatar: initials })
          .eq("email", normalizedEmail)
      }

      // 2. Update user_metadata in Supabase Auth if Admin Key available
      if (adminSupabase) {
        const { data: usersData } = await adminSupabase.auth.admin.listUsers()
        if (usersData?.users) {
          const found = usersData.users.find((u) => u.email?.toLowerCase() === normalizedEmail)
          if (found) {
            await adminSupabase.auth.admin.updateUserById(found.id, {
              user_metadata: { ...found.user_metadata, name: name.trim(), avatar: initials },
            })
          }
        }
      }

      return NextResponse.json({ success: true, message: "Nome do usuário atualizado no Supabase com sucesso!" })
    }

    if (action === "delete-user") {
      // Delete profile from profiles table
      if (clientSupabase) {
        await clientSupabase.from("profiles").delete().eq("email", normalizedEmail)
      }
      if (adminSupabase) {
        await adminSupabase.from("profiles").delete().eq("email", normalizedEmail)
        const { data: usersData } = await adminSupabase.auth.admin.listUsers()
        if (usersData?.users) {
          const found = usersData.users.find((u) => u.email?.toLowerCase() === normalizedEmail)
          if (found) {
            await adminSupabase.auth.admin.deleteUser(found.id)
          }
        }
      }

      return NextResponse.json({ success: true, message: "Usuário excluído do Supabase com sucesso!" })
    }

    if (action === "change-password") {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres." }, { status: 400 })
      }

      if (adminSupabase) {
        const { data: usersData } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (usersData?.users) {
          const found = usersData.users.find((u) => u.email?.toLowerCase() === normalizedEmail)
          if (found) {
            await adminSupabase.auth.admin.updateUserById(found.id, { password, email_confirm: true })
          } else {
            await adminSupabase.auth.admin.createUser({ email: normalizedEmail, password, email_confirm: true })
          }
        }
      }

      return NextResponse.json({ success: true, message: "Senha alterada no Supabase com sucesso!" })
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha na ação do administrador." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import { errorResponse, getServiceClient, HttpError, requireAdmin, type OcthoRole } from "@/lib/server/supabase-admin"

const ROLES: OcthoRole[] = ["pending", "member", "admin"]

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "US"
  )
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req)
    const admin = getServiceClient()
    const { data, error } = await admin
      .from("profiles")
      .select("id, name, email, avatar, avatar_color, image_url, role, created_at")
      .order("created_at", { ascending: true })
    if (error) throw new HttpError(500, error.message)
    return NextResponse.json({ users: data })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  try {
    const { user: caller } = await requireAdmin(req)
    const admin = getServiceClient()
    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? "")
    const userId = typeof body.userId === "string" ? body.userId : ""

    if (action === "create") {
      const name = String(body.name ?? "").trim()
      const email = String(body.email ?? "").trim().toLowerCase()
      const password = String(body.password ?? "")
      const role: OcthoRole = ROLES.includes(body.role) ? body.role : "member"
      if (!name || !email) throw new HttpError(400, "Nome e e-mail são obrigatórios.")
      if (password.length < 8) throw new HttpError(400, "A senha deve ter no mínimo 8 caracteres.")

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, avatar: initialsOf(name) },
        app_metadata: { octho_role: role },
      })
      if (error) throw new HttpError(400, error.message)
      // O trigger on_auth_user_created cria o perfil; garante nome/papel caso ele já existisse
      await admin.from("profiles").update({ name, avatar: initialsOf(name), role }).eq("id", data.user.id)
      return NextResponse.json({ success: true, id: data.user.id })
    }

    if (!userId) throw new HttpError(400, "userId é obrigatório.")

    if (action === "update-name") {
      const name = String(body.name ?? "").trim()
      if (!name) throw new HttpError(400, "Nome é obrigatório.")
      const { error } = await admin.from("profiles").update({ name, avatar: initialsOf(name) }).eq("id", userId)
      if (error) throw new HttpError(500, error.message)
      await admin.auth.admin.updateUserById(userId, { user_metadata: { name, avatar: initialsOf(name) } })
      return NextResponse.json({ success: true })
    }

    if (action === "set-role") {
      const role = body.role as OcthoRole
      if (!ROLES.includes(role)) throw new HttpError(400, "Papel inválido.")
      if (userId === caller.id && role !== "admin") {
        throw new HttpError(400, "Você não pode remover o seu próprio acesso de administrador.")
      }
      const { error } = await admin.from("profiles").update({ role }).eq("id", userId)
      if (error) throw new HttpError(500, error.message)
      return NextResponse.json({ success: true })
    }

    if (action === "change-password") {
      const password = String(body.password ?? "")
      if (password.length < 8) throw new HttpError(400, "A senha deve ter no mínimo 8 caracteres.")
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) throw new HttpError(400, error.message)
      return NextResponse.json({ success: true })
    }

    if (action === "delete") {
      if (userId === caller.id) throw new HttpError(400, "Você não pode excluir a própria conta.")
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw new HttpError(400, error.message)
      return NextResponse.json({ success: true })
    }

    throw new HttpError(400, "Ação inválida.")
  } catch (e) {
    return errorResponse(e)
  }
}

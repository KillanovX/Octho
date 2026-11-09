import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

let serviceClient: SupabaseClient | null = null

/** Cliente com service role. Usar somente em rotas de servidor, depois de autorizar o chamador. */
export function getServiceClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(500, "Servidor sem NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.")
  }
  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return serviceClient
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return NextResponse.json({ error: "Erro interno." }, { status: 500 })
}

function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") ?? ""
  const [scheme, token] = header.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new HttpError(401, "Token de acesso ausente.")
  }
  return token
}

export type OcthoRole = "pending" | "member" | "admin"

/** Valida o JWT do Supabase enviado pelo app e devolve o usuário com o papel do perfil. */
export async function requireUser(req: Request): Promise<{ user: User; role: OcthoRole }> {
  const token = bearerToken(req) // 401 antes de qualquer outra verificação
  const admin = getServiceClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, "Sessão inválida ou expirada.")

  const { data: profile } = await admin.from("profiles").select("role").eq("id", data.user.id).single()
  return { user: data.user, role: (profile?.role as OcthoRole) ?? "pending" }
}

export async function requireAdmin(req: Request) {
  const ctx = await requireUser(req)
  if (ctx.role !== "admin") throw new HttpError(403, "Acesso restrito a administradores.")
  return ctx
}

/**
 * Autenticação do Hermes Agent (ou outro integrador): token estático em OCTHO_AGENT_TOKEN.
 * Os registros são gravados em nome de OCTHO_AGENT_USER_ID.
 */
export function requireAgent(req: Request): { agentUserId: string } {
  const expected = process.env.OCTHO_AGENT_TOKEN ?? ""
  const agentUserId = process.env.OCTHO_AGENT_USER_ID ?? ""
  if (expected.length < 32 || !agentUserId) {
    throw new HttpError(503, "Integração desativada: defina OCTHO_AGENT_TOKEN (32+ caracteres) e OCTHO_AGENT_USER_ID.")
  }
  const given = Buffer.from(bearerToken(req))
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    throw new HttpError(401, "Token do agente inválido.")
  }
  return { agentUserId }
}

/** Próximo código OCT-n considerando todas as tarefas (mesma regra do app). */
export async function nextTaskCode(admin: SupabaseClient): Promise<string> {
  const { data } = await admin.from("tasks").select("code").like("code", "OCT-%")
  let max = 300
  for (const row of data ?? []) {
    const n = parseInt(String(row.code).replace("OCT-", ""), 10)
    if (!isNaN(n) && n > max) max = n
  }
  return `OCT-${max + 1}`
}

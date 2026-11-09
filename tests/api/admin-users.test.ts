import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { FakeSupabase } from "../helpers/fake-supabase"
import { fake } from "../helpers/mock-service-client"

type Route = typeof import("@/app/api/admin/users/route")
let GET: Route["GET"]
let POST: Route["POST"]

beforeAll(async () => {
  // import dinâmico: garante que o mock do supabase-js já está registrado
  ;({ GET, POST } = await import("@/app/api/admin/users/route"))
})

const ADMIN = "admin-id"
const MEMBER = "member-id"

function req(method: "GET" | "POST", token: string | null, body?: unknown) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  return new Request("http://localhost/api/admin/users", { method, headers, body: body ? JSON.stringify(body) : undefined })
}

beforeEach(() => {
  fake.current = new FakeSupabase()
  fake.current.tokens = {
    "tok-admin": { id: ADMIN, email: "admin@x.com" },
    "tok-member": { id: MEMBER, email: "m@x.com" },
  }
  fake.current.tables.profiles = [
    { id: ADMIN, name: "Admin", email: "admin@x.com", role: "admin", created_at: "2026-01-01" },
    { id: MEMBER, name: "Membro", email: "m@x.com", role: "member", created_at: "2026-01-02" },
  ]
})

describe("/api/admin/users autorização", () => {
  it("401 sem token ou com token inválido", async () => {
    expect((await GET(req("GET", null))).status).toBe(401)
    expect((await GET(req("GET", "tok-falso"))).status).toBe(401)
  })

  it("403 para quem não é admin", async () => {
    expect((await GET(req("GET", "tok-member"))).status).toBe(403)
    const res = await POST(req("POST", "tok-member", { action: "set-role", userId: MEMBER, role: "admin" }))
    expect(res.status).toBe(403)
    expect(fake.current.tables.profiles.find((p) => p.id === MEMBER)?.role).toBe("member")
  })

  it("admin lista os usuários", async () => {
    const res = await GET(req("GET", "tok-admin"))
    expect(res.status).toBe(200)
    expect((await res.json()).users).toHaveLength(2)
  })
})

describe("/api/admin/users ações", () => {
  it("create grava o papel em app_metadata e exige senha forte", async () => {
    const weak = await POST(req("POST", "tok-admin", { action: "create", name: "Novo", email: "n@x.com", password: "123" }))
    expect(weak.status).toBe(400)

    const res = await POST(req("POST", "tok-admin", { action: "create", name: "Novo Usuario", email: " N@X.com ", password: "senha-forte-1" }))
    expect(res.status).toBe(200)
    const call = fake.current.calls.find((c) => c.method === "createUser")!.args[0] as Record<string, unknown>
    expect(call).toMatchObject({ email: "n@x.com", email_confirm: true, app_metadata: { octho_role: "member" } })
    expect(fake.current.tables.profiles.find((p) => p.email === "n@x.com")).toMatchObject({ name: "Novo Usuario", avatar: "NU", role: "member" })
  })

  it("set-role valida o papel e impede o admin de se rebaixar", async () => {
    expect((await POST(req("POST", "tok-admin", { action: "set-role", userId: MEMBER, role: "root" }))).status).toBe(400)
    expect((await POST(req("POST", "tok-admin", { action: "set-role", userId: ADMIN, role: "member" }))).status).toBe(400)
    expect((await POST(req("POST", "tok-admin", { action: "set-role", userId: MEMBER, role: "pending" }))).status).toBe(200)
    expect(fake.current.tables.profiles.find((p) => p.id === MEMBER)?.role).toBe("pending")
  })

  it("delete não permite excluir a própria conta", async () => {
    expect((await POST(req("POST", "tok-admin", { action: "delete", userId: ADMIN }))).status).toBe(400)
    expect((await POST(req("POST", "tok-admin", { action: "delete", userId: MEMBER }))).status).toBe(200)
    expect(fake.current.calls.some((c) => c.method === "deleteUser" && c.args[0] === MEMBER)).toBe(true)
  })

  it("change-password e update-name", async () => {
    expect((await POST(req("POST", "tok-admin", { action: "change-password", userId: MEMBER, password: "curta" }))).status).toBe(400)
    expect((await POST(req("POST", "tok-admin", { action: "change-password", userId: MEMBER, password: "nova-senha-123" }))).status).toBe(200)
    expect((await POST(req("POST", "tok-admin", { action: "update-name", userId: MEMBER, name: "Maria Silva" }))).status).toBe(200)
    expect(fake.current.tables.profiles.find((p) => p.id === MEMBER)).toMatchObject({ name: "Maria Silva", avatar: "MS" })
  })

  it("ação desconhecida ou sem userId -> 400", async () => {
    expect((await POST(req("POST", "tok-admin", { action: "nuke", userId: MEMBER }))).status).toBe(400)
    expect((await POST(req("POST", "tok-admin", { action: "delete" }))).status).toBe(400)
  })
})

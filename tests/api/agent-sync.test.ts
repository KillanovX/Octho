import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { FakeSupabase } from "../helpers/fake-supabase"
import { fake } from "../helpers/mock-service-client"

type Route = typeof import("@/app/api/agent/sync/route")
let GET: Route["GET"]
let POST: Route["POST"]

beforeAll(async () => {
  // import dinâmico: garante que o mock do supabase-js já está registrado
  ;({ GET, POST } = await import("@/app/api/agent/sync/route"))
})

const TOKEN = "t".repeat(40)
const AGENT = "agent-user-id"

function req(method: "GET" | "POST", body?: unknown, opts: { token?: string | null; query?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = opts.token === undefined ? TOKEN : opts.token
  if (token) headers.Authorization = `Bearer ${token}`
  return new Request(`http://localhost/api/agent/sync${opts.query ?? ""}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  fake.current = new FakeSupabase()
  fake.current.tables.profiles = [{ id: AGENT, name: "Flavio", avatar: "FA", avatar_color: "#0F6FFF", email: "f@x.com" }]
  process.env.OCTHO_AGENT_TOKEN = TOKEN
  process.env.OCTHO_AGENT_USER_ID = AGENT
})

describe("autenticação do agente", () => {
  it("503 quando a integração não está configurada", async () => {
    delete process.env.OCTHO_AGENT_TOKEN
    expect((await POST(req("POST", {}))).status).toBe(503)
  })

  it("503 com token curto demais (< 32)", async () => {
    process.env.OCTHO_AGENT_TOKEN = "curto"
    expect((await GET(req("GET", undefined, { token: "curto" }))).status).toBe(503)
  })

  it("401 sem token, com token errado ou esquema errado", async () => {
    expect((await POST(req("POST", {}, { token: null }))).status).toBe(401)
    expect((await POST(req("POST", {}, { token: "x".repeat(40) }))).status).toBe(401)
    expect((await POST(req("POST", {}, { token: TOKEN.slice(1) }))).status).toBe(401)
    const basic = new Request("http://localhost/api/agent/sync", { method: "GET", headers: { Authorization: `Basic ${TOKEN}` } })
    expect((await GET(basic)).status).toBe(401)
  })
})

describe("POST /api/agent/sync", () => {
  it("cria tarefa, reunião e lançamento ligados pelo chamado", async () => {
    const res = await POST(
      req("POST", {
        tasks: [{ externalRef: "12345", title: "Falha Portal", column: "in_progress", priority: "high", client: "Cliente Exemplo", vaultPath: "Chamados/12345.md" }],
        meetings: [{ granolaId: "g-1", title: "Validacao SSO", date: "2026-11-05", startTime: "14:00", durationMinutes: 45, externalRef: "12345" }],
        timeEntries: [
          { externalId: "vault-1", externalRef: "12345", granolaId: "g-1", startedAt: "2026-11-05T17:00:00Z", hours: 0.75, note: "Sessao" },
        ],
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks[0]).toMatchObject({ key: "12345", status: "created" })
    expect(body.meetings[0]).toMatchObject({ key: "g-1", status: "created" })
    expect(body.timeEntries[0]).toMatchObject({ key: "vault-1", status: "created" })

    const task = fake.current.tables.tasks[0]
    expect(task).toMatchObject({
      code: "OCT-301",
      external_ref: "12345",
      column: "in_progress",
      priority: "high",
      user_id: AGENT,
      assignee_name: "Flavio",
      source: "obsidian",
      vault_path: "Chamados/12345.md",
    })
    const meeting = fake.current.tables.meetings[0]
    expect(meeting).toMatchObject({ granola_id: "g-1", linked_task_id: task.id, linked_task_code: "OCT-301", status: "completed" })
    expect(fake.current.tables.time_entries[0]).toMatchObject({
      task_id: task.id,
      meeting_id: meeting.id,
      user_id: AGENT,
      source: "agent",
      hours: 0.75,
    })
  })

  it("é idempotente: reenviar atualiza em vez de duplicar", async () => {
    const payload = {
      tasks: [{ externalRef: "1", title: "A" }],
      meetings: [{ granolaId: "g", title: "M", date: "2026-11-05" }],
      timeEntries: [{ externalId: "e", startedAt: "2026-11-05T12:00:00Z", hours: 1 }],
    }
    await POST(req("POST", payload))
    const res = await POST(req("POST", { ...payload, tasks: [{ externalRef: "1", title: "A2", column: "done" }] }))
    const body = await res.json()
    expect(body.tasks[0].status).toBe("updated")
    expect(body.meetings[0].status).toBe("updated")
    expect(body.timeEntries[0].status).toBe("updated")
    expect(fake.current.tables.tasks).toHaveLength(1)
    expect(fake.current.tables.tasks[0]).toMatchObject({ title: "A2", column: "done" })
    expect(fake.current.tables.tasks[0].completed_at).toBeTruthy()
    expect(fake.current.tables.time_entries).toHaveLength(1)
  })

  it("gera códigos sequenciais a partir do maior OCT existente", async () => {
    fake.current.tables.tasks = [{ id: "x", code: "OCT-410" }]
    await POST(req("POST", { tasks: [{ externalRef: "a", title: "A" }, { externalRef: "b", title: "B" }] }))
    expect(fake.current.tables.tasks.map((t) => t.code)).toEqual(["OCT-410", "OCT-411", "OCT-412"])
  })

  it("valida entradas e responde 207 com os erros por item", async () => {
    const res = await POST(
      req("POST", {
        tasks: [{ title: "sem ref" }, { externalRef: "novo" }],
        meetings: [{ granolaId: "g", title: "M", date: "05-11-2026" }],
        timeEntries: [
          { externalId: "a", startedAt: "ontem", hours: 1 },
          { externalId: "b", startedAt: "2026-11-05T12:00:00Z", hours: 30 },
          { startedAt: "2026-11-05T12:00:00Z", hours: 1 },
        ],
      })
    )
    expect(res.status).toBe(207)
    const body = await res.json()
    expect(body.tasks.map((r: { error: string }) => r.error)).toEqual([
      "externalRef é obrigatório.",
      "title é obrigatório para criar a tarefa.",
    ])
    expect(body.meetings[0].error).toMatch(/AAAA-MM-DD/)
    expect(body.timeEntries.map((r: { status: string }) => r.status)).toEqual(["error", "error", "error"])
    expect(fake.current.tables.tasks ?? []).toHaveLength(0)
  })

  it("ignora valores fora do domínio (coluna/prioridade/status)", async () => {
    await POST(req("POST", { tasks: [{ externalRef: "1", title: "A", column: "hackeado", priority: "max" }] }))
    expect(fake.current.tables.tasks[0]).toMatchObject({ column: "todo" })
    expect(fake.current.tables.tasks[0].priority).toBeUndefined()
  })

  it("rejeita lotes acima de 500 itens e JSON inválido", async () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ externalRef: String(i), title: "x" }))
    expect((await POST(req("POST", { tasks: many }))).status).toBe(413)
    const bad = new Request("http://localhost/api/agent/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: "{nao e json",
    })
    expect((await POST(bad)).status).toBe(400)
  })

  it("propaga erro do banco como erro do item", async () => {
    fake.current.failOn = (table) => (table === "time_entries" ? { message: "violação" } : null)
    const res = await POST(req("POST", { timeEntries: [{ externalId: "e", startedAt: "2026-11-05T12:00:00Z", hours: 1 }] }))
    expect(res.status).toBe(207)
    expect((await res.json()).timeEntries[0]).toMatchObject({ status: "error", error: "violação" })
  })
})

describe("GET /api/agent/sync", () => {
  beforeEach(() => {
    fake.current.tables.tasks = [
      { id: "t1", code: "OCT-301", external_ref: "12345", updated_at: "2026-11-01T00:00:00Z" },
      { id: "t2", code: "OCT-302", external_ref: null, updated_at: "2026-11-09T00:00:00Z" },
    ]
    fake.current.tables.meetings = [{ id: "m1", title: "M", updated_at: "2026-11-09T00:00:00Z" }]
    fake.current.tables.time_entries = [
      { id: "e1", user_id: AGENT, task_id: "t1", started_at: "2026-11-09T12:00:00Z", hours: "0.17", updated_at: "2026-11-09T00:00:00Z" },
      { id: "e2", user_id: AGENT, task_id: "t2", started_at: "2026-11-02T12:00:00Z", hours: "1.1", updated_at: "2026-11-02T00:00:00Z" },
    ]
  })

  it("exporta tudo com horas de apontamento e dados do chamado", async () => {
    const res = await GET(req("GET"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toHaveLength(2)
    const e1 = body.timeEntries.find((e: { id: string }) => e.id === "e1")
    expect(e1).toMatchObject({ hours: 0.17, hours_itsm: 0.5, task_code: "OCT-301", external_ref: "12345", user_name: "Flavio" })
    const e2 = body.timeEntries.find((e: { id: string }) => e.id === "e2")
    expect(e2.hours_itsm).toBe(1.5)
  })

  it("filtra por since e completa a tarefa de lançamentos cuja tarefa não mudou", async () => {
    const res = await GET(req("GET", undefined, { query: "?since=2026-11-05T00:00:00Z" }))
    const body = await res.json()
    expect(body.tasks.map((t: { id: string }) => t.id)).toEqual(["t2"])
    expect(body.timeEntries.map((e: { id: string }) => e.id)).toEqual(["e1"])
    expect(body.timeEntries[0]).toMatchObject({ task_code: "OCT-301", external_ref: "12345" })
    expect(body.since).toBe("2026-11-05T00:00:00.000Z")
  })

  it("400 para since inválido", async () => {
    expect((await GET(req("GET", undefined, { query: "?since=ontem" }))).status).toBe(400)
  })
})

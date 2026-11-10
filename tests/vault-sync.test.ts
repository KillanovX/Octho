// Executa scripts/vault-sync.mjs como processo contra um vault de exemplo (sem tocar o vault real).
import { execFile } from "child_process"
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs"
import { createServer, type Server } from "http"
import { tmpdir } from "os"
import path from "path"
import { promisify } from "util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const run = promisify(execFile)
const SCRIPT = path.resolve(__dirname, "../scripts/vault-sync.mjs")
let vault: string

const CHAMADO = `---
tipo: chamado
id_itsm: "#12345"
cliente: Cliente Exemplo
status: em_atendimento
prioridade: alta
horas_totais: 2.0
---

# 12345 - Falha de acesso ao Portal via NPA

## Situação atual

Aguardando validacao do cliente.

---

## Próximas ações

- [ ] **Responder ao TAC (Flavio):** Atualizar o case [[Outra nota|#999]]. [due:: 2026-11-12] [priority:: high]

- [x] **Validacao final:** Acesso confirmado. [due:: 2026-11-06] [completion:: 2026-11-09]

---

## Histórico e worklog

### 09-11-2026 | 10:00-11:00 (1.0h) | Sufixo DNS aplicado
- Sufixo **aplicado** via CMD.
- Acesso validado.

#### Evidencias
- log longo que nao deve entrar

### 05-11-2026 | horario nao registrado (0.5h) | Analise inicial

### 05-11-2026 | 14:00-14:30 (0.5h) | Validacao SSO
`

const ATA = `---
tipo: reuniao
data: 2026-11-05
granola_id: abc-123
vinculo_chamado: "[[12345 Falha de acesso ao Portal via NPA|#12345]]"
participantes:
  - Ana
  - Flavio
---

# Reuniao: Validacao SSO callback

**Horario:** \`14:00 - 14:45\`

## Resumo

Callback SSO validado.
`

const INDICE = `---
tipo: moc
---
# Chamados - Indice
`

beforeAll(() => {
  vault = mkdtempSync(path.join(tmpdir(), "octho-vault-"))
  mkdirSync(path.join(vault, "Chamados"))
  mkdirSync(path.join(vault, "Meetings"))
  mkdirSync(path.join(vault, "Entrada"))
  writeFileSync(path.join(vault, "Chamados", "12345 Falha de acesso ao Portal via NPA.md"), CHAMADO)
  writeFileSync(path.join(vault, "Chamados", "chamados-indice.md"), INDICE)
  writeFileSync(path.join(vault, "Meetings", "2026-11-05 12345 Validacao SSO callback (Ana).md"), ATA)
})

afterAll(() => rmSync(vault, { recursive: true, force: true }))

const env = (extra: Record<string, string> = {}) => ({
  ...process.env,
  OBSIDIAN_VAULT: vault,
  OCTHO_TZ_OFFSET: "-03:00",
  OCTHO_SYNC_STATE: path.join(vault, ".sync-state.json"), // fora do repositório
  ...extra,
})

describe("vault-sync push --dry-run", () => {
  it("extrai chamados, atas e worklog no formato da API", async () => {
    const { stdout, stderr } = await run("node", [SCRIPT, "push", "--dry-run"], { env: env() })
    expect(stderr).toMatch(/1 chamados, 1 atas, 3 lançamentos \(2\.0h\)/)
    const payload = JSON.parse(stdout)

    expect(payload.tasks).toEqual([
      expect.objectContaining({
        externalRef: "12345",
        title: "Falha de acesso ao Portal via NPA",
        column: "in_progress",
        priority: "high",
        client: "Cliente Exemplo",
        vaultPath: "Chamados/12345 Falha de acesso ao Portal via NPA.md",
      }),
    ])
    expect(payload.tasks[0].description).toContain("Aguardando validacao")

    expect(payload.meetings).toEqual([
      expect.objectContaining({
        granolaId: "abc-123",
        date: "2026-11-05",
        startTime: "14:00",
        durationMinutes: 45,
        externalRef: "12345",
        participants: ["Ana", "Flavio"],
        status: "completed",
      }),
    ])

    const entries = payload.timeEntries
    expect(entries).toHaveLength(3)
    const dns = entries.find((e: { note: string }) => e.note === "Sufixo DNS aplicado")
    expect(dns).toMatchObject({ externalRef: "12345", hours: 1 })
    expect(new Date(dns.startedAt).toISOString()).toBe("2026-11-09T13:00:00.000Z") // 10:00 em -03:00
    expect(new Date(dns.endedAt).toISOString()).toBe("2026-11-09T14:00:00.000Z")

    const semHorario = entries.find((e: { note: string }) => e.note.startsWith("Analise inicial"))
    expect(semHorario.note).toMatch(/horario nao registrado/)
    expect(new Date(semHorario.startedAt).toISOString()).toBe("2026-11-05T12:00:00.000Z") // 09:00 padrão

    // lançamento do mesmo chamado/dia e início próximo da ata é ligado a ela
    const sso = entries.find((e: { note: string }) => e.note === "Validacao SSO")
    expect(sso.granolaId).toBe("abc-123")
  })

  it("histórico e próximas ações do chamado viram checkpoints da tarefa", async () => {
    const { stdout } = await run("node", [SCRIPT, "push", "--dry-run"], { env: env() })
    const [task] = JSON.parse(stdout).tasks
    const cps = task.checkpoints as { id: string; title: string; completed: boolean; kind: string; note?: string }[]

    // histórico em ordem cronológica, todo concluído, depois as ações
    expect(cps.map((c) => c.kind)).toEqual(["log", "log", "log", "action", "action"])
    expect(cps.slice(0, 3).map((c) => c.title)).toEqual([
      "05-11-2026 horario nao registrado (0.5h) | Analise inicial",
      "05-11-2026 14:00-14:30 (0.5h) | Validacao SSO",
      "09-11-2026 10:00-11:00 (1.0h) | Sufixo DNS aplicado",
    ])
    expect(cps.slice(0, 3).every((c) => c.completed)).toBe(true)
    // tópicos de primeiro nível viram nota; evidências (####) ficam de fora; markdown limpo
    expect(cps[2].note).toBe("Sufixo aplicado via CMD.\nAcesso validado.")

    expect(cps[3]).toMatchObject({
      title: "Responder ao TAC (Flavio): Atualizar o case #999.",
      completed: false,
      note: "Prazo 12-11-2026",
      due: "2026-11-12",
    })
    expect(cps[4]).toMatchObject({ completed: true, note: "Prazo 06-11-2026 · Concluído em 09-11-2026" })
    expect(cps.every((c) => c.id.startsWith("vault-"))).toBe(true)
  })

  it("externalId é estável entre execuções (idempotência)", async () => {
    const a = JSON.parse((await run("node", [SCRIPT, "push", "--dry-run"], { env: env() })).stdout)
    const b = JSON.parse((await run("node", [SCRIPT, "push", "--dry-run"], { env: env() })).stdout)
    expect(a.timeEntries.map((e: { externalId: string }) => e.externalId)).toEqual(
      b.timeEntries.map((e: { externalId: string }) => e.externalId)
    )
    expect(new Set(a.timeEntries.map((e: { externalId: string }) => e.externalId)).size).toBe(3)
  })

  it("push real sem configuração falha com mensagem clara", async () => {
    await expect(run("node", [SCRIPT, "push"], { env: env({ OCTHO_URL: "", OCTHO_AGENT_TOKEN: "" }) })).rejects.toMatchObject({
      stderr: expect.stringMatching(/OCTHO_URL/),
    })
  })
})

describe("vault-sync push/pull contra servidor", () => {
  let server: Server
  let url: string
  const received: { method: string; auth?: string; body?: unknown; url?: string }[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      let data = ""
      req.on("data", (c) => (data += c))
      req.on("end", () => {
        received.push({ method: req.method!, auth: req.headers.authorization, body: data ? JSON.parse(data) : undefined, url: req.url })
        res.setHeader("Content-Type", "application/json")
        if (req.method === "POST") {
          const body = JSON.parse(data)
          const ok = (arr: { externalRef?: string; granolaId?: string; externalId?: string }[]) =>
            arr.map((x) => ({ key: x.externalRef ?? x.granolaId ?? x.externalId, status: "created" }))
          res.end(JSON.stringify({ tasks: ok(body.tasks), meetings: ok(body.meetings), timeEntries: ok(body.timeEntries) }))
          return
        }
        res.end(
          JSON.stringify({
            generatedAt: "2026-11-09T21:00:00.000Z",
            since: null,
            tasks: [
              { id: "t1", code: "OCT-301", title: "Falha Portal", external_ref: "12345", source: "obsidian" },
              { id: "t2", code: "OCT-302", title: "Tarefa interna", external_ref: null, source: "octho", column: "todo" },
            ],
            meetings: [{ id: "m9", title: "Call nova", date: "2026-11-09", granola_id: null, vault_path: null, duration_minutes: 30 }],
            timeEntries: [
              { id: "e1", task_id: "t1", started_at: "2026-11-09T13:00:00Z", hours: 0.4, hours_itsm: 0.5, source: "timer", task_code: "OCT-301", external_ref: "12345", user_name: "Flavio", note: null },
              { id: "e2", task_id: "t1", started_at: "2026-11-09T15:00:00Z", hours: 1, hours_itsm: 1, source: "agent", external_id: "vault-x", task_code: "OCT-301", external_ref: "12345", user_name: "Flavio", note: "do vault" },
            ],
          })
        )
      })
    })
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()))
    const addr = server.address() as { port: number }
    url = `http://127.0.0.1:${addr.port}`
  })

  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  it("push envia o lote com o token do agente", async () => {
    await run("node", [SCRIPT, "push"], { env: env({ OCTHO_URL: url, OCTHO_AGENT_TOKEN: "segredo" }) })
    const post = received.find((r) => r.method === "POST")!
    expect(post.auth).toBe("Bearer segredo")
    expect(post.url).toBe("/api/agent/sync")
    expect(post.body).toMatchObject({ tasks: [{ externalRef: "12345" }], meetings: [{ granolaId: "abc-123" }] })
  })

  it("pull grava o relatório só em Entrada/ e não toca chamados/atas", async () => {
    const before = readFileSync(path.join(vault, "Chamados", "12345 Falha de acesso ao Portal via NPA.md"), "utf8")
    await run("node", [SCRIPT, "pull"], { env: env({ OCTHO_URL: url, OCTHO_AGENT_TOKEN: "segredo" }) })

    const files = readdirSync(path.join(vault, "Entrada"))
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2} Octho export\.md$/)
    const report = readFileSync(path.join(vault, "Entrada", files[0]), "utf8")
    expect(report.startsWith("---")).toBe(true)
    expect(report).toContain("12345")
    expect(report).toContain("Call nova") // reunião sem ata no vault
    expect(report).toContain("OCT-302") // tarefa sem chamado
    expect(report).not.toContain("do vault") // lançamento que veio do próprio vault não volta
    // bloco pronto para colar no worklog: 13:00Z = 10:00 em Brasília, fim pelas horas ITSM
    expect(report).toContain("```text\n### 09-11-2026 | 10:00-10:30 (0.5h) | Sessao registrada no Octho\n```")
    expect(report).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u) // regra do vault: sem emojis

    expect(readFileSync(path.join(vault, "Chamados", "12345 Falha de acesso ao Portal via NPA.md"), "utf8")).toBe(before)
    const get = received.find((r) => r.method === "GET")!
    expect(get.auth).toBe("Bearer segredo")
  })
})

#!/usr/bin/env node
// Sincronização entre o vault Obsidian (Chamados/ e Meetings/) e o Octho (/api/agent/sync).
//
//   node scripts/vault-sync.mjs push [--dry-run]   vault -> Octho (chamados, atas, worklog)
//   node scripts/vault-sync.mjs pull [--dry-run]   Octho -> relatório em <vault>/Entrada/
//
// Env: OCTHO_URL (ex: https://octho.vercel.app), OCTHO_AGENT_TOKEN, OBSIDIAN_VAULT
// Sem dependências externas (Node 24+).

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { createHash } from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"

const VAULT = process.env.OBSIDIAN_VAULT || "G:\\Meu Drive\\Obsidian\\Brain"
const OCTHO_URL = (process.env.OCTHO_URL || "").replace(/\/$/, "")
const TOKEN = process.env.OCTHO_AGENT_TOKEN || ""
const TZ_OFFSET = process.env.OCTHO_TZ_OFFSET || "-03:00" // horário de Brasília
const BATCH = 500
const STATE_FILE =
  process.env.OCTHO_SYNC_STATE || path.join(path.dirname(fileURLToPath(import.meta.url)), ".vault-sync-state.json")

// ─── Parser mínimo de frontmatter YAML (escalares, listas simples) ──────────
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { data: {}, body: text }
  const data = {}
  let listKey = null
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue
    const item = raw.match(/^\s+-\s+(.*)$/)
    if (item && listKey) {
      data[listKey].push(unquote(item[1]))
      continue
    }
    const kv = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!kv) continue
    const [, key, value] = kv
    if (value === "") {
      data[key] = []
      listKey = key
    } else {
      data[key] = scalar(value)
      listKey = null
    }
  }
  return { data, body: text.slice(m[0].length) }
}

function unquote(v) {
  const s = v.trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1)
  return s
}

function scalar(v) {
  const s = unquote(v)
  if (s !== v.trim()) return s // estava entre aspas: mantém string
  if (s === "true") return true
  if (s === "false") return false
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

// ─── Utilidades ─────────────────────────────────────────────────────────────
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 24)
const dmyToIso = (dmy) => {
  const [d, m, y] = dmy.split("-")
  return `${y}-${m}-${d}`
}
const toInstant = (isoDate, hhmm) => new Date(`${isoDate}T${hhmm}:00${TZ_OFFSET}`).toISOString()
const rel = (abs) => path.relative(VAULT, abs).split(path.sep).join("/")

function section(body, heading) {
  const re = new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m")
  return body.match(re)?.[1] ?? ""
}

async function listMd(dir) {
  const abs = path.join(VAULT, dir)
  if (!existsSync(abs)) return []
  return (await readdir(abs))
    .filter((f) => f.endsWith(".md") && !f.endsWith("-indice.md") && !f.startsWith("Template"))
    .map((f) => path.join(abs, f))
}

const STATUS_TO_COLUMN = [
  [/^(resolvido|fechado|concluido|encerrado|solucionado|cancelado)/, "done"],
  [/^(em_andamento|em_atendimento|andamento|atendimento)/, "in_progress"],
  [/^(pendente|aguardando|agendado|novo|aberto)/, "todo"],
]
const PRIORITY = { critica: "urgent", urgente: "urgent", alta: "high", media: "medium", baixa: "low" }

function mapColumn(status) {
  const s = String(status || "").toLowerCase()
  for (const [re, col] of STATUS_TO_COLUMN) if (re.test(s)) return col
  return "backlog"
}

// ─── Leitura do vault ───────────────────────────────────────────────────────
// Worklog: "### DD-MM-AAAA | HH:MM-HH:MM (0.0h) | Título" ou "### DD-MM-AAAA | horario nao registrado (0.5h) | Título"
const WORKLOG_RE = /^### (\d{2}-\d{2}-\d{4}) \| (?:(\d{2}:\d{2})-(\d{2}:\d{2})|([^|(]*?))\s*\((\d+(?:[.,]\d+)?)h\) \| (.+)$/

export async function readChamados() {
  const tasks = []
  const worklog = []
  const warnings = []
  for (const file of await listMd("Chamados")) {
    const { data, body } = parseFrontmatter(await readFile(file, "utf8"))
    if (data.tipo && data.tipo !== "chamado") continue
    const ref = String(data.id_itsm ?? "").replace(/\D/g, "") || path.basename(file).match(/^(\d+)/)?.[1]
    if (!ref) {
      warnings.push(`Sem id_itsm: ${rel(file)}`)
      continue
    }
    const h1 = body.match(/^# (.+)$/m)?.[1] ?? path.basename(file, ".md")
    const title = h1.replace(/^\[?#?\d+\]?\s*-\s*/, "").trim()
    const situacao = section(body, "Situação atual").replace(/\n?---\s*$/, "").trim()

    tasks.push({
      externalRef: ref,
      title,
      column: mapColumn(data.status),
      ...(PRIORITY[String(data.prioridade || "").toLowerCase()] ? { priority: PRIORITY[String(data.prioridade).toLowerCase()] } : {}),
      client: data.cliente ? String(data.cliente) : undefined,
      description: situacao ? situacao.slice(0, 8000) : undefined,
      vaultPath: rel(file),
    })

    for (const line of section(body, "Histórico e worklog").split(/\r?\n/)) {
      const m = line.trim().match(WORKLOG_RE)
      if (!m) continue
      const [, dmy, start, end, noTime, hoursRaw, entryTitle] = m
      const date = dmyToIso(dmy)
      const hours = Number(hoursRaw.replace(",", "."))
      const hasTime = !!start
      worklog.push({
        ref,
        date,
        start: start ?? null,
        end: end ?? null,
        entry: {
          externalId: `vault-${hash(`${ref}|${dmy}|${start ?? noTime?.trim()}|${entryTitle.trim()}`)}`,
          externalRef: ref,
          startedAt: toInstant(date, start ?? "09:00"),
          ...(hasTime && end ? { endedAt: toInstant(date, end) } : {}),
          hours,
          note: hasTime ? entryTitle.trim() : `${entryTitle.trim()} (horario nao registrado no vault)`,
        },
      })
    }
  }
  return { tasks, worklog, warnings }
}

export async function readMeetings() {
  const meetings = []
  const warnings = []
  for (const file of await listMd("Meetings")) {
    const { data, body } = parseFrontmatter(await readFile(file, "utf8"))
    if (data.tipo && data.tipo !== "reuniao") continue
    const base = path.basename(file, ".md")
    const date = String(data.data || base.slice(0, 10))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      warnings.push(`Data inválida: ${rel(file)}`)
      continue
    }
    const granolaId =
      (data.granola_id && String(data.granola_id)) ||
      String(data.granola_url || "").match(/\/d\/([\w-]+)/)?.[1] ||
      `vault-${hash(rel(file))}`

    // Chamado: vinculo_chamado ([[...|#12345]] ou [[12345 ...]]) ou ID no nome do arquivo
    const link = String(data.vinculo_chamado || "")
    const externalRef =
      link.match(/#(\d{4,})/)?.[1] || link.match(/\[\[(?:Chamados\/)?(\d{4,})/)?.[1] || base.match(/^\d{4}-\d{2}-\d{2} (\d{4,}) /)?.[1]

    const horario = body.match(/\*\*Hor[aá]rio:\*\*\s*`?(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/)
    let durationMinutes = Math.round(Number(data.duracao_horas || 1) * 60)
    if (horario) {
      const [h1, m1] = horario[1].split(":").map(Number)
      const [h2, m2] = horario[2].split(":").map(Number)
      const diff = h2 * 60 + m2 - (h1 * 60 + m1)
      if (diff > 0) durationMinutes = diff
    }
    const h1 = body.match(/^# (.+)$/m)?.[1] ?? base
    const title = h1.replace(/^Reuni[aã]o:\s*/i, "").replace(/^#?\d+\s*-\s*/, "").trim()
    // Atas usam "## Resumo...", "## 2. Resumo da Sessao..." ou "## Contexto & Diagnostico..."
    const resumo = (section(body, "(?:\\d+\\.\\s*)?Resumo") || section(body, "(?:\\d+\\.\\s*)?Contexto")).trim()

    meetings.push({
      granolaId,
      title,
      date,
      ...(horario ? { startTime: horario[1] } : {}),
      durationMinutes,
      ...(externalRef ? { externalRef } : {}),
      participants: Array.isArray(data.participantes) ? data.participantes.map(String) : [],
      status: "completed",
      vaultPath: rel(file),
      ...(resumo ? { summary: resumo.slice(0, 8000) } : {}),
    })
  }
  return { meetings, warnings }
}

/** Liga um lançamento do worklog à ata do mesmo chamado/dia com início até 30 min de diferença. */
function linkWorklogToMeetings(worklog, meetings) {
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number)
    return h * 60 + m
  }
  return worklog.map((w) => {
    if (!w.start) return w.entry
    const match = meetings.find(
      (m) => m.externalRef === w.ref && m.date === w.date && m.startTime && Math.abs(toMin(m.startTime) - toMin(w.start)) <= 30
    )
    return match ? { ...w.entry, granolaId: match.granolaId } : w.entry
  })
}

// ─── API ────────────────────────────────────────────────────────────────────
async function api(method, pathname, body) {
  if (!OCTHO_URL || !TOKEN) throw new Error("Defina OCTHO_URL e OCTHO_AGENT_TOKEN.")
  const res = await fetch(`${OCTHO_URL}${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok && res.status !== 207) throw new Error(`${method} ${pathname}: HTTP ${res.status} ${data.error ?? ""}`)
  return { status: res.status, data }
}

function chunks(payload) {
  // Mantém a ordem: tarefas antes de reuniões, reuniões antes de lançamentos
  const items = [
    ...payload.tasks.map((x) => ["tasks", x]),
    ...payload.meetings.map((x) => ["meetings", x]),
    ...payload.timeEntries.map((x) => ["timeEntries", x]),
  ]
  const out = []
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = { tasks: [], meetings: [], timeEntries: [] }
    for (const [k, v] of items.slice(i, i + BATCH)) batch[k].push(v)
    out.push(batch)
  }
  return out
}

async function push(dryRun) {
  const { tasks, worklog, warnings: w1 } = await readChamados()
  const { meetings, warnings: w2 } = await readMeetings()
  const timeEntries = linkWorklogToMeetings(worklog, meetings)
  const payload = { tasks, meetings, timeEntries }
  const warnings = [...w1, ...w2]

  const totalHours = timeEntries.reduce((a, e) => a + e.hours, 0)
  console.error(
    `vault: ${tasks.length} chamados, ${meetings.length} atas, ${timeEntries.length} lançamentos (${totalHours.toFixed(1)}h), ` +
      `${timeEntries.filter((e) => e.granolaId).length} lançamentos ligados a atas`
  )
  warnings.forEach((w) => console.error(`aviso: ${w}`))

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  let errors = 0
  for (const batch of chunks(payload)) {
    const { data } = await api("POST", "/api/agent/sync", batch)
    for (const kind of ["tasks", "meetings", "timeEntries"]) {
      const res = data[kind] ?? []
      const count = (s) => res.filter((r) => r.status === s).length
      console.error(`${kind}: ${count("created")} criados, ${count("updated")} atualizados, ${count("error")} erros`)
      res.filter((r) => r.status === "error").forEach((r) => {
        errors++
        console.error(`  erro ${kind} ${r.key}: ${r.error}`)
      })
    }
  }
  if (errors) process.exitCode = 1
}

// ─── Pull: relatório em Entrada/ (nunca edita Chamados/ ou Meetings/) ───────
const fmtDate = (iso) => {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, "0")
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`
}
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
const cell = (v) => String(v ?? "").replace(/\|/g, "/").replace(/\r?\n/g, " ")

function renderReport(data, todayIso) {
  const entries = data.timeEntries ?? []
  // Lançamentos que vieram do próprio vault já estão no worklog: o relatório mostra só os do Octho
  const fromOctho = entries.filter((e) => !String(e.external_id ?? "").startsWith("vault-"))
  const byRef = new Map()
  for (const e of fromOctho) {
    const key = e.external_ref ? `#${e.external_ref}` : e.task_code ? `${e.task_code} (sem chamado)` : "Sem tarefa"
    if (!byRef.has(key)) byRef.set(key, [])
    byRef.get(key).push(e)
  }
  const newMeetings = (data.meetings ?? []).filter((m) => !m.vault_path)
  const tasksNoTicket = (data.tasks ?? []).filter((t) => !t.external_ref)

  const lines = [
    "---",
    "tipo: entrada",
    "origem: \"Octho\"",
    `data: ${todayIso}`,
    `octho_desde: "${data.since ?? ""}"`,
    `octho_gerado_em: "${data.generatedAt}"`,
    "tags:",
    "  - entrada",
    "  - octho",
    "---",
    "",
    `# Octho export ${fmtDate(data.generatedAt)}`,
    "",
    "> [!INFO] Localização",
    "> [[entrada-indice|Entrada]]. Relatório gerado por `scripts/vault-sync.mjs pull`. Triagem manual: lançamentos vão para o worklog do chamado; nenhuma nota de Chamados/ ou Meetings/ foi alterada.",
    "",
    `Período: ${data.since ? `desde ${fmtDate(data.since)} ${fmtTime(data.since)}` : "histórico completo"}.`,
    "",
    "## Lançamentos de horas registrados no Octho",
    "",
  ]
  if (!byRef.size) lines.push("Nenhum lançamento novo.", "")
  for (const [key, list] of byRef) {
    const total = list.reduce((a, e) => a + e.hours, 0)
    const totalItsm = list.reduce((a, e) => a + e.hours_itsm, 0)
    lines.push(`### ${key}`, "", "| Data | Início | Membro | Origem | Horas | Horas ITSM | Nota |", "| :--- | :--- | :--- | :--- | ---: | ---: | :--- |")
    for (const e of list) {
      lines.push(
        `| ${fmtDate(e.started_at)} | ${fmtTime(e.started_at)} | ${cell(e.user_name)} | ${e.source} | ${e.hours.toFixed(2)} | ${e.hours_itsm.toFixed(1)} | ${cell(e.note)} |`
      )
    }
    lines.push(`| **Total** | | | | **${total.toFixed(2)}** | **${totalItsm.toFixed(1)}** | |`, "")
  }
  lines.push("## Reuniões criadas no Octho (sem ata no vault)", "")
  if (!newMeetings.length) lines.push("Nenhuma.", "")
  else {
    lines.push("| Data | Título | Duração | Chamado | Status |", "| :--- | :--- | ---: | :--- | :--- |")
    for (const m of newMeetings)
      lines.push(`| ${fmtDate(m.date + "T12:00:00Z")} | ${cell(m.title)} | ${m.duration_minutes} min | ${m.external_ref ? `#${m.external_ref}` : ""} | ${m.status} |`)
    lines.push("")
  }
  lines.push("## Tarefas do Octho sem chamado vinculado", "")
  if (!tasksNoTicket.length) lines.push("Nenhuma.", "")
  else {
    lines.push("| Código | Título | Coluna | Cliente | Horas |", "| :--- | :--- | :--- | :--- | ---: |")
    for (const t of tasksNoTicket) lines.push(`| ${t.code} | ${cell(t.title)} | ${t.column} | ${cell(t.client)} | ${Number(t.hours_logged).toFixed(2)} |`)
    lines.push("")
  }
  return lines.join("\n")
}

async function pull(dryRun) {
  const state = existsSync(STATE_FILE) ? JSON.parse(await readFile(STATE_FILE, "utf8")) : {}
  const qs = state.lastPullAt ? `?since=${encodeURIComponent(state.lastPullAt)}` : ""
  const { data } = await api("GET", `/api/agent/sync${qs}`)
  const todayIso = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
  const report = renderReport(data, todayIso)
  if (dryRun) {
    console.log(report)
    return
  }
  const dir = path.join(VAULT, "Entrada")
  await mkdir(dir, { recursive: true })
  let target = path.join(dir, `${todayIso} Octho export.md`)
  for (let i = 2; existsSync(target); i++) target = path.join(dir, `${todayIso} Octho export ${i}.md`)
  await writeFile(target, report, "utf8")
  await writeFile(STATE_FILE, JSON.stringify({ ...state, lastPullAt: data.generatedAt }, null, 2))
  console.error(`relatório: ${rel(target)}`)
}

// ─── CLI ────────────────────────────────────────────────────────────────────
const [cmd, ...flags] = process.argv.slice(2)
const dryRun = flags.includes("--dry-run")
if (cmd === "push") await push(dryRun)
else if (cmd === "pull") await pull(dryRun)
else {
  console.error("uso: node scripts/vault-sync.mjs <push|pull> [--dry-run]")
  process.exitCode = 2
}

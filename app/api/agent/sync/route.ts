import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  errorResponse,
  getServiceClient,
  HttpError,
  nextTaskCode,
  requireAgent,
} from "@/lib/server/supabase-admin"
import { roundItsmHours } from "@/lib/hours"

/**
 * API de integração para o Hermes Agent / vault Obsidian.
 *
 * GET  /api/agent/sync?since=<ISO>   -> exporta tarefas, reuniões e lançamentos alterados desde `since`
 * POST /api/agent/sync               -> upsert idempotente de { tasks, meetings, timeEntries }
 *
 * Autenticação: Authorization: Bearer <OCTHO_AGENT_TOKEN>
 * Chaves naturais: tasks.externalRef (ID do chamado ITSM), meetings.granolaId, timeEntries.externalId.
 */

const COLUMNS = ["backlog", "todo", "in_progress", "done"] as const
const PRIORITIES = ["urgent", "high", "medium", "low", "none"] as const
const MEETING_STATUS = ["planned", "completed", "cancelled"] as const
const MAX_ITEMS = 500
const MAX_CHECKPOINTS = 300

type Checkpoint = { id: string; title: string; completed: boolean; kind?: "log" | "action"; note?: string; due?: string; source: "vault" }

/**
 * Checkpoints vindos do vault (histórico/worklog e próximas ações do chamado).
 * Todos recebem id "vault-*"; retorna null quando o campo não foi enviado.
 */
function parseCheckpoints(v: unknown): Checkpoint[] | null {
  if (!Array.isArray(v)) return null
  const out: Checkpoint[] = []
  for (const item of v.slice(0, MAX_CHECKPOINTS)) {
    if (!item || typeof item !== "object") continue
    const c = item as Record<string, unknown>
    const id = str(c.id, 120)
    const title = str(c.title, 500)
    if (!id || !title) continue
    out.push({
      id: id.startsWith("vault-") ? id : `vault-${id}`,
      title,
      completed: c.completed === true,
      ...(c.kind === "log" || c.kind === "action" ? { kind: c.kind } : {}),
      ...(str(c.note, 4000) ? { note: str(c.note, 4000) } : {}),
      ...(typeof c.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.due) ? { due: c.due } : {}),
      source: "vault",
    })
  }
  return out
}

/** Mantém os checkpoints criados no app e substitui os do vault. */
function mergeCheckpoints(existing: unknown, fromVault: Checkpoint[]) {
  const own = (Array.isArray(existing) ? existing : []).filter(
    (c) => c && typeof c === "object" && !String((c as { id?: unknown }).id ?? "").startsWith("vault-")
  )
  return [...fromVault, ...own]
}

type ItemResult = { key: string; status: "created" | "updated" | "error"; id?: string; error?: string }

function str(v: unknown, max = 2000): string | undefined {
  if (typeof v !== "string") return undefined
  const s = v.trim()
  return s ? s.slice(0, max) : undefined
}

function oneOf<T extends readonly string[]>(v: unknown, allowed: T): T[number] | undefined {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T[number]) : undefined
}

function isoDate(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

async function findTaskByRef(admin: SupabaseClient, ref?: string, code?: string) {
  if (ref) {
    const { data } = await admin.from("tasks").select("id, code, title, column, checkpoints").eq("external_ref", ref).maybeSingle()
    if (data) return data
  }
  if (code) {
    const { data } = await admin.from("tasks").select("id, code, title, column, checkpoints").eq("code", code).limit(1).maybeSingle()
    if (data) return data
  }
  return null
}

async function upsertTask(admin: SupabaseClient, agentUserId: string, raw: Record<string, unknown>): Promise<ItemResult> {
  const externalRef = str(raw.externalRef, 64)
  if (!externalRef) return { key: "?", status: "error", error: "externalRef é obrigatório." }
  const title = str(raw.title, 300)
  const column = oneOf(raw.column, COLUMNS)

  const fields: Record<string, unknown> = { source: "obsidian" }
  if (title) fields.title = title
  if (column) {
    fields.column = column
    fields.completed_at = column === "done" ? new Date().toISOString() : null
  }
  const priority = oneOf(raw.priority, PRIORITIES)
  if (priority) fields.priority = priority
  if (raw.client !== undefined) fields.client = str(raw.client, 200) ?? null
  if (raw.description !== undefined) fields.description = str(raw.description, 20000) ?? null
  if (raw.vaultPath !== undefined) fields.vault_path = str(raw.vaultPath, 500) ?? null
  if (typeof raw.estimate === "number" && raw.estimate >= 0) fields.estimate = raw.estimate
  const vaultCheckpoints = parseCheckpoints(raw.checkpoints)

  const existing = await findTaskByRef(admin, externalRef)
  if (existing) {
    if (existing.column === "done" && column === "done") delete fields.completed_at
    if (vaultCheckpoints) fields.checkpoints = mergeCheckpoints(existing.checkpoints, vaultCheckpoints)
    const { error } = await admin.from("tasks").update(fields).eq("id", existing.id)
    return error ? { key: externalRef, status: "error", error: error.message } : { key: externalRef, status: "updated", id: existing.id }
  }

  if (!title) return { key: externalRef, status: "error", error: "title é obrigatório para criar a tarefa." }
  const { data: owner } = await admin.from("profiles").select("name, avatar, avatar_color").eq("id", agentUserId).single()
  const { data, error } = await admin
    .from("tasks")
    .insert({
      ...fields,
      external_ref: externalRef,
      user_id: agentUserId,
      code: await nextTaskCode(admin),
      column: column ?? "todo",
      assignee: owner?.name ?? "",
      assignee_name: owner?.name ?? null,
      assignee_avatar: owner?.avatar ?? null,
      assignee_color: owner?.avatar_color ?? "#888",
      labels: [],
      checkpoints: vaultCheckpoints ?? [],
    })
    .select("id")
    .single()
  return error ? { key: externalRef, status: "error", error: error.message } : { key: externalRef, status: "created", id: data.id }
}

async function upsertMeeting(admin: SupabaseClient, agentUserId: string, raw: Record<string, unknown>): Promise<ItemResult> {
  const granolaId = str(raw.granolaId, 128)
  if (!granolaId) return { key: "?", status: "error", error: "granolaId é obrigatório." }
  const date = str(raw.date, 10)
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { key: granolaId, status: "error", error: "date deve ser AAAA-MM-DD." }

  const externalRef = str(raw.externalRef, 64)
  const task = await findTaskByRef(admin, externalRef)

  const fields: Record<string, unknown> = { source: "granola" }
  const title = str(raw.title, 300)
  if (title) fields.title = title
  if (date) fields.date = date
  if (raw.startTime !== undefined) fields.start_time = str(raw.startTime, 5) ?? null
  if (typeof raw.durationMinutes === "number" && raw.durationMinutes > 0) fields.duration_minutes = Math.round(raw.durationMinutes)
  if (raw.client !== undefined) fields.client = str(raw.client, 200) ?? null
  if (raw.summary !== undefined) fields.summary = str(raw.summary, 20000) ?? null
  if (Array.isArray(raw.participants)) fields.participants = raw.participants.filter((p) => typeof p === "string").slice(0, 100)
  const status = oneOf(raw.status, MEETING_STATUS)
  if (status) fields.status = status
  if (raw.vaultPath !== undefined) fields.vault_path = str(raw.vaultPath, 500) ?? null
  if (externalRef) fields.external_ref = externalRef
  if (task) {
    fields.linked_task_id = task.id
    fields.linked_task_code = task.code
    fields.linked_task_title = task.title
  }

  const { data: existing } = await admin.from("meetings").select("id").eq("granola_id", granolaId).maybeSingle()
  if (existing) {
    const { error } = await admin.from("meetings").update(fields).eq("id", existing.id)
    return error ? { key: granolaId, status: "error", error: error.message } : { key: granolaId, status: "updated", id: existing.id }
  }
  if (!title || !date) return { key: granolaId, status: "error", error: "title e date são obrigatórios para criar a reunião." }
  const { data, error } = await admin
    .from("meetings")
    .insert({ ...fields, granola_id: granolaId, user_id: agentUserId, status: status ?? "completed" })
    .select("id")
    .single()
  return error ? { key: granolaId, status: "error", error: error.message } : { key: granolaId, status: "created", id: data.id }
}

async function upsertTimeEntry(admin: SupabaseClient, agentUserId: string, raw: Record<string, unknown>): Promise<ItemResult> {
  const externalId = str(raw.externalId, 128)
  if (!externalId) return { key: "?", status: "error", error: "externalId é obrigatório." }
  const startedAt = isoDate(raw.startedAt)
  const hours = typeof raw.hours === "number" ? Math.round(raw.hours * 100) / 100 : NaN
  if (!startedAt) return { key: externalId, status: "error", error: "startedAt (ISO 8601) é obrigatório." }
  if (!(hours > 0 && hours <= 24)) return { key: externalId, status: "error", error: "hours deve estar entre 0 e 24." }

  const task = await findTaskByRef(admin, str(raw.externalRef, 64), str(raw.taskCode, 32))
  let meetingId: string | null = null
  const granolaId = str(raw.granolaId, 128)
  if (granolaId) {
    const { data } = await admin.from("meetings").select("id").eq("granola_id", granolaId).maybeSingle()
    meetingId = data?.id ?? null
  }

  const row = {
    external_id: externalId,
    user_id: agentUserId,
    task_id: task?.id ?? null,
    meeting_id: meetingId,
    started_at: startedAt,
    ended_at: isoDate(raw.endedAt) ?? null,
    hours,
    source: "agent",
    note: str(raw.note, 2000) ?? null,
  }

  const { data: existing } = await admin.from("time_entries").select("id").eq("external_id", externalId).maybeSingle()
  if (existing) {
    const { error } = await admin.from("time_entries").update(row).eq("id", existing.id)
    return error ? { key: externalId, status: "error", error: error.message } : { key: externalId, status: "updated", id: existing.id }
  }
  const { data, error } = await admin.from("time_entries").insert(row).select("id").single()
  return error ? { key: externalId, status: "error", error: error.message } : { key: externalId, status: "created", id: data.id }
}

export async function POST(req: Request) {
  try {
    const { agentUserId } = requireAgent(req)
    const admin = getServiceClient()
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") throw new HttpError(400, "JSON inválido.")

    const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])
    const tasks = list(body.tasks)
    const meetings = list(body.meetings)
    const timeEntries = list(body.timeEntries)
    if (tasks.length + meetings.length + timeEntries.length > MAX_ITEMS) {
      throw new HttpError(413, `Máximo de ${MAX_ITEMS} itens por chamada.`)
    }

    // Ordem importa: tarefas antes de reuniões e lançamentos, que referenciam o chamado
    const result = { tasks: [] as ItemResult[], meetings: [] as ItemResult[], timeEntries: [] as ItemResult[] }
    for (const t of tasks) result.tasks.push(await upsertTask(admin, agentUserId, t))
    for (const m of meetings) result.meetings.push(await upsertMeeting(admin, agentUserId, m))
    for (const e of timeEntries) result.timeEntries.push(await upsertTimeEntry(admin, agentUserId, e))

    const failed = [...result.tasks, ...result.meetings, ...result.timeEntries].some((r) => r.status === "error")
    return NextResponse.json(result, { status: failed ? 207 : 200 })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function GET(req: Request) {
  try {
    requireAgent(req)
    const admin = getServiceClient()
    const sinceParam = new URL(req.url).searchParams.get("since")
    const since = sinceParam ? isoDate(sinceParam) : undefined
    if (sinceParam && !since) throw new HttpError(400, "since deve ser uma data ISO 8601.")
    const generatedAt = new Date().toISOString()

    let tasksQuery = admin
      .from("tasks")
      .select("id, code, title, column, priority, client, external_ref, source, vault_path, hours_logged, estimate, assignee_name, completed_at, created_at, updated_at")
    let meetingsQuery = admin
      .from("meetings")
      .select("id, title, date, start_time, duration_minutes, client, summary, participants, status, granola_id, external_ref, vault_path, linked_task_code, updated_at")
    let entriesQuery = admin
      .from("time_entries")
      .select("id, user_id, task_id, meeting_id, started_at, ended_at, hours, source, note, external_id, updated_at")
    if (since) {
      tasksQuery = tasksQuery.gt("updated_at", since)
      meetingsQuery = meetingsQuery.gt("updated_at", since)
      entriesQuery = entriesQuery.gt("updated_at", since)
    }

    const [tasks, meetings, entries, profiles] = await Promise.all([
      tasksQuery.order("updated_at"),
      meetingsQuery.order("updated_at"),
      entriesQuery.order("started_at"),
      admin.from("profiles").select("id, name, email"),
    ])
    for (const r of [tasks, meetings, entries, profiles]) {
      if (r.error) throw new HttpError(500, r.error.message)
    }

    const taskById = new Map((tasks.data ?? []).map((t) => [t.id, t]))
    // lançamentos podem apontar para tarefas não alteradas desde `since`
    const missing = [...new Set((entries.data ?? []).map((e) => e.task_id).filter((id): id is string => !!id && !taskById.has(id)))]
    if (missing.length) {
      const { data } = await admin.from("tasks").select("id, code, external_ref").in("id", missing)
      for (const t of data ?? []) taskById.set(t.id, t as never)
    }
    const userById = new Map((profiles.data ?? []).map((p) => [p.id, p]))

    return NextResponse.json({
      generatedAt,
      since: since ?? null,
      tasks: tasks.data,
      meetings: meetings.data,
      timeEntries: (entries.data ?? []).map((e) => {
        const task = e.task_id ? taskById.get(e.task_id) : undefined
        return {
          ...e,
          hours: Number(e.hours),
          hours_itsm: roundItsmHours(Number(e.hours)),
          task_code: task?.code ?? null,
          external_ref: task?.external_ref ?? null,
          user_name: userById.get(e.user_id)?.name ?? null,
        }
      }),
    })
  } catch (e) {
    return errorResponse(e)
  }
}

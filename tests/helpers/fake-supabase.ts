// Cliente Supabase em memória com o subconjunto do query builder usado pelas rotas de servidor.
import { randomUUID } from "crypto"

type Row = Record<string, unknown>
type Result = { data: unknown; error: { message: string; code?: string } | null }

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" = "select"
  private payload: Row | Row[] | null = null
  private filters: ((r: Row) => boolean)[] = []
  private mode: "many" | "single" | "maybe" = "many"
  private max = Infinity
  private orderBy: string | null = null

  constructor(private db: FakeSupabase, private table: string) {}

  select(_cols?: string) {
    return this
  }
  insert(row: Row | Row[]) {
    this.op = "insert"
    this.payload = row
    return this
  }
  update(fields: Row) {
    this.op = "update"
    this.payload = fields
    return this
  }
  delete() {
    this.op = "delete"
    return this
  }
  upsert(row: Row | Row[]) {
    this.op = "insert"
    this.payload = row
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val)
    return this
  }
  gt(col: string, val: string) {
    this.filters.push((r) => String(r[col] ?? "") > val)
    return this
  }
  like(col: string, pattern: string) {
    const prefix = pattern.replace(/%$/, "")
    this.filters.push((r) => String(r[col] ?? "").startsWith(prefix))
    return this
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]))
    return this
  }
  order(col: string) {
    this.orderBy = col
    return this
  }
  limit(n: number) {
    this.max = n
    return this
  }
  single() {
    this.mode = "single"
    return this
  }
  maybeSingle() {
    this.mode = "maybe"
    return this
  }

  private rows() {
    return (this.db.tables[this.table] ??= [])
  }

  private shape(found: Row[]): Result {
    if (this.mode === "many") return { data: found, error: null }
    if (this.mode === "maybe") return found.length > 1 ? { data: null, error: { message: "multiple rows" } } : { data: found[0] ?? null, error: null }
    return found.length === 1 ? { data: found[0], error: null } : { data: null, error: { message: `expected 1 row, got ${found.length}` } }
  }

  execute(): Result {
    const now = new Date().toISOString()
    if (this.op === "insert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => ({
        id: randomUUID(),
        created_at: now,
        updated_at: now,
        ...r,
      }))
      const err = this.db.failOn?.(this.table, "insert", items)
      if (err) return { data: null, error: err }
      this.rows().push(...items)
      return this.shape(items)
    }
    const found = this.rows().filter((r) => this.filters.every((f) => f(r)))
    if (this.op === "update") {
      found.forEach((r) => Object.assign(r, this.payload, { updated_at: now }))
      return this.shape(found)
    }
    if (this.op === "delete") {
      this.db.tables[this.table] = this.rows().filter((r) => !found.includes(r))
      return { data: null, error: null }
    }
    let out = found
    if (this.orderBy) out = [...out].sort((a, b) => String(a[this.orderBy!]).localeCompare(String(b[this.orderBy!])))
    return this.shape(out.slice(0, this.max))
  }

  then<T1 = Result, T2 = never>(ok?: ((v: Result) => T1 | PromiseLike<T1>) | null, fail?: ((e: unknown) => T2 | PromiseLike<T2>) | null) {
    return Promise.resolve(this.execute()).then(ok, fail)
  }
}

export type AuthUser = { id: string; email: string; user_metadata?: Row; app_metadata?: Row }

export class FakeSupabase {
  tables: Record<string, Row[]> = {}
  /** token -> usuário, para auth.getUser */
  tokens: Record<string, AuthUser> = {}
  calls: { method: string; args: unknown[] }[] = []
  failOn?: (table: string, op: string, rows: Row[]) => { message: string; code?: string } | null

  from(table: string) {
    return new Query(this, table)
  }

  auth = {
    getUser: async (token: string) => {
      const user = this.tokens[token]
      return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "invalid JWT" } }
    },
    admin: {
      createUser: async (attrs: { email: string; password: string; user_metadata?: Row; app_metadata?: Row }) => {
        this.calls.push({ method: "createUser", args: [attrs] })
        const id = randomUUID()
        ;(this.tables.profiles ??= []).push({ id, email: attrs.email, name: "", role: attrs.app_metadata?.octho_role ?? "pending" })
        return { data: { user: { id, email: attrs.email } }, error: null }
      },
      updateUserById: async (id: string, attrs: Row) => {
        this.calls.push({ method: "updateUserById", args: [id, attrs] })
        return { data: { user: { id } }, error: null }
      },
      deleteUser: async (id: string) => {
        this.calls.push({ method: "deleteUser", args: [id] })
        this.tables.profiles = (this.tables.profiles ?? []).filter((p) => p.id !== id)
        return { data: null, error: null }
      },
    },
  }
}

// Aplica schema.sql + migrações num Postgres real (PGlite/WASM) com um esqueleto do Supabase
// (roles anon/authenticated, auth.users, auth.uid()) e verifica papéis, RLS e triggers.
import { readFileSync, readdirSync } from "fs"
import path from "path"
import { PGlite } from "@electric-sql/pglite"
import { beforeAll, describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "../..")
const ADMIN = "11111111-1111-1111-1111-111111111111"
const MEMBER = "22222222-2222-2222-2222-222222222222"
const MEMBER2 = "44444444-4444-4444-4444-444444444444"
const PENDING = "33333333-3333-3333-3333-333333333333"

let db: PGlite

const migrations = () =>
  readdirSync(path.join(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(path.join(root, "supabase/migrations", f), "utf8"))

async function rows<T = Record<string, unknown>>(sql: string) {
  return (await db.query<T>(sql)).rows
}

/** Executa como usuário autenticado (RLS ativa). Retorna linhas ou a mensagem de erro. */
async function as(uid: string, sql: string): Promise<{ rows?: Record<string, unknown>[]; error?: string }> {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try {
    return { rows: (await db.query<Record<string, unknown>>(sql)).rows }
  } catch (e) {
    return { error: (e as Error).message }
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}

const taskHours = async (id: string) => Number((await rows<{ h: number }>(`select hours_logged h from tasks where id='${id}'`))[0].h)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `)
  await db.exec(readFileSync(path.join(root, "supabase/schema.sql"), "utf8"))

  // Estado legado (antes da migração): papel 'user', horas só em tasks.hours_logged
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ADMIN}', 'flavio.adsv@gmail.com'), ('${MEMBER}', 'membro@x.com'), ('${MEMBER2}', 'membro2@x.com');
    insert into public.profiles (id, name, email, avatar, role) values
      ('${ADMIN}', 'Flavio', 'flavio.adsv@gmail.com', 'FA', 'user'),
      ('${MEMBER}', 'Membro', 'membro@x.com', 'ME', 'user'),
      ('${MEMBER2}', 'Membro Dois', 'membro2@x.com', 'MD', 'user');
    insert into public.tasks (id, user_id, code, title, hours_logged, "column") values
      ('t1', '${MEMBER}', 'OCT-301', 'Legada', 3.5, 'done');
  `)

  for (const sql of migrations()) await db.exec(sql)
})

describe("migração", () => {
  it("é idempotente (segunda execução não falha nem duplica o saldo)", async () => {
    for (const sql of migrations()) await db.exec(sql)
    const [{ n }] = await rows<{ n: number }>(`select count(*)::int n from time_entries where task_id='t1'`)
    expect(n).toBe(1)
  })

  it("promove o admin e converte 'user' em 'member'", async () => {
    const roles = await rows<{ id: string; role: string }>(`select id, role from profiles order by id`)
    expect(roles.find((r) => r.id === ADMIN)?.role).toBe("admin")
    expect(roles.find((r) => r.id === MEMBER)?.role).toBe("member")
  })

  it("migra o saldo de horas legado para time_entries e preenche completed_at", async () => {
    expect(await taskHours("t1")).toBe(3.5)
    const [t] = await rows<{ completed_at: string | null }>(`select completed_at from tasks where id='t1'`)
    expect(t.completed_at).not.toBeNull()
  })

  it("cadastro público entra como pending; app_metadata da service role define o papel", async () => {
    await db.exec(`
      insert into auth.users (id, email, raw_user_meta_data) values ('${PENDING}', 'intruso@x.com', '{"name":"Intruso"}');
      insert into auth.users (id, email, raw_app_meta_data) values ('55555555-5555-5555-5555-555555555555', 'novo@x.com', '{"octho_role":"member"}');
      insert into auth.users (id, email, raw_app_meta_data) values ('66666666-6666-6666-6666-666666666666', 'hack@x.com', '{"octho_role":"root"}');
    `)
    const r = await rows<{ email: string; role: string; name: string }>(`select email, role, name from profiles`)
    expect(r.find((p) => p.email === "intruso@x.com")).toMatchObject({ role: "pending", name: "Intruso" })
    expect(r.find((p) => p.email === "novo@x.com")?.role).toBe("member")
    expect(r.find((p) => p.email === "hack@x.com")?.role).toBe("pending")
  })
})

describe("RLS", () => {
  it("anon não acessa nenhuma tabela", async () => {
    await db.exec("set role anon")
    await expect(db.query("select * from tasks")).rejects.toThrow()
    await expect(db.query("select * from profiles")).rejects.toThrow()
    await db.exec("reset role")
  })

  it("pending não vê nem cria dados", async () => {
    expect((await as(PENDING, "select * from tasks")).rows).toHaveLength(0)
    expect((await as(PENDING, "select * from time_entries")).rows).toHaveLength(0)
    expect((await as(PENDING, `insert into tasks (id, code, title) values ('x','OCT-999','x')`)).error).toBeTruthy()
  })

  it("pending vê apenas o próprio perfil", async () => {
    const r = await as(PENDING, "select id from profiles")
    expect(r.rows?.map((x) => x.id)).toEqual([PENDING])
  })

  it("ninguém além do admin altera papel ou e-mail do perfil", async () => {
    expect((await as(PENDING, `update profiles set role='admin' where id='${PENDING}'`)).error).toMatch(/administradores/)
    expect((await as(MEMBER, `update profiles set role='admin' where id='${MEMBER}'`)).error).toMatch(/administradores/)
    expect((await as(MEMBER, `update profiles set email='x@y.com' where id='${MEMBER}'`)).error).toMatch(/administrador/)
    expect((await as(MEMBER, `update profiles set name='Novo Nome' where id='${MEMBER}'`)).error).toBeUndefined()
    expect((await as(ADMIN, `update profiles set role='member' where id='${PENDING}'`)).error).toBeUndefined()
    await db.exec(`update profiles set role='pending' where id='${PENDING}'`)
  })

  it("member não edita o perfil de outro", async () => {
    await as(MEMBER, `update profiles set name='Hack' where id='${MEMBER2}'`)
    const [p] = await rows<{ name: string }>(`select name from profiles where id='${MEMBER2}'`)
    expect(p.name).toBe("Membro Dois")
  })

  it("tarefas: equipe vê e edita; só dono ou admin exclui", async () => {
    expect((await as(MEMBER2, "select id from tasks")).rows).toHaveLength(1)
    expect((await as(MEMBER2, `update tasks set title='Editada' where id='t1'`)).error).toBeUndefined()
    expect((await as(MEMBER2, `insert into tasks (id, user_id, code, title) values ('t2','${MEMBER}','OCT-302','x')`)).error).toBeTruthy()
    expect((await as(MEMBER2, `insert into tasks (id, code, title) values ('t2','OCT-302','Minha')`)).error).toBeUndefined()
    const [t2] = await rows<{ user_id: string }>(`select user_id from tasks where id='t2'`)
    expect(t2.user_id).toBe(MEMBER2) // default auth.uid()

    await as(MEMBER, `delete from tasks where id='t2'`)
    expect(await rows(`select 1 from tasks where id='t2'`)).toHaveLength(1)
    await as(ADMIN, `delete from tasks where id='t2'`)
    expect(await rows(`select 1 from tasks where id='t2'`)).toHaveLength(0)
  })

  it("lançamentos: cada um grava os próprios; equipe lê todos", async () => {
    expect(
      (await as(MEMBER, `insert into time_entries (user_id, task_id, started_at, hours) values ('${MEMBER2}','t1',now(),1)`)).error
    ).toBeTruthy()
    const ins = await as(MEMBER, `insert into time_entries (task_id, started_at, hours, source) values ('t1', now(), 1.25, 'timer') returning id`)
    expect(ins.error).toBeUndefined()
    expect((await as(MEMBER2, "select id from time_entries")).rows!.length).toBeGreaterThanOrEqual(2)

    const id = ins.rows![0].id
    await as(MEMBER2, `delete from time_entries where id='${id}'`)
    expect(await rows(`select 1 from time_entries where id='${id}'`)).toHaveLength(1)
    await as(MEMBER, `delete from time_entries where id='${id}'`)
    expect(await rows(`select 1 from time_entries where id='${id}'`)).toHaveLength(0)
  })

  it("valida faixa de horas e origem", async () => {
    expect((await as(MEMBER, `insert into time_entries (started_at, hours) values (now(), 0)`)).error).toBeTruthy()
    expect((await as(MEMBER, `insert into time_entries (started_at, hours) values (now(), 25)`)).error).toBeTruthy()
    expect((await as(MEMBER, `insert into time_entries (started_at, hours, source) values (now(), 1, 'x')`)).error).toBeTruthy()
  })

  it("reuniões são pessoais (admin vê todas)", async () => {
    expect((await as(MEMBER, `insert into meetings (id, title, date) values ('m1','Call','2026-11-09')`)).error).toBeUndefined()
    expect((await as(MEMBER2, "select id from meetings")).rows).toHaveLength(0)
    expect((await as(ADMIN, "select id from meetings")).rows).toHaveLength(1)
    await as(MEMBER2, `update meetings set title='x' where id='m1'`)
    const [m] = await rows<{ title: string }>(`select title from meetings where id='m1'`)
    expect(m.title).toBe("Call")
  })

  it("feed: insere só em nome próprio", async () => {
    expect(
      (await as(MEMBER, `insert into activity_events (user_id, user_initials, user_color, action, target) values ('${ADMIN}','X','#000','a','b')`)).error
    ).toBeTruthy()
    expect(
      (await as(MEMBER, `insert into activity_events (user_initials, user_color, action, target) values ('ME','#000','criou','OCT-1')`)).error
    ).toBeUndefined()
  })

  it("clientes: membro cria, só admin remove", async () => {
    expect((await as(MEMBER, `insert into clients (name) values ('Cliente Exemplo')`)).error).toBeUndefined()
    expect((await as(MEMBER, `insert into clients (name) values ('cliente exemplo')`)).error).toMatch(/duplicate|unique/i)
    await as(MEMBER, `delete from clients where name='Cliente Exemplo'`)
    expect(await rows(`select 1 from clients where name='Cliente Exemplo'`)).toHaveLength(1)
    await as(ADMIN, `delete from clients where name='Cliente Exemplo'`)
    expect(await rows(`select 1 from clients where name='Cliente Exemplo'`)).toHaveLength(0)
  })
})

describe("endurecimento", () => {
  it("helpers de RLS ficam fora do schema exposto pela API", async () => {
    const [r] = await rows<{ pub: string | null; priv: string | null }>(
      `select to_regprocedure('public.is_member()')::text pub, to_regprocedure('private.is_member()')::text priv`
    )
    expect(r.pub).toBeNull()
    expect(r.priv).toBe("private.is_member()")
  })

  it("anon e authenticated não executam funções de trigger", async () => {
    const [r] = await rows<{ anon: boolean; auth: boolean }>(
      `select has_function_privilege('anon', 'public.sync_task_hours()', 'execute') anon,
              has_function_privilege('authenticated', 'public.handle_new_user()', 'execute') auth`
    )
    expect(r).toEqual({ anon: false, auth: false })
  })
})

describe("triggers", () => {
  it("hours_logged acompanha insert, update (inclusive troca de tarefa) e delete", async () => {
    await db.exec(`insert into tasks (id, user_id, code, title) values ('t3', '${MEMBER}', 'OCT-303', 'Outra')`)
    const base = await taskHours("t1")
    const [{ id }] = await rows<{ id: string }>(
      `insert into time_entries (user_id, task_id, started_at, hours) values ('${MEMBER}','t1',now(),2) returning id`
    )
    expect(await taskHours("t1")).toBe(base + 2)

    await db.exec(`update time_entries set hours = 0.75 where id='${id}'`)
    expect(await taskHours("t1")).toBe(base + 0.75)

    await db.exec(`update time_entries set task_id = 't3' where id='${id}'`)
    expect(await taskHours("t1")).toBe(base)
    expect(await taskHours("t3")).toBe(0.75)

    await db.exec(`delete from time_entries where id='${id}'`)
    expect(await taskHours("t3")).toBe(0)
  })

  it("updated_at é atualizado em toda alteração (export incremental)", async () => {
    const [before] = await rows<{ u: string }>(`select updated_at u from tasks where id='t1'`)
    await new Promise((r) => setTimeout(r, 20))
    await db.exec(`update tasks set title='Mudou' where id='t1'`)
    const [after] = await rows<{ u: string }>(`select updated_at u from tasks where id='t1'`)
    expect(new Date(after.u).getTime()).toBeGreaterThan(new Date(before.u).getTime())
  })

  it("external_ref e granola_id são únicos", async () => {
    await db.exec(`update tasks set external_ref='12345' where id='t1'`)
    await expect(db.exec(`update tasks set external_ref='12345' where id='t3'`)).rejects.toThrow()
    await db.exec(`insert into meetings (id, user_id, title, date, granola_id) values ('g1','${MEMBER}','a','2026-11-09','abc')`)
    await expect(
      db.exec(`insert into meetings (id, user_id, title, date, granola_id) values ('g2','${MEMBER}','b','2026-11-09','abc')`)
    ).rejects.toThrow()
  })
})

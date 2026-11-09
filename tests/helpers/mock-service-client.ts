// Faz o createClient do supabase-js devolver o FakeSupabase atual (inclusive para o
// singleton interno de lib/server/supabase-admin). Importar ANTES das rotas.
import { vi } from "vitest"
import { FakeSupabase } from "./fake-supabase"

export const fake = { current: new FakeSupabase() }

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-fake"

vi.mock("@supabase/supabase-js", () => ({
  createClient: () =>
    new Proxy(
      {},
      {
        get(_target, key) {
          const value = (fake.current as unknown as Record<PropertyKey, unknown>)[key]
          return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(fake.current) : value
        },
      }
    ),
}))

import { supabase } from "./supabase"

export const defaultClients: string[] = [
  "Acme Corp",
  "TechLabs",
  "Banco Itaú",
  "Stark Industries",
  "Octho Core",
  "Cliente Interno",
]

// Catálogo da equipe: fonte é a tabela clients; o cache em memória atende as leituras síncronas da UI.
let cache: string[] = defaultClients

export function getStoredClients(): string[] {
  return cache
}

/** Carrega os clientes do Supabase. Se a tabela estiver vazia, semeia a lista padrão. */
export async function loadClients(): Promise<string[]> {
  if (!supabase) return cache
  const { data, error } = await supabase.from("clients").select("name").order("name")
  if (error) throw new Error(`Falha ao carregar clientes: ${error.message}`)
  if (!data || data.length === 0) {
    await supabase.from("clients").insert(defaultClients.map((name) => ({ name })))
    cache = [...defaultClients]
  } else {
    cache = data.map((r) => r.name as string)
  }
  return cache
}

/** Adiciona um cliente ao catálogo (ignora duplicados, sem diferenciar maiúsculas). */
export async function saveStoredClient(clientName: string): Promise<string[]> {
  const clean = clientName?.trim()
  if (!clean || cache.some((c) => c.toLowerCase() === clean.toLowerCase())) return cache
  cache = [...cache, clean].sort((a, b) => a.localeCompare(b, "pt-BR"))
  if (supabase) {
    const { error } = await supabase.from("clients").insert({ name: clean })
    // 23505 = já existe (criado por outra pessoa): não é erro
    if (error && error.code !== "23505") throw new Error(`Falha ao salvar cliente: ${error.message}`)
  }
  return cache
}

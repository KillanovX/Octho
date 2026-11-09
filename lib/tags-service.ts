import { supabase } from "./supabase"

export type TagItem = {
  id: string
  name: string
  color: string
  icon?: string
}

export const defaultTags: TagItem[] = [
  { id: "tag_1", name: "Design", color: "#8b5cf6", icon: "palette" },
  { id: "tag_2", name: "Frontend", color: "#3b82f6", icon: "code" },
  { id: "tag_3", name: "Backend", color: "#10b981", icon: "server" },
  { id: "tag_4", name: "Bug", color: "#ef4444", icon: "bug" },
  { id: "tag_5", name: "Conteúdo", color: "#f59e0b", icon: "file-text" },
  { id: "tag_6", name: "Pesquisa", color: "#14b8a6", icon: "search" },
]

// Catálogo da equipe: fonte é a tabela custom_tags; o cache em memória atende as leituras síncronas da UI.
let cache: TagItem[] = defaultTags

export function getStoredTags(): TagItem[] {
  return cache
}

/** Carrega as tags do Supabase. Se a tabela estiver vazia, semeia as tags padrão. */
export async function loadTags(): Promise<TagItem[]> {
  if (!supabase) return cache
  const { data, error } = await supabase.from("custom_tags").select("id, name, color, icon").order("created_at")
  if (error) throw new Error(`Falha ao carregar tags: ${error.message}`)
  if (!data || data.length === 0) {
    await supabase.from("custom_tags").upsert(defaultTags.map((t) => ({ ...t })))
    cache = defaultTags
  } else {
    cache = data.map((r) => ({ id: r.id, name: r.name, color: r.color, icon: r.icon || "tag" }))
  }
  return cache
}

/** Persiste a lista completa: cria/atualiza as presentes e remove as que saíram. */
export async function saveStoredTags(tags: TagItem[]): Promise<void> {
  const removed = cache.filter((old) => !tags.some((t) => t.id === old.id))
  cache = tags
  if (!supabase) return
  if (tags.length) {
    const { error } = await supabase
      .from("custom_tags")
      .upsert(tags.map((t) => ({ id: t.id, name: t.name, color: t.color, icon: t.icon || "tag" })))
    if (error) throw new Error(`Falha ao salvar tags: ${error.message}`)
  }
  if (removed.length) {
    const { error } = await supabase.from("custom_tags").delete().in("id", removed.map((t) => t.id))
    if (error) throw new Error(`Falha ao excluir tags: ${error.message}`)
  }
}

import { supabase, isSupabaseConfigured } from "./supabase"

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

const TAGS_STORAGE_KEY = "octho_custom_tags"

export function getStoredTags(): TagItem[] {
  if (typeof window === "undefined") return defaultTags
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY)
    if (!raw) return defaultTags
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultTags
  } catch {
    return defaultTags
  }
}

export function saveStoredTags(tags: TagItem[], profileId?: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
  } catch (e) {
    console.error("Error saving tags:", e)
  }

  const client = supabase
  if (isSupabaseConfigured() && client && profileId) {
    tags.forEach(async (tag) => {
      try {
        await client.from("custom_tags").upsert({
          id: tag.id,
          profile_id: profileId,
          user_id: profileId.length > 5 ? profileId : null,
          name: tag.name,
          color: tag.color,
          icon: tag.icon || "tag",
        })
      } catch (e) {
        console.error("Error upserting tag to Supabase:", e)
      }
    })
  }
}

export async function fetchTagsFromSupabase(profileId: string): Promise<TagItem[] | null> {
  if (!isSupabaseConfigured() || !supabase || !profileId) return null
  try {
    const { data, error } = await supabase
      .from("custom_tags")
      .select("*")
      .or(`user_id.eq.${profileId},profile_id.eq.${profileId}`)
      .order("created_at", { ascending: true })
    if (error || !data || data.length === 0) return null
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      icon: (row.icon as string) || "tag",
    }))
  } catch {
    return null
  }
}

export async function deleteTagFromSupabase(tagId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from("custom_tags").delete().eq("id", tagId)
  } catch (e) {
    console.error("Error deleting tag from Supabase:", e)
  }
}

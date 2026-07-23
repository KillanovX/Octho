export type TagItem = {
  id: string
  name: string
  color: string
  icon?: string // e.g. "palette" | "code" | "server" | "bug" | "file-text" | "search" | "tag" | "star" | "zap" | "shield" | "heart"
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

export function saveStoredTags(tags: TagItem[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags))
  } catch (e) {
    console.error("Error saving tags:", e)
  }
}

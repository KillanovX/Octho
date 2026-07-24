export const defaultClients: string[] = [
  "Acme Corp",
  "TechLabs",
  "Banco Itaú",
  "Stark Industries",
  "Octho Core",
  "Cliente Interno",
]

const CLIENTS_STORAGE_KEY = "octho_custom_clients"

export function getStoredClients(): string[] {
  if (typeof window === "undefined") return defaultClients
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY)
    if (!raw) return defaultClients
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultClients
  } catch {
    return defaultClients
  }
}

export function saveStoredClient(clientName: string): string[] {
  if (!clientName || !clientName.trim() || typeof window === "undefined") return getStoredClients()
  const cleanName = clientName.trim()
  const current = getStoredClients()
  if (current.some((c) => c.toLowerCase() === cleanName.toLowerCase())) return current
  const updated = [...current, cleanName]
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error("Error saving client:", e)
  }
  return updated
}

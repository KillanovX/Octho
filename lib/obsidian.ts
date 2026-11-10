// Link para abrir a nota do chamado/ata no Obsidian (URI scheme oficial).
const VAULT = process.env.NEXT_PUBLIC_OBSIDIAN_VAULT || "Brain"

export function obsidianUrl(vaultPath?: string | null): string | null {
  if (!vaultPath) return null
  const file = vaultPath.replace(/\.md$/i, "")
  return `obsidian://open?vault=${encodeURIComponent(VAULT)}&file=${encodeURIComponent(file)}`
}

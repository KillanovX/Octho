import type { ActivityEvent } from "./data"
import type { UserProfile } from "./context"

export type Actor = { name: string; initials: string; color: string; imageUrl?: string }

/** Resolve o autor de um evento pelo user_id (ou iniciais, em eventos antigos) contra a equipe. */
export function actorOf(event: Pick<ActivityEvent, "user" | "userColor" | "userId">, profiles: UserProfile[]): Actor {
  const p =
    (event.userId && profiles.find((x) => x.id === event.userId)) ||
    profiles.find((x) => x.avatar?.toUpperCase() === event.user?.toUpperCase())
  return {
    name: p?.name.split(" ")[0] && p ? p.name : event.user,
    initials: p?.avatar || event.user,
    color: p?.avatarColor || event.userColor,
    imageUrl: p?.imageUrl,
  }
}

/** Primeiro nome para textos curtos. */
export const firstName = (name: string) => name.split(" ")[0] || name

/** Código da tarefa no início do alvo de um evento ("OCT-301 — Título"). */
export const taskCodeFromTarget = (target: string) => target.match(/^(OCT-\d+)/)?.[1] ?? null

/** Foto do responsável da tarefa, pelo nome/e-mail/iniciais gravados na tarefa. */
export function assigneeImage(
  task: { assignee?: string; assigneeName?: string; assigneeAvatar?: string },
  profiles: UserProfile[]
): string | undefined {
  const keys = [task.assignee, task.assigneeName].filter(Boolean).map((v) => v!.toLowerCase())
  return profiles.find((p) => keys.includes(p.name.toLowerCase()) || keys.includes(p.email.toLowerCase()))?.imageUrl
}

import { UserProfile } from "./context"

export type RegisteredUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  avatar: string
  avatarColor: string
  createdAt: number
}

const STORAGE_KEY = "octho_registered_users"

export function getRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function registerUserAccount(name: string, email: string, password: string): { user?: UserProfile; error?: string } {
  const users = getRegisteredUsers()
  const normalizedEmail = email.trim().toLowerCase()

  if (users.some((u) => u.email === normalizedEmail)) {
    return { error: "Este e-mail já está cadastrado. Faça login para continuar." }
  }

  const initials = name
    .trim()
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "US"

  const newUser: RegisteredUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password, // In production, password hashing is handled server-side/Supabase
    avatar: initials,
    avatarColor: "#6366f1",
    createdAt: Date.now(),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...users, newUser]))
  } catch (e) {
    console.error("Storage error:", e)
  }

  const profile: UserProfile = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    avatar: newUser.avatar,
    avatarColor: newUser.avatarColor,
    verified: true,
  }

  return { user: profile }
}

export function authenticateLocalUser(email: string, password: string): { user?: UserProfile; error?: string } {
  const users = getRegisteredUsers()
  const normalizedEmail = email.trim().toLowerCase()

  const found = users.find((u) => u.email === normalizedEmail)

  if (!found) {
    return { error: "Nenhuma conta cadastrada com este e-mail. Por favor, crie uma conta primeiro." }
  }

  if (found.passwordHash !== password) {
    return { error: "Senha incorreta. Verifique os dados e tente novamente." }
  }

  const profile: UserProfile = {
    id: found.id,
    name: found.name,
    email: found.email,
    avatar: found.avatar,
    avatarColor: found.avatarColor,
    verified: true,
  }

  return { user: profile }
}

export function updateUserPassword(email: string, newPassword: string): { success: boolean; error?: string } {
  const users = getRegisteredUsers()
  const normalizedEmail = email.trim().toLowerCase()
  const index = users.findIndex((u) => u.email === normalizedEmail)

  if (index === -1) {
    const res = registerUserAccount(email.split("@")[0], email, newPassword)
    return res.user ? { success: true } : { success: false, error: res.error }
  }

  users[index].passwordHash = newPassword
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
    return { success: true }
  } catch {
    return { success: false, error: "Falha ao salvar a nova senha no navegador." }
  }
}

export function deleteUserAccount(email: string): { success: boolean; error?: string } {
  const users = getRegisteredUsers()
  const normalizedEmail = email.trim().toLowerCase()
  const filtered = users.filter((u) => u.email !== normalizedEmail)

  if (filtered.length === users.length) {
    return { success: false, error: "Usuário não encontrado." }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return { success: true }
  } catch {
    return { success: false, error: "Falha ao excluir o usuário." }
  }
}

export function updateUserProfile(email: string, updates: { name?: string }): { success: boolean; error?: string } {
  const users = getRegisteredUsers()
  const normalizedEmail = email.trim().toLowerCase()
  const index = users.findIndex((u) => u.email === normalizedEmail)

  if (index === -1) {
    return { success: false, error: "Usuário não encontrado." }
  }

  if (updates.name) {
    users[index].name = updates.name.trim()
    users[index].avatar = updates.name
      .trim()
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "US"
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
    return { success: true }
  } catch {
    return { success: false, error: "Falha ao salvar as alterações do usuário." }
  }
}

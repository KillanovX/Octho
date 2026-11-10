"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Lock,
  Search,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useApp, type UserRole } from "@/lib/context"
import { authFetch } from "@/lib/supabase"
import { useModal } from "@/lib/use-modal"

type AdminUser = {
  id: string
  name: string
  email: string
  avatar: string
  avatarColor: string
  role: UserRole
  createdAt: number
}

const roleLabel: Record<UserRole, string> = { admin: "Administrador", member: "Membro", pending: "Pendente" }

/** Chama /api/admin/users com o token da sessão; a rota confere o papel admin no servidor. */
async function adminCall(body?: Record<string, unknown>) {
  const res = await authFetch("/api/admin/users", body ? { method: "POST", body: JSON.stringify(body) } : {})
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
  return data
}

export function AdminView() {
  const { currentUser, refreshData } = useApp()
  const [usersList, setUsersList] = useState<AdminUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const addRef = useModal(isAddModalOpen, () => setIsAddModalOpen(false))
  const editRef = useModal(isEditModalOpen, () => setIsEditModalOpen(false))
  const passwordRef = useModal(isPasswordModalOpen, () => setIsPasswordModalOpen(false))
  const deleteRef = useModal(isDeleteModalOpen, () => setIsDeleteModalOpen(false))

  // Target User for Action
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  // Form Fields
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const reloadUsers = useCallback(async () => {
    try {
      const data = await adminCall()
      setUsersList(
        (data.users ?? []).map((u: Record<string, string>) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar || u.name.slice(0, 2).toUpperCase(),
          avatarColor: u.avatar_color || "#6366f1",
          role: (u.role as UserRole) || "pending",
          createdAt: u.created_at ? new Date(u.created_at).getTime() : 0,
        }))
      )
    } catch (e) {
      setErrorMsg((e as Error).message)
    }
  }, [])

  useEffect(() => {
    reloadUsers()
  }, [reloadUsers])

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  /** Executa uma ação de admin com feedback e recarrega a lista. */
  const run = async (body: Record<string, unknown>, success: string, after?: () => void) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      await adminCall(body)
      setSuccessMsg(success)
      after?.()
      await reloadUsers()
      refreshData()
    } catch (e) {
      setErrorMsg((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Actions ──────────────────────────────────────────────────

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (formPassword.length < 8) {
      setErrorMsg("A senha deve ter no mínimo 8 caracteres.")
      return
    }
    run(
      { action: "create", name: formName.trim(), email: formEmail.trim(), password: formPassword, role: "member" },
      `Usuário ${formName.trim()} cadastrado com sucesso.`,
      () => {
        setIsAddModalOpen(false)
        setFormName("")
        setFormEmail("")
        setFormPassword("")
      }
    )
  }

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !formName.trim()) return
    run({ action: "update-name", userId: selectedUser.id, name: formName.trim() }, `Nome de ${selectedUser.email} atualizado.`, () =>
      setIsEditModalOpen(false)
    )
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    if (formPassword.length < 8) {
      setErrorMsg("A nova senha deve ter no mínimo 8 caracteres.")
      return
    }
    run({ action: "change-password", userId: selectedUser.id, password: formPassword }, `Senha de ${selectedUser.email} alterada.`, () => {
      setIsPasswordModalOpen(false)
      setFormPassword("")
    })
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return
    run({ action: "delete", userId: selectedUser.id }, `Usuário ${selectedUser.email} excluído.`, () => setIsDeleteModalOpen(false))
  }

  const handleSetRole = (user: AdminUser, role: UserRole) => {
    run({ action: "set-role", userId: user.id, role }, `${user.name} agora é ${roleLabel[role].toLowerCase()}.`)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Administração de Usuários</h2>
          <p className="text-xs text-muted-foreground">
            Crie contas, aprove acessos pendentes, altere papéis, redefina senhas e remova usuários.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormName("")
            setFormEmail("")
            setFormPassword("")
            setErrorMsg(null)
            setIsAddModalOpen(true)
          }}
          className="flex items-center gap-2 rounded-lg h-9 px-3 text-xs font-medium"
        >
          <UserPlus className="size-4" />
          <span>Novo Usuário</span>
        </Button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-500">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Management Card */}
      <Card className="rounded-2xl border border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Lista de Usuários Cadastrados</CardTitle>
            <CardDescription>Total de {usersList.length} contas registradas na plataforma</CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <Button variant="outline" size="icon" onClick={reloadUsers} title="Atualizar Lista" className="size-9 rounded-xl">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Usuário</th>
                  <th className="px-6 py-3.5">Função</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      Nenhum usuário encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser.id
                    return (
                      <tr key={user.id || user.email} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 border border-border">
                              <AvatarFallback
                                className="font-bold text-xs text-white"
                                style={{ backgroundColor: user.avatarColor || "#6366f1" }}
                              >
                                {user.avatar || user.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <select
                            value={user.role}
                            disabled={loading || isSelf}
                            onChange={(e) => handleSetRole(user, e.target.value as UserRole)}
                            title={isSelf ? "Você não pode alterar o próprio papel" : "Alterar papel"}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-60"
                          >
                            <option value="admin">Administrador</option>
                            <option value="member">Membro</option>
                            <option value="pending">Pendente</option>
                          </select>
                        </td>

                        <td className="px-6 py-4">
                          {user.role === "pending" ? (
                            <Button size="sm" variant="outline" disabled={loading} onClick={() => handleSetRole(user, "member")} className="h-7 rounded-lg text-xs">
                              Aprovar acesso
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                              <span className="size-2 rounded-full bg-emerald-500" /> Ativo
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Name */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                              title="Editar Nome"
                              onClick={() => {
                                setSelectedUser(user)
                                setFormName(user.name)
                                setErrorMsg(null)
                                setIsEditModalOpen(true)
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>

                            {/* Reset Password */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg text-muted-foreground hover:text-primary"
                              title="Mudar Senha"
                              onClick={() => {
                                setSelectedUser(user)
                                setFormPassword("")
                                setErrorMsg(null)
                                setIsPasswordModalOpen(true)
                              }}
                            >
                              <KeyRound className="size-4" />
                            </Button>

                            {/* Excluir (não permitido para a própria conta) */}
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                                title="Excluir Usuário"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setErrorMsg(null)
                                  setIsDeleteModalOpen(true)
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal 1: Adicionar Usuário ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setIsAddModalOpen(false)}>
          <div ref={addRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Novo usuário" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <UserPlus className="size-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Novo Usuário</h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 h-11">
                  <User className="size-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome do usuário"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="border-0 shadow-none focus-visible:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 h-11">
                  <Mail className="size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="usuario@email.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="border-0 shadow-none focus-visible:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Senha de Acesso</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 h-11">
                  <Lock className="size-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={8}
                    className="border-0 shadow-none focus-visible:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="rounded-xl">
                  {loading ? "Cadastrando..." : "Cadastrar Usuário"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Editar Nome de Usuário ── */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setIsEditModalOpen(false)}>
          <div ref={editRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Editar usuário" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Pencil className="size-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Editar Usuário</h3>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">E-mail (Não editável)</label>
                <Input value={selectedUser.email} disabled className="bg-muted/50 rounded-xl text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 h-11">
                  <User className="size-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome completo"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="border-0 shadow-none focus-visible:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="rounded-xl">
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Mudar Senha do Usuário ── */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setIsPasswordModalOpen(false)}>
          <div ref={passwordRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Mudar senha" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <KeyRound className="size-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Mudar Senha de {selectedUser.name}</h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Informe a nova senha de acesso para a conta <span className="font-semibold text-foreground">{selectedUser.email}</span>.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nova Senha</label>
                <div className="flex items-center gap-2 border rounded-xl px-3 h-11">
                  <Lock className="size-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={8}
                    className="border-0 shadow-none focus-visible:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="rounded-xl">
                  {loading ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 4: Excluir Usuário ── */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setIsDeleteModalOpen(false)}>
          <div ref={deleteRef} role="dialog" aria-modal="true" tabIndex={-1} aria-label="Excluir usuário" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 outline-none animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-border pb-3 text-destructive">
              <Trash2 className="size-5" />
              <h3 className="text-lg font-bold">Excluir Usuário</h3>
            </div>

            <p className="text-sm text-foreground">
              Tem certeza que deseja excluir a conta de <strong className="text-destructive">{selectedUser.name}</strong> ({selectedUser.email})?
            </p>
            <p className="text-xs text-muted-foreground">
              Esta ação removerá as credenciais e o acesso deste usuário na plataforma.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={loading} className="rounded-xl">
                {loading ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
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
import {
  getRegisteredUsers,
  registerUserAccount,
  updateUserPassword,
  updateUserProfile,
  deleteUserAccount,
  type RegisteredUser,
} from "@/lib/auth-service"
import { useApp } from "@/lib/context"

import { getAllSupabaseProfiles } from "@/lib/supabase"

export function AdminView() {
  const { currentUser, profilesList, addProfile } = useApp()
  const [usersList, setUsersList] = useState<RegisteredUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Feedback Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Target User for Action
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null)

  // Form Fields
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPassword, setFormPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const reloadUsers = async () => {
    const localUsers = getRegisteredUsers()
    const map = new Map<string, RegisteredUser>()

    // 1. Add Super Admin
    map.set("flavio.adsv@gmail.com", {
      id: "usr_super_admin",
      name: currentUser.email?.toLowerCase() === "flavio.adsv@gmail.com" ? currentUser.name || "Flavio Alves" : "Flavio Alves",
      email: "flavio.adsv@gmail.com",
      passwordHash: "••••••••",
      avatar: "FA",
      avatarColor: "#0F6FFF",
      createdAt: Date.now(),
    })

    // 2. Add local storage users
    localUsers.forEach((u) => {
      if (u.email) map.set(u.email.toLowerCase(), u)
    })

    // 3. Add profilesList from context
    profilesList.forEach((p) => {
      if (p.email && !map.has(p.email.toLowerCase())) {
        map.set(p.email.toLowerCase(), {
          id: p.id,
          name: p.name,
          email: p.email,
          passwordHash: "••••••••",
          avatar: p.avatar,
          avatarColor: p.avatarColor || "#6366f1",
          createdAt: Date.now(),
        })
      }
    })

    // 4. Fetch Supabase profiles if configured
    const supaProfiles = await getAllSupabaseProfiles()
    supaProfiles.forEach((sp: any) => {
      const email = sp.email || sp.name
      if (email && email.includes("@") && !map.has(email.toLowerCase())) {
        map.set(email.toLowerCase(), {
          id: sp.id,
          name: sp.name || email.split("@")[0],
          email: email.toLowerCase(),
          passwordHash: "••••••••",
          avatar: sp.avatar || (sp.name ? sp.name.slice(0, 2).toUpperCase() : "US"),
          avatarColor: sp.avatar_color || "#6366f1",
          createdAt: sp.created_at ? new Date(sp.created_at).getTime() : Date.now(),
        })
      }
    })

    setUsersList(Array.from(map.values()))
  }

  useEffect(() => {
    reloadUsers()
  }, [])

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ── Actions ──────────────────────────────────────────────────

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setErrorMsg("Preencha todos os campos obrigatórios.")
      return
    }

    if (formPassword.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 caracteres.")
      return
    }

    setLoading(true)
    const res = registerUserAccount(formName.trim(), formEmail.trim(), formPassword.trim())
    setLoading(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else if (res.user) {
      addProfile(res.user)
      setSuccessMsg(`Usuário ${res.user.name} cadastrado com sucesso!`)
      setIsAddModalOpen(false)
      setFormName("")
      setFormEmail("")
      setFormPassword("")
      reloadUsers()
    }
  }

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !formName.trim()) return
    setErrorMsg(null)
    setSuccessMsg(null)

    setLoading(true)
    const res = updateUserProfile(selectedUser.email, { name: formName.trim() })
    setLoading(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg(`Dados do usuário ${selectedUser.email} atualizados!`)
      setIsEditModalOpen(false)
      reloadUsers()
    }
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !formPassword.trim()) return
    setErrorMsg(null)
    setSuccessMsg(null)

    if (formPassword.length < 6) {
      setErrorMsg("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }

    setLoading(true)
    const res = updateUserPassword(selectedUser.email, formPassword.trim())
    setLoading(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg(`Senha de ${selectedUser.email} alterada com sucesso!`)
      setIsPasswordModalOpen(false)
      setFormPassword("")
      reloadUsers()
    }
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return
    if (selectedUser.email.toLowerCase() === "flavio.adsv@gmail.com") {
      setErrorMsg("Não é possível excluir a conta do Super Admin.")
      setIsDeleteModalOpen(false)
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    setLoading(true)
    const res = deleteUserAccount(selectedUser.email)
    setLoading(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg(`Usuário ${selectedUser.email} excluído com sucesso.`)
      setIsDeleteModalOpen(false)
      reloadUsers()
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Administração de Usuários</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              Super Admin
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Painel exclusivo de controle central para adicionar, editar, redefinir senhas e excluir usuários do sistema.
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
          className="flex items-center gap-2 rounded-xl h-11 px-4 font-medium"
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
                    const isSuper = user.email.toLowerCase() === "flavio.adsv@gmail.com"
                    return (
                      <tr key={user.id || user.email} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 border border-border">
                              <AvatarFallback
                                className="font-bold text-xs text-white"
                                style={{ backgroundColor: isSuper ? "#0F6FFF" : user.avatarColor || "#6366f1" }}
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
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/20">
                              <ShieldCheck className="size-3.5" /> Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                              Usuário
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Ativo
                          </span>
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

                            {/* Delete User (Disabled for Super Admin) */}
                            {!isSuper && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5">
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
                    placeholder="Mínimo 6 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={6}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5">
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
                    placeholder="Mínimo 6 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={6}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5">
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
  )
}

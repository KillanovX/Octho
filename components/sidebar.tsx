"use client"

import { useState } from "react"
import Image from "next/image"
import {
  LayoutDashboard,
  Inbox,
  CircleUser,
  KanbanSquare,
  Layers,
  Clock,
  BarChart3,
  Settings,
  Search,
  ChevronDown,
  ShieldCheck,
  VerifiedIcon,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp, type ViewId } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type NavDef = { name: string; icon: typeof Inbox; view: ViewId; badge?: string }

const nav: NavDef[] = [
  { name: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
  { name: "Caixa de entrada", icon: Inbox, view: "inbox" },
  { name: "Minhas tarefas", icon: CircleUser, view: "my-tasks" },
]

const workspace: NavDef[] = [
  { name: "Quadro Kanban", icon: KanbanSquare, view: "kanban" },
  { name: "Projetos", icon: Layers, view: "projects" },
  { name: "Registro de horas", icon: Clock, view: "time-log" },
  { name: "Relatórios", icon: BarChart3, view: "reports" },
]

export function Sidebar({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const { activeView, setActiveView, currentUser, setCurrentUser, profilesList, unreadCount, openAuthModal, signOut } = useApp()
  const [showSwitcher, setShowSwitcher] = useState(false)

  const userName = currentUser?.name || "Usuário"
  const userEmail = currentUser?.email || ""
  const userAvatar = currentUser?.avatar || "US"
  const avatarColor = currentUser?.avatarColor || "#6366f1"

  const isSuperAdmin = currentUser?.email?.toLowerCase() === "flavio.adsv@gmail.com"

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
      {/* Workspace switcher */}
      <button className="mb-5 flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-all duration-150 hover:bg-sidebar-accent group">
        <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0050D7] via-[#0F6FFF] to-[#5EC9FF] p-1.5 shadow-md shrink-0 transition-transform duration-200 group-hover:scale-105">
          <Image
            src="/branding/symbol/octho-symbol-white-512.png"
            alt="Octho Symbol"
            width={24}
            height={24}
            className="object-contain"
          />
        </span>
        <span className="flex-1 text-sm font-bold text-sidebar-foreground">Octho</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-hover:text-sidebar-foreground" />
      </button>

      {/* Search */}
      <button
        onClick={onOpenSearch}
        className="mb-5 flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-background/60 px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:border-sidebar-ring/40 group"
      >
        <Search className="size-4 shrink-0 transition-colors group-hover:text-primary" />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground bg-muted/60">⌘K</kbd>
      </button>

      <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">
        {nav.map((item) => (
          <NavItem
            key={item.name}
            icon={item.icon}
            label={item.name}
            badge={item.view === "inbox" && unreadCount > 0 ? String(unreadCount) : undefined}
            active={activeView === item.view}
            onClick={() => setActiveView(item.view)}
          />
        ))}
      </nav>

      <p className="mb-1.5 mt-6 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Workspace
      </p>
      <nav className="flex flex-col gap-0.5" aria-label="Workspace">
        {workspace.map((item) => (
          <NavItem
            key={item.name}
            icon={item.icon}
            label={item.name}
            active={activeView === item.view}
            onClick={() => setActiveView(item.view)}
          />
        ))}
        {isSuperAdmin && (
          <NavItem
            icon={ShieldCheck}
            label="Administração"
            badge="Admin"
            active={activeView === "admin"}
            onClick={() => setActiveView("admin")}
          />
        )}
      </nav>

      <div className="mt-auto relative">
        <NavItem
          icon={Settings}
          label="Configurações"
          active={activeView === "settings"}
          onClick={() => setActiveView("settings")}
        />

        {/* User Switcher Popover */}
        {showSwitcher && (
          <div className="absolute bottom-14 left-0 right-0 z-50 mb-1 rounded-xl border border-border bg-card p-2 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {profilesList.length > 1 && (
              <>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Seus Perfis
                </p>
                <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
                  {profilesList.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u)
                        setShowSwitcher(false)
                      }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-all duration-150 hover:bg-sidebar-accent",
                        currentUser.id === u.id && "bg-sidebar-accent font-medium"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-6">
                          {u.imageUrl && <AvatarImage src={u.imageUrl} alt={u.name} />}
                          <AvatarFallback style={{ backgroundColor: u.avatarColor, color: "#fff" }} className="text-[10px] font-semibold">
                            {u.avatar}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate font-medium text-foreground">{u.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{u.role || u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="my-1.5 border-t border-border" />
              </>
            )}

            <button
              onClick={() => {
                signOut()
                setShowSwitcher(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-3.5" />
              <span>Sair da conta</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-all duration-150 hover:bg-sidebar-accent group"
        >
          <div className="relative shrink-0">
            <Avatar className="size-7 transition-transform duration-200 group-hover:scale-105">
              {currentUser?.imageUrl && <AvatarImage src={currentUser.imageUrl} alt={userName} />}
              <AvatarFallback style={{ backgroundColor: avatarColor, color: "#fff" }} className="text-xs font-semibold">
                {userAvatar}
              </AvatarFallback>
            </Avatar>
            {currentUser?.verified && (
              <span className="absolute -right-0.5 -bottom-0.5 flex size-2.5 items-center justify-center rounded-full bg-sidebar">
                <VerifiedIcon className="size-full fill-blue-500 text-white" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
            style={{ transform: showSwitcher ? "rotate(180deg)" : "none" }}
          />
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: typeof Inbox
  label: string
  badge?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-all duration-150",
        active
          ? "nav-item-active bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("size-4 shrink-0 transition-colors duration-150", active && "text-primary")} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums min-w-[18px] text-center",
          badge === "Admin"
            ? "bg-primary/15 text-primary"
            : "bg-destructive text-white"
        )}>
          {badge}
        </span>
      )}
    </button>
  )
}

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
  UserPlus,
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
      <button className="mb-6 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
        <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#0050D7] via-[#0F6FFF] to-[#5EC9FF] p-1 shadow-sm shrink-0">
          <Image
            src="/branding/symbol/octho-symbol-white-512.png"
            alt="Octho Symbol"
            width={24}
            height={24}
            className="object-contain"
          />
        </span>
        <span className="flex-1 text-sm font-bold text-sidebar-foreground">Octho</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {/* Search */}
      <button
        onClick={onOpenSearch}
        className="mb-4 flex items-center gap-2 rounded-md border border-sidebar-border bg-background/50 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent"
      >
        <Search className="size-4" />
        <span>Buscar</span>
        <kbd className="ml-auto rounded border border-border px-1.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      <nav className="flex flex-col gap-0.5">
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

      <p className="mb-1 mt-6 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Workspace
      </p>
      <nav className="flex flex-col gap-0.5">
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
          <div className="absolute bottom-12 left-0 right-0 z-50 mb-2 rounded-lg border border-border bg-card p-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
            {profilesList.length > 1 && (
              <>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Seus Perfis
                </p>
                <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                  {profilesList.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u)
                        setShowSwitcher(false)
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-sidebar-accent",
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
                <div className="my-1 border-t border-border" />
              </>
            )}

            <button
              onClick={() => {
                signOut()
                setShowSwitcher(false)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-semibold text-destructive transition-colors hover:bg-sidebar-accent"
            >
              <LogOut className="size-3.5" />
              <span>Sair da conta</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        >
          <div className="relative shrink-0">
            <Avatar className="size-7">
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
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">{badge}</span>
      )}
    </button>
  )
}

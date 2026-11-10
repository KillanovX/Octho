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
  Video,
  Camera,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useApp, type ViewId } from "@/lib/context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { AvatarSelectorModal } from "@/components/avatar-selector-modal"
import { useModal } from "@/lib/use-modal"

type NavDef = { name: string; icon: typeof Inbox; view: ViewId; badge?: string }

const nav: NavDef[] = [
  { name: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
  { name: "Caixa de entrada", icon: Inbox, view: "inbox" },
  { name: "Minhas tarefas", icon: CircleUser, view: "my-tasks" },
]

const workspace: NavDef[] = [
  { name: "Quadro Kanban", icon: KanbanSquare, view: "kanban" },
  { name: "Projetos", icon: Layers, view: "projects" },
  { name: "Reuniões", icon: Video, view: "meetings" },
  { name: "Registro de horas", icon: Clock, view: "time-log" },
  { name: "Relatórios", icon: BarChart3, view: "reports" },
]

type SidebarProps = {
  onOpenSearch?: () => void
  /** Drawer no mobile (< lg) */
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ onOpenSearch, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { activeView, setActiveView, currentUser, unreadCount, signOut, isAdmin } = useApp()
  const [showSwitcher, setShowSwitcher] = useState(false)

  const userName = currentUser?.name || "Usuário"
  const userEmail = currentUser?.email || ""
  const userAvatar = currentUser?.avatar || "US"
  const avatarColor = currentUser?.avatarColor || "#6366f1"

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const drawerRef = useModal<HTMLElement>(mobileOpen, () => onMobileClose?.())

  // Navegar fecha o drawer no mobile
  const go = (view: ViewId) => {
    setActiveView(view)
    onMobileClose?.()
  }

  const panel = (
    <>
      {/* Workspace switcher */}
      <div className="mb-5 flex items-center gap-2.5 rounded-xl px-2 py-2 group">
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
        {mobileOpen && (
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <button
        onClick={() => {
          onMobileClose?.()
          onOpenSearch?.()
        }}
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
            onClick={() => go(item.view)}
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
            onClick={() => go(item.view)}
          />
        ))}
        {isAdmin && (
          <NavItem
            icon={ShieldCheck}
            label="Administração"
            badge="Admin"
            active={activeView === "admin"}
            onClick={() => go("admin")}
          />
        )}
      </nav>

      <div className="mt-auto relative">
        <NavItem
          icon={Settings}
          label="Configurações"
          active={activeView === "settings"}
          onClick={() => go("settings")}
        />

        {/* Menu da conta */}
        {showSwitcher && (
          <div className="absolute bottom-14 left-0 right-0 z-50 mb-1 rounded-xl border border-border bg-card p-2 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-2 duration-200">

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
          <div
            className="relative shrink-0 cursor-pointer"
            title="Clique para escolher avatar"
            onClick={(e) => {
              e.stopPropagation()
              setIsAvatarModalOpen(true)
            }}
          >
            <Avatar className="size-7 hover:ring-2 hover:ring-primary/40 transition-all">
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

    </>
  )

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex" aria-label="Menu lateral">
        {panel}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" aria-hidden="true" />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-sidebar px-3 py-4 shadow-2xl outline-none animate-in slide-in-from-left duration-250 ease-out"
          >
            {panel}
          </aside>
        </div>
      )}

      <AvatarSelectorModal open={isAvatarModalOpen} onClose={() => setIsAvatarModalOpen(false)} />
    </>
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
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
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

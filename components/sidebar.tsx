"use client"

import { useState } from "react"
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
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { name: "Dashboard", icon: LayoutDashboard, active: true },
  { name: "Caixa de entrada", icon: Inbox, badge: "8" },
  { name: "Minhas tarefas", icon: CircleUser },
]

const workspace = [
  { name: "Quadro Kanban", icon: KanbanSquare },
  { name: "Projetos", icon: Layers },
  { name: "Registro de horas", icon: Clock },
  { name: "Relatórios", icon: BarChart3 },
]

export function Sidebar() {
  const [active, setActive] = useState("Dashboard")

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
      {/* Workspace switcher */}
      <button className="mb-6 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="size-4" />
        </span>
        <span className="flex-1 text-sm font-semibold text-sidebar-foreground">Fluxo</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {/* Search */}
      <button className="mb-4 flex items-center gap-2 rounded-md border border-sidebar-border bg-background/50 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent">
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
            badge={item.badge}
            active={active === item.name}
            onClick={() => setActive(item.name)}
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
            active={active === item.name}
            onClick={() => setActive(item.name)}
          />
        ))}
      </nav>

      <div className="mt-auto">
        <NavItem icon={Settings} label="Configurações" active={false} onClick={() => {}} />
        <div className="mt-3 flex items-center gap-2 rounded-md px-2 py-1.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-chart-4 text-xs font-semibold text-white">
            MA
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Marina Alves</p>
            <p className="truncate text-xs text-muted-foreground">marina@fluxo.app</p>
          </div>
        </div>
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

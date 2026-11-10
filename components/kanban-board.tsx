"use client"

import { useState, DragEvent } from "react"
import { Plus, Clock, SignalHigh, SignalMedium, SignalLow, AlertTriangle, Minus, GripVertical, Filter, Tag as TagIcon, Building2, ListChecks, Search, Play, Pause, CalendarClock } from "lucide-react"
import { columns, type Priority, type Task, type ColumnId } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"
import { TaskModal } from "@/components/task-modal"
import { TaskDetailsModal } from "@/components/task-details-modal"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, type SelectOption } from "@/components/ui/select"
import { tagIconMap } from "@/components/tag-manager-modal"
import { assigneeImage } from "@/lib/people"
import { byPosition } from "@/lib/derive"
import { AnimatePresence, motion, MotionConfig } from "motion/react"

const priorityConfig: Record<Priority, { icon: typeof SignalHigh; className: string; label: string }> = {
  urgent: { icon: AlertTriangle, className: "text-destructive", label: "Urgente" },
  high: { icon: SignalHigh, className: "text-chart-5", label: "Alta" },
  medium: { icon: SignalMedium, className: "text-chart-3", label: "Média" },
  low: { icon: SignalLow, className: "text-chart-2", label: "Baixa" },
  none: { icon: Minus, className: "text-muted-foreground", label: "Sem" },
}

const priorityFilterOptions: SelectOption<string>[] = [
  { value: "all", label: "Todas as prioridades", icon: <Filter className="size-3.5 text-muted-foreground shrink-0" /> },
  { value: "urgent", label: "Urgente", icon: <AlertTriangle className="size-3.5 text-destructive shrink-0" /> },
  { value: "high", label: "Alta", icon: <SignalHigh className="size-3.5 text-chart-5 shrink-0" /> },
  { value: "medium", label: "Média", icon: <SignalMedium className="size-3.5 text-chart-3 shrink-0" /> },
  { value: "low", label: "Baixa", icon: <SignalLow className="size-3.5 text-chart-2 shrink-0" /> },
  { value: "none", label: "Sem prioridade", icon: <Minus className="size-3.5 text-muted-foreground shrink-0" /> },
]


const columnDotColors: Record<string, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-chart-2",
  in_progress: "bg-chart-3",
  done: "bg-chart-4",
}

export function KanbanBoard({ fullWidth }: { fullWidth?: boolean }) {
  const { userData, moveTask, isInitialLoading } = useApp()
  const { tasks } = userData

  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [query, setQuery] = useState("")
  // card que acabou de entrar em "Concluído" (animação de conclusão)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)
  const clientOptions: SelectOption<string>[] = [
    { value: "all", label: "Todos os clientes", icon: <Building2 className="size-3.5 text-muted-foreground shrink-0" /> },
    ...[...new Set(tasks.map((t) => t.client).filter((c): c is string => !!c))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((c) => ({ value: c, label: c })),
  ]
  // No mobile (< md) o quadro vira lista: uma coluna por vez, escolhida nas abas
  const [mobileColumn, setMobileColumn] = useState<ColumnId>("in_progress")
  const q = query.trim().toLowerCase().replace(/^#/, "")
  const visible = (t: Task) =>
    (priorityFilter === "all" || t.priority === priorityFilter) &&
    (clientFilter === "all" || t.client === clientFilter) &&
    (!q || [t.code, t.title, t.externalRef, t.client].some((v) => v?.toLowerCase().includes(q)))
  const filtersActive = priorityFilter !== "all" || clientFilter !== "all" || !!q
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [createColumn, setCreateColumn] = useState<ColumnId | null>(null)
  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)

  const handleDragStart = (e: DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId)
    e.dataTransfer.effectAllowed = "move"
    setDraggingTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDragOverCol(null)
    setDragOverCardId(null)
  }

  const handleDragOverColumn = (e: DragEvent, colId: ColumnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(colId)
  }

  const handleDragLeaveColumn = () => {
    setDragOverCol(null)
    setDragOverCardId(null)
  }

  const celebrate = (taskId: string, colId: ColumnId) => {
    const before = tasks.find((t) => t.id === taskId)
    if (colId === "done" && before && before.column !== "done") {
      setJustCompleted(taskId)
      setTimeout(() => setJustCompleted((cur) => (cur === taskId ? null : cur)), 1200)
    }
  }

  const handleDropColumn = (e: DragEvent, colId: ColumnId) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId) {
      celebrate(taskId, colId)
      moveTask(taskId, colId)
    }
    setDragOverCol(null)
    setDragOverCardId(null)
    setDraggingTaskId(null)
  }

  const handleDragOverCard = (e: DragEvent, overTaskId: string, colId: ColumnId) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDragOverCol(colId)
    setDragOverCardId(overTaskId)
  }

  const handleDropCard = (e: DragEvent, overTaskId: string, colId: ColumnId) => {
    e.preventDefault()
    e.stopPropagation()
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId && taskId !== overTaskId) {
      celebrate(taskId, colId)
      moveTask(taskId, colId, overTaskId)
    }
    setDragOverCol(null)
    setDragOverCardId(null)
    setDraggingTaskId(null)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("rounded-xl border border-border bg-card overflow-hidden", fullWidth ? "flex-1" : "")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5 bg-card/80">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">Quadro Kanban</h2>
            <p className="text-xs text-muted-foreground">
              <span className="hidden md:inline">Arraste os cards entre as colunas para atualizar o status</span>
              <span className="md:hidden">Toque em um card para ver detalhes e mudar o status</span>
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chamado, código ou título"
                aria-label="Filtrar por chamado, código ou título"
                className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring sm:w-52"
              />
            </div>
            <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
              <Select value={clientFilter} onChange={setClientFilter} options={clientOptions} triggerClassName="h-8 text-xs px-2.5 py-1" />
            </div>
            <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
              <Select value={priorityFilter} onChange={setPriorityFilter} options={priorityFilterOptions} triggerClassName="h-8 text-xs px-2.5 py-1" />
            </div>
            {filtersActive && (
              <button
                onClick={() => {
                  setQuery("")
                  setClientFilter("all")
                  setPriorityFilter("all")
                }}
                className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground animate-in fade-in duration-150"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Abas de coluna (somente mobile) */}
        <div role="tablist" aria-label="Colunas do quadro" className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3 md:hidden">
          {columns.map((col) => {
            const count = tasks.filter((t) => t.column === col.id && visible(t)).length
            const selected = mobileColumn === col.id
            return (
              <button
                key={col.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setMobileColumn(col.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors",
                  selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("size-1.5 rounded-full", columnDotColors[col.id])} aria-hidden="true" />
                {col.name}
                <span className="rounded-md bg-muted px-1 text-[10px] tabular-nums">{count}</span>
                {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <div className="flex gap-4 p-4 md:overflow-x-auto">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id && visible(t)).sort(byPosition)
            const colHours = colTasks.reduce((acc, t) => acc + t.hoursLogged, 0)
            const isDragOver = dragOverCol === col.id

            return (
              <section
                key={col.id}
                aria-label={`${col.name}: ${colTasks.length} tarefas`}
                className={cn(
                  "min-w-0 flex-1 flex-col md:flex md:min-w-[16.5rem] md:basis-0",
                  mobileColumn === col.id ? "flex animate-in fade-in duration-200 md:animate-none" : "hidden"
                )}
              >
                <div className="mb-3 hidden items-center gap-2 px-1 md:flex">
                  <span className={cn("size-2 rounded-full shrink-0 transition-transform duration-200", columnDotColors[col.id] || "bg-muted-foreground")} />
                  <span className="text-sm font-semibold text-card-foreground">{col.name}</span>
                  <span className="rounded-md bg-muted px-1.5 text-xs font-bold text-muted-foreground">
                    {colTasks.length}
                  </span>
                  {colHours > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {colHours}h
                    </span>
                  )}
                  <button
                    onClick={() => setCreateColumn(col.id)}
                    className="rounded-lg p-1 text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground hover:scale-110"
                    title={`Adicionar tarefa em ${col.name}`}
                    aria-label={`Adicionar tarefa em ${col.name}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div
                  className={cn(
                    "flex flex-col gap-2 min-h-[120px] rounded-xl p-1.5 transition-all duration-200",
                    isDragOver
                      ? "bg-primary/10 ring-2 ring-primary/40 ring-offset-1"
                      : "bg-muted/30"
                  )}
                  onDragOver={(e) => handleDragOverColumn(e, col.id)}
                  onDragLeave={handleDragLeaveColumn}
                  onDrop={(e) => handleDropColumn(e, col.id)}
                >
                  {isInitialLoading ? (
                    <CardSkeletons />
                  ) : colTasks.length > 0 ? (
                    <AnimatePresence initial={false}>
                    {colTasks.map((t) => (
                      <motion.div
                        key={t.id}
                        layout="position"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                      >
                      <TaskCard
                        task={t}
                        justCompleted={justCompleted === t.id}
                        onEdit={() => setEditTask(t)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOverCard={handleDragOverCard}
                        onDropCard={handleDropCard}
                        isDragOver={dragOverCardId === t.id}
                        isDragging={draggingTaskId === t.id}
                      />
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl transition-colors">
                      {filtersActive && !isDragOver ? (
                        <span>Nenhuma tarefa com esses filtros</span>
                      ) : isDragOver ? (
                        <span className="text-primary font-medium animate-in fade-in">Soltar aqui</span>
                      ) : (
                        <>
                          <span className="hidden md:inline">Arraste tarefas aqui</span>
                          <span className="md:hidden">Nenhuma tarefa nesta coluna</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <TaskDetailsModal
        open={!!editTask}
        onClose={() => setEditTask(null)}
        task={editTask ? (tasks.find((t) => t.id === editTask.id) ?? editTask) : null}
      />
      <TaskModal
        open={!!createColumn}
        onClose={() => setCreateColumn(null)}
        defaultColumn={createColumn ?? undefined}
      />
    </MotionConfig>
  )
}

function TaskCard({
  task,
  justCompleted,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDropCard,
  isDragOver,
  isDragging,
}: {
  task: Task
  justCompleted?: boolean
  onEdit: () => void
  onDragStart: (e: DragEvent, taskId: string) => void
  onDragEnd: () => void
  onDragOverCard: (e: DragEvent, overTaskId: string, colId: ColumnId) => void
  onDropCard: (e: DragEvent, overTaskId: string, colId: ColumnId) => void
  isDragOver: boolean
  isDragging: boolean
}) {
  const p = priorityConfig[task.priority]
  const { profilesList, timer, startTimer, setTimerRunning, recentlyChangedTaskIds } = useApp()
  const timerHere = timer.taskId === task.id
  const changedRemotely = recentlyChangedTaskIds.has(task.id)

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOverCard(e, task.id, task.column)}
      onDrop={(e) => onDropCard(e, task.id, task.column)}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onEdit()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${task.code}: ${task.title}`}
      className={cn(
        "group cursor-pointer rounded-xl border border-border bg-background p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-black/8",
        "active:translate-y-0 active:shadow-none",
        isDragOver && "border-t-2 border-t-primary",
        isDragging && "opacity-40 scale-95 rotate-1",
        timerHere && "border-primary/50",
        changedRemotely && "animate-[remoteFlash_2.4s_ease-out]",
        justCompleted && "animate-[donePop_900ms_ease-out]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="size-3 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 shrink-0 cursor-grab" />
          <span className="font-mono text-[11px] text-muted-foreground shrink-0 bg-muted/60 px-1.5 py-0.5 rounded-md">
            {task.code}
          </span>
          {task.column !== "done" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (timerHere) setTimerRunning(!timer.running)
                else startTimer(task.id, task.code)
              }}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={timerHere ? (timer.running ? "Pausar timer" : "Retomar timer") : `Iniciar timer em ${task.code}`}
              title={timerHere ? (timer.running ? "Pausar timer" : "Retomar timer") : timer.taskId ? `Trocar o timer de ${timer.taskCode} para esta tarefa` : "Iniciar timer"}
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full transition-all duration-150",
                timerHere
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground opacity-0 hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
              )}
            >
              {timerHere && timer.running ? <Pause className="size-2.5 fill-current" /> : <Play className="size-2.5 fill-current" />}
            </button>
          )}
          {timerHere && timer.running && <span className="size-1.5 shrink-0 rounded-full bg-primary timer-pulse" aria-hidden="true" />}
        </div>

        {/* Responsável */}
        {task.assigneeName || task.assignee ? (
          <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 rounded-full pl-1 pr-2 py-0.5 border border-border/50 transition-colors duration-150 group-hover:border-border">
            <Avatar className="size-5 shrink-0 border border-border">
              {assigneeImage(task, profilesList) && <AvatarImage src={assigneeImage(task, profilesList)} alt="" />}
              <AvatarFallback style={{ backgroundColor: task.assigneeColor || "#6366f1", color: "#fff" }} className="text-[9px] font-bold">
                {task.assigneeAvatar || (task.assigneeName || task.assignee).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] font-semibold text-foreground truncate max-w-[110px]">{task.assigneeName || task.assignee}</span>
          </div>
        ) : (
          <span className="shrink-0 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            Sem responsável
          </span>
        )}
      </div>

      <p className="mt-2.5 text-sm leading-snug text-card-foreground text-pretty font-medium">{task.title}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {task.priority !== "none" && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold text-foreground",
              task.priority === "urgent" ? "border-destructive/40 bg-destructive/10" : "border-border/80 bg-muted/50"
            )}
            title={`Prioridade ${p.label.toLowerCase()}`}
          >
            <p.icon className={cn("size-3 shrink-0", p.className)} aria-hidden="true" />
            <span className="sr-only">Prioridade </span>
            {p.label}
          </span>
        )}
        {task.externalRef && (
          <span
            className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary"
            title={task.vaultPath ? `Chamado no vault: ${task.vaultPath}` : "Chamado ITSM"}
          >
            #{task.externalRef}
          </span>
        )}
        {task.client && (
          <span className="flex items-center gap-1 rounded-full border border-border/80 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground bg-muted/50">
            <Building2 className="size-3 text-primary shrink-0" />
            <span className="truncate max-w-[100px]">{task.client}</span>
          </span>
        )}
        {task.labels.map((l) => {
          const TagIconComp = tagIconMap[l.icon || "tag"] || TagIcon
          return (
            <span
              key={l.name}
              className="flex items-center gap-1 rounded-full border border-border/80 px-2 py-0.5 text-[11px] font-medium text-foreground bg-card shadow-xs transition-all duration-150 hover:border-border"
            >
              <span className="flex items-center justify-center size-3 rounded-full" style={{ backgroundColor: l.color }}>
                {TagIconComp && <TagIconComp className="size-2 text-white" />}
              </span>
              {l.name}
            </span>
          )
        })}
        <CardActionsProgress task={task} />
        <CardDue task={task} />
        {(task.hoursLogged > 0 || task.estimate > 0) && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] tabular-nums text-muted-foreground font-medium" title="Horas registradas / estimadas">
            <Clock className="size-3" />
            {task.hoursLogged}/{task.estimate}h
          </span>
        )}
      </div>
    </article>
  )
}

/** Progresso das ações (checkpoints acionáveis; histórico não conta). */
function CardActionsProgress({ task }: { task: Task }) {
  const actions = (task.checkpoints ?? []).filter((c) => c.kind !== "log")
  if (actions.length === 0) return null
  const done = actions.filter((c) => c.completed).length
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[11px] tabular-nums font-medium",
        done === actions.length ? "text-chart-4" : "text-muted-foreground"
      )}
      title={`${done} de ${actions.length} ações concluídas`}
    >
      <ListChecks className="size-3" />
      {done}/{actions.length}
    </span>
  )
}

/** Prazo da próxima ação pendente (vem do vault como campo `due`). */
function CardDue({ task }: { task: Task }) {
  if (task.column === "done") return null
  const next = (task.checkpoints ?? [])
    .filter((c) => c.kind !== "log" && !c.completed && c.due)
    .sort((a, b) => a.due!.localeCompare(b.due!))[0]
  if (!next?.due) return null
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const [, m, d] = next.due.split("-")
  const overdue = next.due < todayIso
  const isToday = next.due === todayIso
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        overdue ? "border-destructive/40 bg-destructive/10 text-foreground" : isToday ? "border-chart-3/50 bg-chart-3/10 text-foreground" : "border-border/80 text-muted-foreground"
      )}
      title={`Próxima ação: ${next.title}`}
    >
      <CalendarClock className={cn("size-3", overdue ? "text-destructive" : isToday ? "text-chart-3" : "")} aria-hidden="true" />
      {overdue ? `Vencida ${d}/${m}` : isToday ? "Vence hoje" : `Prazo ${d}/${m}`}
    </span>
  )
}

function CardSkeletons() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando tarefas">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-3.5">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton mt-3 h-3.5 w-4/5 rounded" />
          <div className="skeleton mt-2 h-3.5 w-3/5 rounded" />
          <div className="mt-3 flex gap-1.5">
            <div className="skeleton h-4 w-14 rounded-full" />
            <div className="skeleton h-4 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

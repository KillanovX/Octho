import { describe, expect, it } from "vitest"
import {
  computeActivityBreakdown,
  computeCompletedThisMonth,
  computeHoursMonth,
  computeWeeklyHours,
  nextCode,
} from "@/lib/derive"
import type { Task, TimeEntry } from "@/lib/data"

const ME = "me"
const OTHER = "other"
const NOW = new Date(2026, 10, 12, 18) // quinta, 12-11-2026

const at = (d: number, h = 10) => new Date(2026, 10, d, h).getTime()

function entry(p: Partial<TimeEntry>): TimeEntry {
  return { id: Math.random().toString(36), userId: ME, startedAt: at(12), hours: 1, source: "timer", ...p }
}

function task(p: Partial<Task>): Task {
  return {
    id: "t",
    code: "OCT-301",
    title: "x",
    column: "todo",
    priority: "none",
    labels: [],
    assignee: "",
    assigneeColor: "#888",
    hoursLogged: 0,
    estimate: 0,
    ...p,
  }
}

describe("nextCode", () => {
  it("começa em OCT-301 e ignora códigos fora do padrão", () => {
    expect(nextCode([])).toBe("OCT-301")
    expect(nextCode([{ code: "FLX-999" }, { code: "OCT-abc" }])).toBe("OCT-301")
    expect(nextCode([{ code: "OCT-305" }, { code: "OCT-302" }])).toBe("OCT-306")
  })
})

describe("computeWeeklyHours", () => {
  it("soma por dia só do usuário e só da semana atual", () => {
    const days = computeWeeklyHours(
      [
        entry({ startedAt: at(9), hours: 2 }), // segunda
        entry({ startedAt: at(9, 23), hours: 0.5 }), // segunda à noite
        entry({ startedAt: at(12), hours: 1.25 }), // quinta
        entry({ startedAt: at(15, 22), hours: 1 }), // domingo
        entry({ startedAt: at(8), hours: 5 }), // domingo da semana anterior
        entry({ startedAt: at(10), hours: 3, userId: OTHER }),
      ],
      ME,
      NOW
    )
    expect(days.map((d) => d.day)).toEqual(["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"])
    expect(days.map((d) => d.hours)).toEqual([2.5, 0, 0, 1.25, 0, 0, 1])
    expect(days.map((d) => d.goal)).toEqual([8, 8, 8, 8, 8, 4, 0])
  })
})

describe("computeActivityBreakdown", () => {
  it("agrupa pela primeira tag, separa reuniões e avulsas, ignora outros meses e usuários", () => {
    const tasks = [
      task({ id: "a", labels: [{ name: "Backend", color: "#10b981" }, { name: "Bug", color: "#ef4444" }] }),
      task({ id: "b", labels: [] }),
    ]
    const result = computeActivityBreakdown(
      [
        entry({ taskId: "a", hours: 2 }),
        entry({ taskId: "a", hours: 1 }),
        entry({ taskId: "b", hours: 0.5 }),
        entry({ source: "meeting", hours: 1.5 }),
        entry({ taskId: "a", hours: 9, startedAt: new Date(2026, 9, 31).getTime() }), // outubro
        entry({ taskId: "a", hours: 9, userId: OTHER }),
      ],
      tasks,
      ME,
      NOW
    )
    expect(result).toEqual([
      { name: "Backend", hours: 3, color: "#10b981" },
      { name: "Reuniões", hours: 1.5, color: "#a855f7" },
      { name: "Sem categoria", hours: 0.5, color: "#94a3b8" },
    ])
  })
})

describe("totais do mês", () => {
  it("horas do mês filtram usuário e data", () => {
    const total = computeHoursMonth(
      [entry({ hours: 1.26 }), entry({ hours: 2 }), entry({ hours: 5, userId: OTHER }), entry({ hours: 7, startedAt: new Date(2026, 9, 31, 23, 59).getTime() })],
      ME,
      NOW
    )
    expect(total).toBe(3.3)
  })

  it("concluídas no mês usam completedAt", () => {
    const tasks = [
      task({ id: "1", column: "done", completedAt: at(3) }),
      task({ id: "2", column: "done", completedAt: new Date(2026, 9, 20).getTime() }),
      task({ id: "3", column: "done" }),
      task({ id: "4", column: "in_progress", completedAt: at(5) }),
    ]
    expect(computeCompletedThisMonth(tasks, NOW)).toBe(1)
  })
})

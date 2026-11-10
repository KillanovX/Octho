import { describe, expect, it } from "vitest"
import { buildDayClosing, buildMinuta, toSession } from "@/lib/itsm"
import { positionBetween, byPosition } from "@/lib/derive"
import type { Task, TimeEntry } from "@/lib/data"

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()
const entry = (p: Partial<TimeEntry>): TimeEntry => ({ id: Math.random().toString(36), userId: "me", startedAt: at(10, 9), hours: 1, source: "timer", ...p })
const task = (p: Partial<Task>): Task => ({
  id: "t1",
  code: "OCT-302",
  title: "Lentidao no acesso",
  column: "in_progress",
  priority: "high",
  labels: [],
  assignee: "",
  assigneeColor: "#888",
  hoursLogged: 0,
  estimate: 0,
  ...p,
})

describe("toSession (formato do worklog do vault)", () => {
  it("arredonda para blocos de 30 min e calcula o fim pela duração arredondada", () => {
    const s = toSession(entry({ startedAt: at(10, 10, 0), hours: 0.17, note: "Analise de logs" }))
    expect(s.hoursItsm).toBe(0.5)
    expect(s.heading).toBe("### 10-11-2026 | 10:00-10:30 (0.5h) | Analise de logs")
  })

  it("1h10 vira 1.5h", () => {
    expect(toSession(entry({ startedAt: at(10, 14), hours: 70 / 60 })).heading).toBe(
      "### 10-11-2026 | 14:00-15:30 (1.5h) | Sessão de trabalho"
    )
  })

  it("preserva 'horario nao registrado' vindo do vault", () => {
    const s = toSession(entry({ hours: 0.5, note: "Analise inicial (horario nao registrado no vault)", source: "agent" }))
    expect(s.heading).toBe("### 10-11-2026 | horario nao registrado (0.5h) | Analise inicial")
  })
})

describe("buildMinuta", () => {
  it("parágrafo na primeira pessoa do plural com total, atividades e próximo passo", () => {
    const t = task({
      externalRef: "12345",
      checkpoints: [
        { id: "a", title: "Responder ao TAC (Flavio): Enviar os novos artefatos", completed: false, kind: "action" },
        { id: "b", title: "Log", completed: true, kind: "log" },
      ],
    })
    const text = buildMinuta(t, [
      entry({ startedAt: at(10, 9), hours: 0.4, note: "Coleta de logs no cliente" }),
      entry({ startedAt: at(10, 14), hours: 1.1, note: "Sessao com o cliente" }),
    ])
    expect(text).toBe(
      "Realizamos 2 sessões de atuação no chamado #12345 (Lentidao no acesso), totalizando 2.0h. " +
        "Nesse período, trabalhamos em: coleta de logs no cliente; sessao com o cliente. " +
        "Como próximo passo, enviar os novos artefatos."
    )
  })

  it("vazio sem lançamentos", () => {
    expect(buildMinuta(task({}), [])).toBe("")
  })
})

describe("buildDayClosing", () => {
  it("agrupa o dia do usuário, separa faturável de interno e aponta pendências", () => {
    const tasks = [task({ id: "t1", externalRef: "12345" }), task({ id: "t2", code: "OCT-303", title: "Interna" })]
    const closing = buildDayClosing(
      new Date(2026, 10, 10, 12),
      [
        entry({ taskId: "t1", startedAt: at(10, 9), hours: 0.4 }),
        entry({ taskId: "t1", startedAt: at(10, 15), hours: 1 }),
        entry({ taskId: "t2", startedAt: at(10, 11), hours: 0.25 }),
        entry({ startedAt: at(10, 17), hours: 0.5, note: "Daily" }),
        entry({ taskId: "t1", startedAt: at(9, 9), hours: 3 }), // outro dia
        entry({ taskId: "t1", startedAt: at(10, 9), hours: 2, userId: "outro" }),
      ],
      tasks,
      "me"
    )
    expect(closing.groups.map((g) => g.task?.code ?? null)).toEqual(["OCT-302", "OCT-303", null])
    expect(closing.billableItsm).toBe(1.5)
    expect(closing.internalItsm).toBe(1)
    expect(closing.totalHours).toBe(2.15)
    expect(closing.warnings).toHaveLength(2) // sem tarefa + tarefa sem chamado
    expect(closing.groups[0].minuta).toContain("#12345")
  })
})

describe("posição fracionária do Kanban", () => {
  it("insere entre vizinhos e nas pontas", () => {
    expect(positionBetween(1, 2)).toBe(1.5)
    expect(positionBetween(undefined, 5)).toBe(4)
    expect(positionBetween(5, undefined)).toBe(6)
    expect(positionBetween(undefined, undefined)).toBeGreaterThan(1_700_000_000)
    expect([{ position: 3 }, { position: 1 }, {}].sort(byPosition)).toEqual([{}, { position: 1 }, { position: 3 }])
  })
})

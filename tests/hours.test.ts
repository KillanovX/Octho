import { describe, expect, it } from "vitest"
import { formatHours, periodStart, roundItsmHours, secondsToHours, startOfWeek } from "@/lib/hours"

describe("roundItsmHours (blocos de 30 min, sempre para cima, mínimo 0.5h)", () => {
  it.each([
    [0, 0],
    [-1, 0],
    [0.01, 0.5],
    [10 / 60, 0.5],
    [0.5, 0.5],
    [35 / 60, 1],
    [45 / 60, 1],
    [1, 1],
    [70 / 60, 1.5],
    [2.25, 2.5],
  ])("%s h -> %s h", (input, expected) => {
    expect(roundItsmHours(input)).toBe(expected)
  })

  it("não sobe um bloco por erro de ponto flutuante", () => {
    expect(roundItsmHours(0.1 + 0.2 + 0.2)).toBe(0.5)
    expect(roundItsmHours(1.5000000001)).toBe(1.5)
  })
})

describe("secondsToHours / formatHours", () => {
  it("converte segundos com 2 casas", () => {
    expect(secondsToHours(3600)).toBe(1)
    expect(secondsToHours(90 * 60)).toBe(1.5)
    expect(secondsToHours(61)).toBe(0.02)
  })

  it("formata horas legíveis", () => {
    expect(formatHours(0)).toBe("0h")
    expect(formatHours(1.25)).toBe("1h 15m")
    expect(formatHours(2)).toBe("2h")
    expect(formatHours(0.999)).toBe("1h")
  })
})

describe("períodos", () => {
  it("semana começa na segunda-feira", () => {
    // 09-11-2026 é segunda; 15-11-2026 é domingo
    expect(startOfWeek(new Date(2026, 10, 9, 15)).getDate()).toBe(9)
    expect(startOfWeek(new Date(2026, 10, 15, 23)).getDate()).toBe(9)
    expect(startOfWeek(new Date(2026, 10, 16, 0)).getDate()).toBe(16)
  })

  it("periodStart cobre todos os filtros", () => {
    const now = new Date(2026, 10, 12, 10)
    expect(periodStart("today", now)?.getTime()).toBe(new Date(2026, 10, 12).getTime())
    expect(periodStart("week", now)?.getTime()).toBe(new Date(2026, 10, 9).getTime())
    expect(periodStart("month", now)?.getTime()).toBe(new Date(2026, 10, 1).getTime())
    expect(periodStart("quarter", now)?.getTime()).toBe(new Date(2026, 9, 1).getTime())
    expect(periodStart("year", now)?.getTime()).toBe(new Date(2026, 0, 1).getTime())
    expect(periodStart("all", now)).toBeNull()
  })
})

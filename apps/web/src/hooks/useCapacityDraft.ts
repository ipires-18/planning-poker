import { useCallback, useState } from 'react'
import { suggestCapacity, type TeamCapacity } from '@/lib/derive'
import type { Holiday } from '@/lib/holidays'
import type { CapacityEntry } from '@/types'

export interface WindowDraft {
  start: string
  days: number
  holidays: Holiday[]
}

interface Row {
  capacity: number
  daysOff: number
}

/**
 * O painel de capacidade enquanto está sendo editado.
 *
 * Nada aqui vai para o banco antes de salvar: o time vê o número mudar de uma
 * vez, e não campo a campo enquanto alguém ainda está digitando.
 */
export function useCapacityDraft(capacity: TeamCapacity, saved: WindowDraft) {
  const [window, setWindow] = useState<WindowDraft>(saved)
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      capacity.rows.map((row) => [
        row.player.id,
        { capacity: row.capacity, daysOff: row.player.days_off },
      ]),
    ),
  )
  const [rate, setRate] = useState('1')

  const windowChanged =
    window.start !== saved.start ||
    window.days !== saved.days ||
    JSON.stringify(window.holidays) !== JSON.stringify(saved.holidays)

  const rowFor = useCallback(
    (playerId: string): Row => rows[playerId] ?? { capacity: 0, daysOff: 0 },
    [rows],
  )

  /** Dias úteis menos a ausência digitada agora, não a que está salva. */
  const availableDays = useCallback(
    (playerId: string) => Math.max(0, capacity.window.workingDays - rowFor(playerId).daysOff),
    [capacity.window.workingDays, rowFor],
  )

  const setCapacityPoints = useCallback((playerId: string, points: number) => {
    setRows((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? { daysOff: 0 }), capacity: Math.max(0, points) },
    }))
  }, [])

  const setDaysOff = useCallback((playerId: string, days: number) => {
    setRows((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? { capacity: 0 }), daysOff: Math.max(0, days) },
    }))
  }, [])

  /** Preenche todo mundo a partir de um ritmo em pontos por dia. */
  const applyRate = useCallback(() => {
    const perDay = parseFloat(rate.replace(',', '.'))
    if (Number.isNaN(perDay) || perDay < 0) return

    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, row]) => [
          id,
          {
            ...row,
            capacity: suggestCapacity(
              Math.max(0, capacity.window.workingDays - row.daysOff),
              perDay,
            ),
          },
        ]),
      ),
    )
  }, [rate, capacity.window.workingDays])

  const total = Object.values(rows).reduce((sum, row) => sum + row.capacity, 0)

  const toEntries = useCallback(
    (): CapacityEntry[] =>
      capacity.rows.map((row) => ({
        player_id: row.player.id,
        capacity_points: rowFor(row.player.id).capacity,
        days_off: rowFor(row.player.id).daysOff,
      })),
    [capacity.rows, rowFor],
  )

  return {
    window,
    setWindow,
    windowChanged,
    rowFor,
    availableDays,
    setCapacityPoints,
    setDaysOff,
    rate,
    setRate,
    applyRate,
    total,
    toEntries,
  }
}

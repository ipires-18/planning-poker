import { useState } from 'react'
import { Avatar, Button, Input, cx } from './ui'
import { SprintWindowPicker } from './SprintWindowPicker'
import { suggestCapacity, type TeamCapacity } from '@/lib/derive'
import type { Holiday } from '@/lib/holidays'
import { ROLE_ACCENT, ROLE_SHORT, type CapacityEntry } from '@/types'

interface Props {
  capacity: TeamCapacity
  sprint: { start: string; days: number; holidays: Holiday[] }
  onSaveWindow: (next: { start: string; days: number; holidays: Holiday[] }) => Promise<void>
  onSaveCapacity: (entries: CapacityEntry[]) => Promise<void>
}

export function CapacityPanel({ capacity, sprint, onSaveWindow, onSaveCapacity }: Props) {
  const [draft, setDraft] = useState(sprint)
  const [rows, setRows] = useState<Record<string, { capacity: number; daysOff: number }>>(
    () =>
      Object.fromEntries(
        capacity.rows.map((r) => [
          r.player.id,
          { capacity: r.capacity, daysOff: r.player.days_off },
        ]),
      ),
  )
  const [rate, setRate] = useState('1')
  const [saving, setSaving] = useState(false)

  const windowChanged =
    draft.start !== sprint.start ||
    draft.days !== sprint.days ||
    JSON.stringify(draft.holidays) !== JSON.stringify(sprint.holidays)

  /** Dias úteis menos a ausência digitada agora, não a que está salva. */
  const availableFor = (playerId: string) =>
    Math.max(0, capacity.window.workingDays - (rows[playerId]?.daysOff ?? 0))

  const applyRate = () => {
    const perDay = parseFloat(rate.replace(',', '.'))
    if (Number.isNaN(perDay) || perDay < 0) return
    setRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, row]) => [
          id,
          { ...row, capacity: suggestCapacity(availableFor(id), perDay) },
        ]),
      ),
    )
  }

  const total = Object.values(rows).reduce((sum, r) => sum + r.capacity, 0)

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (windowChanged) await onSaveWindow(draft)
      await onSaveCapacity(
        capacity.rows.map((r) => ({
          player_id: r.player.id,
          capacity_points: rows[r.player.id]?.capacity ?? 0,
          days_off: rows[r.player.id]?.daysOff ?? 0,
        })),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
          Janela da sprint
        </h3>
        <SprintWindowPicker
          start={draft.start}
          days={draft.days}
          holidays={draft.holidays}
          onChange={setDraft}
        />
      </section>

      <section className="border-t border-hairline pt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
              Quanto cada um assume
            </h3>
            <p className="mt-1 text-xs text-ink-subtle">
              Em pontos. Quem faltar dias tem menos dias disponíveis.
            </p>
          </div>

          <div className="flex items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-ink-subtle">
                Pts / dia
              </span>
              <Input
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                aria-label="Pontos por dia"
                className="w-16 py-1.5 text-center text-sm font-black"
              />
            </label>
            <Button size="sm" variant="secondary" onClick={applyRate}>
              Sugerir
            </Button>
          </div>
        </div>

        {capacity.rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline py-8 text-center text-sm text-ink-subtle">
            Ninguém sentou à mesa ainda. Convide o time e volte aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {capacity.rows.map((row) => {
              const accent = ROLE_ACCENT[row.player.role]
              const entry = rows[row.player.id] ?? { capacity: 0, daysOff: 0 }
              const available = availableFor(row.player.id)

              return (
                <li
                  key={row.player.id}
                  className="flex items-center gap-3 rounded-2xl bg-[var(--surface-sunken)] p-3"
                >
                  <Avatar name={row.player.name} color={accent} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{row.player.name}</p>
                    <span
                      className="whitespace-nowrap text-[10px] font-black uppercase tracking-wider"
                      style={{ color: accent }}
                    >
                      {ROLE_SHORT[row.player.role]} · {available} dia
                      {available !== 1 && 's'}
                    </span>
                  </div>

                  <label className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-ink-subtle">
                      Falta
                    </span>
                    <Input
                      type="number"
                      min="0"
                      max={capacity.window.workingDays}
                      value={entry.daysOff}
                      aria-label={`Dias de ausência de ${row.player.name}`}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [row.player.id]: {
                            ...entry,
                            daysOff: Math.max(0, parseInt(e.target.value, 10) || 0),
                          },
                        }))
                      }
                      className="w-16 py-1.5 text-center font-black"
                    />
                  </label>

                  <label className="flex shrink-0 items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={entry.capacity}
                      aria-label={`Capacidade de ${row.player.name}`}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [row.player.id]: {
                            ...entry,
                            capacity: Math.max(0, parseFloat(e.target.value) || 0),
                          },
                        }))
                      }
                      className="w-20 py-1.5 text-right font-black"
                    />
                    <span className="text-[10px] font-black uppercase text-ink-subtle">
                      pts
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--surface-sunken)] px-4 py-3">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-subtle">
            Capacidade do time
          </span>
          <span className="text-2xl font-black text-gradient">{total} pts</span>
        </div>
      </section>

      <Button variant="joy" size="lg" className="w-full" onClick={save} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar capacidade'}
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Medidor do cabeçalho                                                        */
/* -------------------------------------------------------------------------- */

export function CapacityMeter({
  capacity,
  onClick,
}: {
  capacity: TeamCapacity
  onClick?: () => void
}) {
  const { committed, capacity: total, ratio, unset } = capacity

  const color = unset
    ? 'var(--color-brand-400)'
    : ratio > 1
      ? 'var(--color-coral)'
      : ratio > 0.9
        ? 'var(--color-zest)'
        : 'var(--color-mint)'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      title={
        unset
          ? 'Definir a capacidade do time'
          : `${committed} de ${total} pontos comprometidos`
      }
      className={cx(
        'flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition-colors',
        onClick && 'cursor-pointer hover:bg-[var(--surface-sunken)]',
      )}
    >
      <div className="flex flex-col items-end leading-none">
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-ink-subtle">
          Comprometido
        </span>
        <span className="mt-0.5 font-black" style={{ color }}>
          {committed}
          {!unset && <span className="text-ink-subtle"> / {total}</span>}
          <span className="text-[10px] text-ink-subtle"> pts</span>
        </span>
      </div>

      {!unset && (
        <div
          className="h-8 w-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          aria-hidden
        >
          <div
            className="w-full rounded-full transition-all duration-500"
            style={{
              height: `${Math.min(100, ratio * 100)}%`,
              backgroundColor: color,
              marginTop: `${Math.max(0, 100 - ratio * 100)}%`,
            }}
          />
        </div>
      )}
    </Wrapper>
  )
}

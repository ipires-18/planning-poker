import { useMemo, useState } from 'react'
import { Badge, Button, Input } from './ui'
import { cx } from '@/lib/cx'
import {
  SPRINT_PRESETS,
  addDays,
  formatLong,
  formatShort,
  holidaysInWindow,
  isWeekend,
  windowStats,
  type Holiday,
} from '@/lib/holidays'

interface Props {
  start: string
  days: number
  holidays: Holiday[]
  onChange: (next: { start: string; days: number; holidays: Holiday[] }) => void
}

export function SprintWindowPicker({ start, days, holidays, onChange }: Props) {
  const [customDate, setCustomDate] = useState('')
  const [customName, setCustomName] = useState('')

  const stats = useMemo(() => windowStats({ start, days, holidays }), [start, days, holidays])

  /**
   * Todos os feriados que caem na janela, marcados conforme o time decidiu.
   * Os que ele desmarcou somem de `holidays` mas continuam aparecendo aqui,
   * senão não haveria como marcá-los de volta.
   */
  const candidates = useMemo(() => {
    const found = holidaysInWindow(start, days)
    const extra = holidays.filter((h) => !found.some((f) => f.date === h.date))
    return [...found, ...extra].sort((a, b) => a.date.localeCompare(b.date))
  }, [start, days, holidays])

  const isOn = (date: string) => holidays.some((h) => h.date === date)

  const toggle = (holiday: Holiday) => {
    const next = isOn(holiday.date)
      ? holidays.filter((h) => h.date !== holiday.date)
      : [...holidays, holiday].sort((a, b) => a.date.localeCompare(b.date))
    onChange({ start, days, holidays: next })
  }

  /** Trocar início ou duração recalcula os feriados nacionais da nova janela. */
  const reframe = (nextStart: string, nextDays: number) => {
    const custom = holidays.filter(
      (h) => !holidaysInWindow(start, days).some((f) => f.date === h.date),
    )
    const auto = holidaysInWindow(nextStart, nextDays)
    const kept = custom.filter(
      (h) => h.date >= nextStart && h.date <= addDays(nextStart, nextDays - 1),
    )
    onChange({
      start: nextStart,
      days: nextDays,
      holidays: [...auto, ...kept].sort((a, b) => a.date.localeCompare(b.date)),
    })
  }

  const addCustom = () => {
    if (!customDate) return
    const end = addDays(start, days - 1)
    if (customDate < start || customDate > end) return
    if (isOn(customDate)) return
    onChange({
      start,
      days,
      holidays: [
        ...holidays,
        { date: customDate, name: customName.trim() || 'Folga do time' },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    })
    setCustomDate('')
    setCustomName('')
  }

  return (
    <div className="space-y-5">
      {/* Início e duração */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-ink-muted">
            Começa em
          </span>
          <Input
            type="date"
            value={start}
            onChange={(e) => e.target.value && reframe(e.target.value, days)}
          />
        </label>

        <div>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-ink-muted">
            Duração
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SPRINT_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => reframe(start, preset.days)}
                aria-pressed={days === preset.days}
                className={cx(
                  'cursor-pointer rounded-xl px-3 py-2 text-xs font-black transition-all',
                  days === preset.days
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                    : 'bg-[var(--surface-sunken)] text-ink-muted hover:text-ink',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo da janela */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-[var(--surface-sunken)] px-4 py-3">
        <Stat value={stats.workingDays} label="dias úteis" strong />
        <Stat value={stats.weekendDays} label="fim de semana" />
        <Stat value={stats.holidayDays} label="feriado" />
        <span className="ml-auto text-xs text-ink-subtle">
          {formatLong(stats.start)} → {formatLong(stats.end)}
        </span>
      </div>

      {/* Feriados */}
      <div>
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-ink-muted">
          Feriados na janela
        </span>

        {candidates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline py-6 text-center text-xs text-ink-subtle">
            Nenhum feriado nacional cai nesta sprint.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {candidates.map((holiday) => {
              const on = isOn(holiday.date)
              const weekend = isWeekend(holiday.date)
              return (
                <li key={holiday.date}>
                  <label
                    className={cx(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors',
                      on ? 'bg-brand-500/10' : 'bg-[var(--surface-sunken)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(holiday)}
                      className="h-4 w-4 cursor-pointer accent-brand-500"
                    />
                    <span className="w-16 shrink-0 font-mono text-xs font-black text-ink-muted">
                      {formatShort(holiday.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                      {holiday.name}
                    </span>
                    {holiday.optional && <Badge color="var(--color-zest)">Facultativo</Badge>}
                    {weekend && <Badge color="var(--color-ink-subtle)">Fim de semana</Badge>}
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-2 text-xs text-ink-subtle">
          Carnaval e Corpus Christi são ponto facultativo, não feriado federal — desmarque
          se o time trabalha. Quem cai no fim de semana não desconta dia útil.
        </p>
      </div>

      {/* Folga do time */}
      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto]">
        <Input
          type="date"
          value={customDate}
          min={stats.start}
          max={stats.end}
          onChange={(e) => setCustomDate(e.target.value)}
          aria-label="Data da folga"
          className="py-2 text-sm"
        />
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Feriado municipal, folga coletiva..."
          aria-label="Nome da folga"
          className="py-2 text-sm"
        />
        <Button size="sm" variant="secondary" onClick={addCustom} isDisabled={!customDate}>
          Acrescentar
        </Button>
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  strong,
}: {
  value: number
  label: string
  strong?: boolean
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span
        className={cx(
          'font-black',
          strong ? 'text-2xl ds-text-gradient' : 'text-lg text-ink-muted',
        )}
      >
        {value}
      </span>
      <span className="text-[10px] font-black uppercase tracking-wider text-ink-subtle">
        {label}
      </span>
    </span>
  )
}

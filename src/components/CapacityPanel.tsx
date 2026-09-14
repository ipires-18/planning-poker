import { useState } from 'react'
import { Avatar, Button, Input } from './ui'
import { cx } from '@/lib/cx'
import { SprintWindowPicker } from './SprintWindowPicker'
import { useCapacityDraft, type WindowDraft } from '@/hooks/useCapacityDraft'
import type { TeamCapacity } from '@/lib/derive'
import { ROLE_ACCENT, ROLE_SHORT, type CapacityEntry, type Player } from '@/types'

interface Props {
  capacity: TeamCapacity
  sprint: WindowDraft
  qaVotes: boolean
  qaPresent: boolean
  onToggleQaVoting: (enabled: boolean) => void
  onSaveWindow: (next: WindowDraft) => Promise<void>
  onSaveCapacity: (entries: CapacityEntry[]) => Promise<void>
}

export function CapacityPanel({
  capacity,
  sprint,
  qaVotes,
  qaPresent,
  onToggleQaVoting,
  onSaveWindow,
  onSaveCapacity,
}: Props) {
  const draft = useCapacityDraft(capacity, sprint)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (draft.windowChanged) await onSaveWindow(draft.window)
      await onSaveCapacity(draft.toEntries())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Section title="Quem vota">
        <QaVotingToggle enabled={qaVotes} qaPresent={qaPresent} onChange={onToggleQaVoting} />
      </Section>

      <Section title="Janela da sprint" divided>
        <SprintWindowPicker
          start={draft.window.start}
          days={draft.window.days}
          holidays={draft.window.holidays}
          onChange={draft.setWindow}
        />
      </Section>

      <Section title="Quanto cada um assume" divided>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-xs text-xs text-ink-subtle">
            Em pontos, só para quem é dono de entrega. Quem faltar dias tem menos dias
            disponíveis.
          </p>
          <RateSuggester
            rate={draft.rate}
            onRateChange={draft.setRate}
            onApply={draft.applyRate}
          />
        </div>

        {capacity.rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-hairline py-8 text-center text-sm text-ink-subtle">
            Ninguém que pontua sentou à mesa ainda. Convide o time e volte aqui.
          </p>
        ) : (
          <ul className="space-y-2">
            {capacity.rows.map(({ player }) => (
              <CapacityRow
                key={player.id}
                player={player}
                availableDays={draft.availableDays(player.id)}
                maxDaysOff={capacity.window.workingDays}
                capacityPoints={draft.rowFor(player.id).capacity}
                daysOff={draft.rowFor(player.id).daysOff}
                onCapacityChange={(points) => draft.setCapacityPoints(player.id, points)}
                onDaysOffChange={(days) => draft.setDaysOff(player.id, days)}
              />
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--surface-sunken)] px-4 py-3">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-ink-subtle">
            Capacidade do time
          </span>
          <span className="text-2xl font-black text-gradient">{draft.total} pts</span>
        </div>
      </Section>

      <Button variant="joy" size="lg" className="w-full" onClick={save} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar capacidade'}
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Section({
  title,
  divided,
  children,
}: {
  title: string
  divided?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={divided ? 'border-t border-hairline pt-6' : undefined}>
      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * A QA participa da cerimônia de qualquer jeito; o que muda aqui é se ela
 * recebe baralho. Pontuação ela não recebe em nenhum caso.
 */
function QaVotingToggle({
  enabled,
  qaPresent,
  onChange,
}: {
  enabled: boolean
  qaPresent: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition-colors',
        enabled ? 'bg-brand-500/10' : 'bg-[var(--surface-sunken)]',
      )}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-500"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">A QA vota nesta sessão</span>
        <span className="mt-1 block text-xs leading-snug text-ink-subtle">
          Desligado, a QA acompanha as histórias e levanta pontos sem carta na mão. Em
          qualquer um dos casos ela não recebe pontuação — quem carrega story point é Tech
          Lead, Front e Back.
          {!qaPresent && ' Nenhuma QA sentou à mesa ainda.'}
        </span>
      </span>
    </label>
  )
}

/** Preenche a capacidade de todo mundo a partir de um ritmo em pontos por dia. */
function RateSuggester({
  rate,
  onRateChange,
  onApply,
}: {
  rate: string
  onRateChange: (rate: string) => void
  onApply: () => void
}) {
  return (
    <div className="flex items-end gap-2">
      <label className="block">
        <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-ink-subtle">
          Pts / dia
        </span>
        <Input
          value={rate}
          onChange={(e) => onRateChange(e.target.value)}
          inputMode="decimal"
          aria-label="Pontos por dia"
          className="w-16 py-1.5 text-center text-sm font-black"
        />
      </label>
      <Button size="sm" variant="secondary" onClick={onApply}>
        Sugerir
      </Button>
    </div>
  )
}

function CapacityRow({
  player,
  availableDays,
  maxDaysOff,
  capacityPoints,
  daysOff,
  onCapacityChange,
  onDaysOffChange,
}: {
  player: Player
  availableDays: number
  maxDaysOff: number
  capacityPoints: number
  daysOff: number
  onCapacityChange: (points: number) => void
  onDaysOffChange: (days: number) => void
}) {
  const accent = ROLE_ACCENT[player.role]
  const dayLabel = `${availableDays} dia${availableDays === 1 ? '' : 's'}`

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-[var(--surface-sunken)] p-3">
      <Avatar name={player.name} color={accent} size={34} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{player.name}</p>
        <span
          className="whitespace-nowrap text-[10px] font-black uppercase tracking-wider"
          style={{ color: accent }}
        >
          {ROLE_SHORT[player.role]} · {dayLabel}
        </span>
      </div>

      <label className="flex shrink-0 items-center gap-1.5">
        <span className="text-[10px] font-black uppercase text-ink-subtle">Falta</span>
        <Input
          type="number"
          min="0"
          max={maxDaysOff}
          value={daysOff}
          aria-label={`Dias de ausência de ${player.name}`}
          onChange={(e) => onDaysOffChange(parseInt(e.target.value, 10) || 0)}
          className="w-16 py-1.5 text-center font-black"
        />
      </label>

      <label className="flex shrink-0 items-center gap-1.5">
        <Input
          type="number"
          min="0"
          step="0.5"
          value={capacityPoints}
          aria-label={`Capacidade de ${player.name}`}
          onChange={(e) => onCapacityChange(parseFloat(e.target.value) || 0)}
          className="w-20 py-1.5 text-right font-black"
        />
        <span className="text-[10px] font-black uppercase text-ink-subtle">pts</span>
      </label>
    </li>
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

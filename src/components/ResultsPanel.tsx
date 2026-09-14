import { useMemo, useState } from 'react'
import { Button, Select } from './ui'
import { cx } from '@/lib/cx'
import { ConsensusBurst } from './ConsensusBurst'
import { VoteTally } from './results/VoteTally'
import { AllocationRow } from './results/AllocationRow'
import { BalanceBadge } from './results/BalanceBadge'
import { PENDING, formatPoints, type Card } from '@/lib/decks'
import { isConsensus, tallyVotes, tidy, type CastVote } from '@/lib/scoring'
import { useStoryScoring } from '@/hooks/useStoryScoring'
import type { Allocation, Player } from '@/types'

interface Props {
  /** Baralho em uso na sala — define o que cada carta vale. */
  scale: Card[]
  votes: CastVote[]
  /** Quem pode receber pontos — PO e QA acompanham, não pontuam. */
  scorers: Player[]
  /** Quantas pessoas tinham baralho nesta rodada. */
  voterCount: number
  isHost: boolean
  onConfirm: (points: number | null, allocations: Allocation[]) => Promise<void>
  onReset: () => void
}

export function ResultsPanel({
  scale,
  votes,
  scorers,
  voterCount,
  isHost,
  onConfirm,
  onReset,
}: Props) {
  const scoring = useStoryScoring({ scale, votes, scorers })
  const [saving, setSaving] = useState(false)
  const [celebrated, setCelebrated] = useState(false)

  const tally = useMemo(() => tallyVotes(votes, scale), [votes, scale])
  const consensus = useMemo(
    () => isConsensus(tally, voterCount, scale),
    [tally, voterCount, scale],
  )

  const confirm = async () => {
    if (!scoring.isBalanced || saving) return
    setSaving(true)
    try {
      const { points, allocations } = scoring.toPayload()
      await onConfirm(points, allocations)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cx(
        'card-surface animate-pop-in mx-auto w-full max-w-3xl p-7',
        consensus && 'ring-rainbow',
      )}
    >
      {consensus && !celebrated && (
        <ConsensusBurst
          value={tally[0].label}
          voters={votes.length}
          onDone={() => setCelebrated(true)}
        />
      )}

      <VoteTally tally={tally} consensus={consensus} />

      {isHost ? (
        <div className="space-y-6 border-t border-hairline pt-7">
          <StoryTotal scoring={scoring} />
          <Allocation scorers={scorers} scoring={scoring} />
          <ConfirmBar
            scoring={scoring}
            saving={saving}
            onConfirm={confirm}
            onReset={onReset}
          />
        </div>
      ) : (
        <p className="rounded-2xl bg-[var(--surface-sunken)] py-5 text-center text-sm font-bold text-ink-muted">
          Aguardando PO ou Tech Lead fechar a pontuação...
        </p>
      )}
    </div>
  )
}

type Scoring = ReturnType<typeof useStoryScoring>

/* -------------------------------------------------------------------------- */

function StoryTotal({ scoring }: { scoring: Scoring }) {
  const { options, isPending, totalLabel, chooseTotal } = scoring

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
          Pontuação da história
        </h3>
        <p className="mt-1 text-xs text-ink-subtle">Sugerido: o maior voto do time</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-4xl font-black text-gradient">
          {isPending ? '—' : totalLabel}
        </span>
        <Select
          value={isPending ? PENDING.label : totalLabel}
          onChange={(e) => chooseTotal(e.target.value, e.target.value === PENDING.label)}
          aria-label="Pontos da história"
          className="w-auto py-2 text-sm"
        >
          {options.map((card) => {
            // Em camisetas o rótulo não é o número, então o valor vai junto.
            const points = formatPoints(card.value ?? 0)
            const suffix = card.label === points ? '' : ` (${points} pts)`
            return (
              <option key={card.label} value={card.label}>
                {card.label}
                {suffix}
              </option>
            )
          })}
          <option value={PENDING.label}>{PENDING.label}</option>
        </Select>
      </div>
    </div>
  )
}

function Allocation({ scorers, scoring }: { scorers: Player[]; scoring: Scoring }) {
  const { isPending, split, remaining, isBalanced, setShare, spreadEvenly } = scoring

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
          {isPending ? 'Quem vai destravar?' : 'Divisão entre o time'}
        </h4>

        {!isPending && (
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={spreadEvenly}>
              Dividir igualmente
            </Button>
            <BalanceBadge remaining={remaining} balanced={isBalanced} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {scorers.map((player) => (
          <AllocationRow
            key={player.id}
            player={player}
            points={split[player.id] ?? 0}
            pendingMode={isPending}
            onChange={(points) => setShare(player.id, points)}
          />
        ))}
      </div>
    </div>
  )
}

function ConfirmBar({
  scoring,
  saving,
  onConfirm,
  onReset,
}: {
  scoring: Scoring
  saving: boolean
  onConfirm: () => void
  onReset: () => void
}) {
  const { isBalanced, isPending, remaining } = scoring

  const label = saving
    ? 'Salvando...'
    : isBalanced
      ? 'Confirmar e ir para a próxima'
      : isPending
        ? 'Escolha ao menos um responsável'
        : `Faltam ${tidy(Math.abs(remaining))} pts para distribuir`

  return (
    <div className="flex gap-3">
      <Button
        variant="joy"
        size="lg"
        className="flex-1"
        disabled={!isBalanced || saving}
        onClick={onConfirm}
      >
        {label}
      </Button>
      <Button variant="danger" size="lg" onClick={onReset} title="Votar de novo">
        ↺
      </Button>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Avatar, Button, Input, Select, cx } from './ui'
import { ConsensusBurst } from './ConsensusBurst'
import { PENDING, cardByLabel, formatPoints, scoringCards, type Card } from '@/lib/decks'
import { ROLE_ACCENT, ROLE_SHORT, type Allocation, type Player } from '@/types'

interface Props {
  /** Baralho em uso na sala — define o que cada carta vale. */
  scale: Card[]
  votes: { player: Player; label: string }[]
  /** Quem pode receber pontos — o PO observa, não pontua. */
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
  const options = useMemo(() => scoringCards(scale), [scale])

  /** O maior voto que pontua. É a sugestão padrão: quem viu mais risco. */
  const suggested = useMemo(() => {
    const values = votes
      .map((v) => cardByLabel(scale, v.label)?.value)
      .filter((n): n is number => typeof n === 'number')
    if (values.length === 0) return null
    const max = Math.max(...values)
    return options.find((c) => c.value === max) ?? null
  }, [votes, scale, options])

  const someonePending = votes.some((v) => v.label === PENDING.label)

  const [pending, setPending] = useState(suggested === null && someonePending)
  const [totalLabel, setTotalLabel] = useState(
    () => suggested?.label ?? options[0]?.label ?? '0',
  )
  const [split, setSplit] = useState<Record<string, number>>(() =>
    Object.fromEntries(scorers.map((p) => [p.id, 0])),
  )
  const [saving, setSaving] = useState(false)

  const totalPoints = cardByLabel(scale, totalLabel)?.value ?? 0
  const distributed = Object.values(split).reduce((sum, n) => sum + n, 0)
  const remaining = pending ? 0 : totalPoints - distributed
  const balanced = pending
    ? Object.values(split).some((n) => n > 0)
    : Math.abs(remaining) < 0.001

  /** Agrupamento dos votos, para o painel de distribuição. */
  const tally = useMemo(() => {
    const groups = new Map<string, Player[]>()
    for (const { label, player } of votes) {
      groups.set(label, [...(groups.get(label) ?? []), player])
    }
    return [...groups.entries()].sort(([a], [b]) => {
      const va = cardByLabel(scale, a)?.value
      const vb = cardByLabel(scale, b)?.value
      if (va == null && vb == null) return a.localeCompare(b)
      if (va == null) return 1
      if (vb == null) return -1
      return va - vb
    })
  }, [votes, scale])

  /**
   * Consenso de verdade: todo mundo que tinha carta votou, e votou a mesma —
   * numa carta que pontua. Duas pessoas de seis concordando não é consenso, é
   * amostra pequena; e o time inteiro tirando "?" é dúvida unânime, não acordo.
   */
  const consensus =
    tally.length === 1 &&
    votes.length >= 2 &&
    votes.length === voterCount &&
    cardByLabel(scale, tally[0][0])?.value !== null &&
    cardByLabel(scale, tally[0][0]) !== undefined

  const [celebrated, setCelebrated] = useState(false)

  const spreadEvenly = () => {
    if (pending || scorers.length === 0) return

    // Meio ponto é a menor fração que o time usa, então contamos em meios e
    // repartimos o resto de um em um. Arredondar cada pessoa e jogar a sobra
    // numa só produzia valores negativos quando a sobra era grande.
    const halves = Math.round(totalPoints * 2)
    const base = Math.floor(halves / scorers.length)
    const leftover = halves - base * scorers.length

    setSplit(
      Object.fromEntries(
        scorers.map((p, index) => [p.id, (base + (index < leftover ? 1 : 0)) * 0.5]),
      ),
    )
  }

  const confirm = async () => {
    if (!balanced || saving) return
    setSaving(true)
    try {
      await onConfirm(
        pending ? null : totalPoints,
        scorers.map((p) => ({
          player_id: p.id,
          points: pending ? 0 : (split[p.id] ?? 0),
          pending: pending && (split[p.id] ?? 0) > 0,
        })),
      )
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
          value={tally[0][0]}
          voters={votes.length}
          onDone={() => setCelebrated(true)}
        />
      )}

      {/* Distribuição dos votos */}
      <div className="mb-7">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
            Como o time votou
          </h3>
          {consensus && (
            <span className="animate-pop-in rounded-full bg-[linear-gradient(100deg,var(--color-brand-500),var(--color-punch),var(--color-zest))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
              Consenso 🎯
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {tally.map(([label, players]) => (
            <div
              key={label}
              className="flex min-w-24 flex-1 flex-col items-center gap-2 rounded-2xl bg-[var(--surface-sunken)] p-4"
            >
              <span
                className={cx(
                  'font-black text-ink',
                  label.length > 3 ? 'text-xs uppercase' : 'text-3xl',
                )}
              >
                {label}
              </span>
              <div className="flex -space-x-2">
                {players.map((p) => (
                  <span key={p.id} title={p.name}>
                    <Avatar name={p.name} color={ROLE_ACCENT[p.role]} size={26} />
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-ink-subtle">
                {players.length} voto{players.length !== 1 && 's'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!isHost ? (
        <p className="rounded-2xl bg-[var(--surface-sunken)] py-5 text-center text-sm font-bold text-ink-muted">
          Aguardando PO ou Tech Lead fechar a pontuação...
        </p>
      ) : (
        <div className="space-y-6 border-t border-hairline pt-7">
          {/* Total da história */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
                Pontuação da história
              </h3>
              <p className="mt-1 text-xs text-ink-subtle">Sugerido: o maior voto do time</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-gradient">
                {pending ? '—' : totalLabel}
              </span>
              <Select
                value={pending ? PENDING.label : totalLabel}
                onChange={(e) => {
                  const next = e.target.value
                  if (next === PENDING.label) {
                    setPending(true)
                  } else {
                    setPending(false)
                    setTotalLabel(next)
                  }
                }}
                aria-label="Pontos da história"
                className="w-auto py-2 text-sm"
              >
                {options.map((card) => (
                  <option key={card.label} value={card.label}>
                    {card.label}
                    {card.label !== formatPoints(card.value ?? 0) &&
                      ` (${formatPoints(card.value ?? 0)} pts)`}
                  </option>
                ))}
                <option value={PENDING.label}>{PENDING.label}</option>
              </Select>
            </div>
          </div>

          {/* Divisão */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
                {pending ? 'Quem vai destravar?' : 'Divisão entre o time'}
              </h4>
              {!pending && (
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="ghost" onClick={spreadEvenly}>
                    Dividir igualmente
                  </Button>
                  <div
                    className={cx(
                      'rounded-xl px-3 py-1.5 text-xs font-black',
                      balanced
                        ? 'bg-mint/15 text-mint'
                        : remaining > 0
                          ? 'bg-zest/15 text-zest'
                          : 'bg-coral/15 text-coral',
                    )}
                  >
                    {balanced
                      ? 'Fecha certinho ✓'
                      : remaining > 0
                        ? `Faltam ${Math.round(remaining * 10) / 10}`
                        : `Excedeu ${Math.abs(Math.round(remaining * 10) / 10)}`}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {scorers.map((player) => {
                const accent = ROLE_ACCENT[player.role]
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--surface-sunken)] p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={player.name} color={accent} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{player.name}</p>
                        <span
                          className="text-[10px] font-black uppercase tracking-wider"
                          style={{ color: accent }}
                        >
                          {ROLE_SHORT[player.role]}
                        </span>
                      </div>
                    </div>

                    {pending ? (
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--surface-raised)] px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-ink-subtle">
                          Responsável
                        </span>
                        <input
                          type="checkbox"
                          checked={(split[player.id] ?? 0) > 0}
                          onChange={(e) =>
                            setSplit((prev) => ({
                              ...prev,
                              [player.id]: e.target.checked ? 1 : 0,
                            }))
                          }
                          className="h-4 w-4 cursor-pointer accent-brand-500"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          value={split[player.id] ?? 0}
                          aria-label={`Pontos de ${player.name}`}
                          onChange={(e) =>
                            setSplit((prev) => ({
                              ...prev,
                              [player.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-20 py-2 text-right font-black"
                        />
                        <span className="text-[10px] font-black uppercase text-ink-subtle">
                          pts
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="joy"
              size="lg"
              className="flex-1"
              disabled={!balanced || saving}
              onClick={confirm}
            >
              {saving
                ? 'Salvando...'
                : balanced
                  ? 'Confirmar e ir para a próxima'
                  : pending
                    ? 'Escolha ao menos um responsável'
                    : `Faltam ${Math.abs(Math.round(remaining * 10) / 10)} pts para distribuir`}
            </Button>
            <Button variant="danger" size="lg" onClick={onReset} title="Votar de novo">
              ↺
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

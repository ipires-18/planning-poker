import { useMemo, useState } from 'react'
import { Avatar, Badge, Button, Input, Select, cx } from './ui'
import {
  PENDING_CARD,
  POINT_SCALE,
  ROLE_ACCENT,
  ROLE_SHORT,
  type Allocation,
  type Player,
} from '@/types'

interface Props {
  votes: { player: Player; value: string }[]
  /** Quem pode receber pontos — o PO observa, não pontua. */
  scorers: Player[]
  isHost: boolean
  onConfirm: (points: number | null, allocations: Allocation[]) => Promise<void>
  onReset: () => void
}

export function ResultsPanel({ votes, scorers, isHost, onConfirm, onReset }: Props) {
  const numeric = votes.map((v) => Number(v.value)).filter((n) => !Number.isNaN(n))
  const suggested = numeric.length > 0 ? Math.max(...numeric) : null
  const anyPending = votes.some((v) => v.value === PENDING_CARD)

  const [total, setTotal] = useState<string>(() =>
    suggested !== null ? String(suggested) : anyPending ? PENDING_CARD : '0',
  )
  const [split, setSplit] = useState<Record<string, number>>(() =>
    Object.fromEntries(scorers.map((p) => [p.id, 0])),
  )
  const [saving, setSaving] = useState(false)

  const isPending = total === PENDING_CARD
  const totalPoints = isPending ? 0 : Number(total) || 0
  const distributed = Object.values(split).reduce((sum, n) => sum + n, 0)
  const remaining = isPending ? 0 : totalPoints - distributed
  const balanced = isPending
    ? Object.values(split).some((n) => n > 0)
    : Math.abs(remaining) < 0.001

  /** Agrupamento dos votos, para o painel de distribuição. */
  const tally = useMemo(() => {
    const groups = new Map<string, Player[]>()
    for (const { value, player } of votes) {
      groups.set(value, [...(groups.get(value) ?? []), player])
    }
    return [...groups.entries()].sort(([a], [b]) => {
      const na = Number(a)
      const nb = Number(b)
      if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b)
      if (Number.isNaN(na)) return 1
      if (Number.isNaN(nb)) return -1
      return na - nb
    })
  }, [votes])

  const consensus = tally.length === 1

  const spreadEvenly = () => {
    if (isPending || scorers.length === 0) return

    // Meio ponto é a menor fração que o time usa, então contamos em meios e
    // repartimos o resto de um em um. Arredondar cada pessoa e jogar a sobra
    // numa só produzia valores negativos quando a sobra era grande — 9 pontos
    // entre 12 pessoas deixava a primeira com -2.
    const halves = Math.round(totalPoints * 2)
    const base = Math.floor(halves / scorers.length)
    const leftover = halves - base * scorers.length

    setSplit(
      Object.fromEntries(
        scorers.map((p, index) => [p.id, ((base + (index < leftover ? 1 : 0)) * 0.5)]),
      ),
    )
  }

  const confirm = async () => {
    if (!balanced || saving) return
    setSaving(true)
    try {
      await onConfirm(
        isPending ? null : totalPoints,
        scorers.map((p) => ({
          player_id: p.id,
          points: isPending ? 0 : (split[p.id] ?? 0),
          pending: isPending && (split[p.id] ?? 0) > 0,
        })),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card-surface animate-pop-in mx-auto w-full max-w-3xl p-7">
      {/* Distribuição dos votos */}
      <div className="mb-7">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
            Como o time votou
          </h3>
          {consensus && <Badge color="var(--color-mint)">Consenso 🎯</Badge>}
        </div>

        <div className="flex flex-wrap gap-3">
          {tally.map(([value, players]) => (
            <div
              key={value}
              className="flex min-w-24 flex-1 flex-col items-center gap-2 rounded-2xl bg-[var(--surface-sunken)] p-4"
            >
              <span
                className={cx(
                  'font-black text-ink',
                  value.length > 3 ? 'text-xs uppercase' : 'text-3xl',
                )}
              >
                {value}
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
              <p className="mt-1 text-xs text-ink-subtle">
                Sugerido: o maior voto do time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-gradient">{total}</span>
              <Select
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                aria-label="Pontos da história"
                className="w-auto py-2 text-sm"
              >
                {POINT_SCALE.filter(
                  (v) => typeof v === 'number' || v === PENDING_CARD,
                ).map((v) => (
                  <option key={String(v)} value={String(v)}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Divisão */}
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

                    {isPending ? (
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
                  : isPending
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

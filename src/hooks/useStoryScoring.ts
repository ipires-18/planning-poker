import { useCallback, useMemo, useState } from 'react'
import { cardByLabel, scoringCards, type Card } from '@/lib/decks'
import {
  someoneVotedPending,
  splitEvenly,
  suggestedCard,
  type CastVote,
} from '@/lib/scoring'
import type { Allocation, Player } from '@/types'

interface Args {
  scale: Card[]
  votes: CastVote[]
  /** Quem pode receber pontos. */
  scorers: Player[]
}

/**
 * O formulário de fechamento da história: o total e como ele se reparte.
 *
 * Vive num hook porque é estado de edição com regras próprias — quanto falta
 * distribuir, quando o botão libera — e nada disso é assunto de layout.
 */
export function useStoryScoring({ scale, votes, scorers }: Args) {
  const options = useMemo(() => scoringCards(scale), [scale])
  const suggested = useMemo(() => suggestedCard(votes, scale), [votes, scale])

  /** Ninguém deu carta que pontua, mas alguém pediu "Ag. Definição". */
  const startsPending = suggested === null && someoneVotedPending(votes)

  const [isPending, setPending] = useState(startsPending)
  const [totalLabel, setTotalLabel] = useState(
    () => suggested?.label ?? options[0]?.label ?? '',
  )
  const [split, setSplit] = useState<Record<string, number>>(() =>
    Object.fromEntries(scorers.map((p) => [p.id, 0])),
  )

  const total = cardByLabel(scale, totalLabel)?.value ?? 0
  const distributed = Object.values(split).reduce((sum, n) => sum + n, 0)
  const remaining = isPending ? 0 : total - distributed

  /** Com "Ag. Definição" basta apontar um responsável; com pontos, a soma tem que fechar. */
  const isBalanced = isPending
    ? Object.values(split).some((points) => points > 0)
    : Math.abs(remaining) < 0.001

  const setShare = useCallback((playerId: string, points: number) => {
    setSplit((prev) => ({ ...prev, [playerId]: Math.max(0, points) }))
  }, [])

  const chooseTotal = useCallback((label: string, pending: boolean) => {
    setPending(pending)
    if (!pending) setTotalLabel(label)
  }, [])

  const spreadEvenly = useCallback(() => {
    if (isPending) return
    const shares = splitEvenly(total, scorers.length)
    setSplit(Object.fromEntries(scorers.map((p, i) => [p.id, shares[i]])))
  }, [isPending, total, scorers])

  /** O que vai para o banco: null no total quando a história fica pendente. */
  const toPayload = useCallback(
    (): { points: number | null; allocations: Allocation[] } => ({
      points: isPending ? null : total,
      allocations: scorers.map((player) => ({
        player_id: player.id,
        points: isPending ? 0 : (split[player.id] ?? 0),
        pending: isPending && (split[player.id] ?? 0) > 0,
      })),
    }),
    [isPending, total, scorers, split],
  )

  return {
    options,
    isPending,
    totalLabel,
    total,
    split,
    remaining,
    isBalanced,
    setShare,
    chooseTotal,
    spreadEvenly,
    toPayload,
  }
}

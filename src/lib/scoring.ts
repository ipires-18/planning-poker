import { PENDING, cardByLabel, type Card } from './decks'
import type { Player } from '@/types'

export interface CastVote {
  player: Player
  label: string
}

/** Um valor votado e quem votou nele. */
export interface TallyEntry {
  label: string
  players: Player[]
}

/** Agrupa os votos por carta, das que pontuam para as que não pontuam. */
export function tallyVotes(votes: CastVote[], scale: Card[]): TallyEntry[] {
  const groups = new Map<string, Player[]>()
  for (const { label, player } of votes) {
    groups.set(label, [...(groups.get(label) ?? []), player])
  }

  return [...groups.entries()]
    .map(([label, players]) => ({ label, players }))
    .sort((a, b) => {
      const va = cardByLabel(scale, a.label)?.value
      const vb = cardByLabel(scale, b.label)?.value
      if (va == null && vb == null) return a.label.localeCompare(b.label)
      if (va == null) return 1
      if (vb == null) return -1
      return va - vb
    })
}

/**
 * Consenso de verdade: todo mundo que tinha carta votou, e votou a mesma — numa
 * carta que pontua.
 *
 * Duas pessoas de seis concordando não é consenso, é amostra pequena. E o time
 * inteiro tirando "?" é dúvida unânime, não acordo.
 */
export function isConsensus(tally: TallyEntry[], voterCount: number, scale: Card[]): boolean {
  if (tally.length !== 1) return false

  const [only] = tally
  if (only.players.length < 2) return false
  if (only.players.length !== voterCount) return false

  return cardByLabel(scale, only.label)?.value != null
}

/** A carta sugerida para a história: o maior voto, ou seja, quem viu mais risco. */
export function suggestedCard(votes: CastVote[], scale: Card[]): Card | null {
  const values = votes
    .map((v) => cardByLabel(scale, v.label)?.value)
    .filter((n): n is number => typeof n === 'number')

  if (values.length === 0) return null

  const highest = Math.max(...values)
  return scale.find((c) => c.value === highest) ?? null
}

export function someoneVotedPending(votes: CastVote[]): boolean {
  return votes.some((v) => v.label === PENDING.label)
}

/**
 * Divide um total em partes iguais, contando em meios pontos e repartindo o
 * resto de um em um.
 *
 * Arredondar cada pessoa e jogar a sobra numa só produzia valores negativos
 * quando a sobra era grande — 9 pontos entre 12 pessoas deixavam a primeira
 * com -2.
 */
export function splitEvenly(total: number, people: number): number[] {
  if (people <= 0) return []

  const halves = Math.round(total * 2)
  const base = Math.floor(halves / people)
  const leftover = halves - base * people

  return Array.from({ length: people }, (_, i) => (base + (i < leftover ? 1 : 0)) * 0.5)
}

/** Arredonda para uma casa, só para não mostrar 2.9999999 na tela. */
export function tidy(value: number): number {
  return Math.round(value * 10) / 10
}

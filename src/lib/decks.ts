/**
 * Baralhos de pontuação.
 *
 * Cada carta tem um rótulo (o que aparece na mesa) e um valor numérico (o que
 * entra na conta). Separar os dois é o que permite um baralho de camisetas —
 * "M" na carta, 3 na soma — sem quebrar a divisão de pontos entre as pessoas.
 *
 * Cartas de valor `null` não pontuam: são sinalizações.
 */

export interface Card {
  label: string
  value: number | null
}

export type DeckId = 'fibonacci' | 'fibonacci_mod' | 'linear' | 'powers' | 'tshirt' | 'custom'

/** Sempre presentes, em qualquer baralho. */
export const UNSURE: Card = { label: '?', value: null }
export const BREAK: Card = { label: '☕', value: null }
export const PENDING: Card = { label: 'Ag. Definição', value: null }
export const SPECIAL_CARDS: Card[] = [UNSURE, BREAK, PENDING]

const numeric = (...values: number[]): Card[] =>
  values.map((v) => ({ label: formatPoints(v), value: v }))

/** 0.5 vira "½" na carta — cabe melhor e lê melhor de longe. */
export function formatPoints(value: number): string {
  if (value === 0.5) return '½'
  return String(Number(value.toFixed(1)).toString().replace(/\.0$/, ''))
}

export interface Deck {
  id: DeckId
  name: string
  description: string
  cards: Card[]
}

export const DECKS: Record<Exclude<DeckId, 'custom'>, Deck> = {
  fibonacci: {
    id: 'fibonacci',
    name: 'Fibonacci',
    description: 'O clássico do planning poker. Os saltos crescem junto com a incerteza.',
    cards: numeric(0, 0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89),
  },
  fibonacci_mod: {
    id: 'fibonacci_mod',
    name: 'Fibonacci modificada',
    description: 'Arredonda os números grandes. É o baralho mais vendido para Scrum.',
    cards: numeric(0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100),
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    description: 'De 1 a 10, sem saltos. Bom para tarefas parecidas entre si.',
    cards: numeric(0, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
  },
  powers: {
    id: 'powers',
    name: 'Potências de 2',
    description: 'Cada carta dobra a anterior. Força a decidir a ordem de grandeza.',
    cards: numeric(0, 0.5, 1, 2, 4, 8, 16, 32, 64),
  },
  tshirt: {
    id: 'tshirt',
    name: 'Camisetas',
    description: 'Tamanhos em vez de números, para quem trava com pontos. A conta usa o equivalente numérico.',
    cards: [
      { label: 'PP', value: 1 },
      { label: 'P', value: 2 },
      { label: 'M', value: 3 },
      { label: 'G', value: 5 },
      { label: 'GG', value: 8 },
      { label: 'XGG', value: 13 },
    ],
  },
}

export const DECK_ORDER: Array<Exclude<DeckId, 'custom'>> = [
  'fibonacci',
  'fibonacci_mod',
  'linear',
  'powers',
  'tshirt',
]

export const DEFAULT_DECK = 'fibonacci' as const

/** Baralho completo: as cartas do estilo escolhido mais as sinalizações. */
export function buildScale(cards: Card[]): Card[] {
  return [...cards, ...SPECIAL_CARDS]
}

export function deckScale(id: Exclude<DeckId, 'custom'>): Card[] {
  return buildScale(DECKS[id].cards)
}

/**
 * Lê a lista digitada no baralho personalizado.
 *
 * Quem escreve em português digita "0,5" para meio ponto — então a vírgula é
 * decimal, e quem separa as cartas é o espaço. Uma vírgula no fim do número
 * ("0,5, 1, 2") é separador e some; duas dentro do mesmo número não têm leitura
 * possível e viram erro, em vez de "0,5" virar silenciosamente 0 e 5.
 */
export function parseCustomDeck(input: string): { cards: Card[]; error: string | null } {
  const parts = input
    .split(/[\s;]+/)
    .map((p) => p.replace(/^[,;]+|[,;]+$/g, ''))
    .filter(Boolean)

  if (parts.length === 0) return { cards: [], error: 'Escreva pelo menos dois valores' }

  const cards: Card[] = []
  for (const part of parts) {
    if ((part.match(/[.,]/g)?.length ?? 0) > 1) {
      return { cards: [], error: 'Separe as cartas por espaço — a vírgula é o decimal' }
    }

    const value = Number(part.replace(',', '.'))
    if (Number.isNaN(value)) return { cards: [], error: `"${part}" não é um número` }
    if (value < 0) return { cards: [], error: 'Não use valores negativos' }
    if (value > 999) return { cards: [], error: 'Valores até 999' }
    if (cards.some((c) => c.value === value)) continue
    cards.push({ label: formatPoints(value), value })
  }

  if (cards.length < 2) return { cards: [], error: 'Escreva pelo menos dois valores' }
  if (cards.length > 20) return { cards: [], error: 'No máximo 20 cartas' }

  cards.sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
  return { cards, error: null }
}

/** Só as cartas que pontuam, para o seletor de total da história. */
export function scoringCards(scale: Card[]): Card[] {
  return scale.filter((c) => c.value !== null)
}

export function cardByLabel(scale: Card[], label: string): Card | undefined {
  return scale.find((c) => c.label === label)
}

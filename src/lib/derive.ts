import { windowStats, type WindowStats } from './holidays'
import { roleScores, roleVotes } from '@/types'
import type { Player, RoomState, Story, StoryParticipant, VotingSide } from '@/types'

export interface ScoredStory {
  storyId: string
  title: string
  link: string | null
  side: VotingSide
  points: number
  pending: boolean
}

export interface PlayerSummary {
  player: Player
  total: number
  stories: ScoredStory[]
}

/** Quem recebe pontos: Tech Lead, Front e Back. */
export function scorersOf(players: Player[]): Player[] {
  return players.filter((p) => roleScores(p.role))
}

/** Quem tem baralho na mão nesta sala. */
export function votersOf(players: Player[], qaVotes: boolean): Player[] {
  return players.filter((p) => roleVotes(p.role, qaVotes))
}

/** Quem está na cerimônia sem carta: o PO, e a QA quando ela não vota. */
export function watchersOf(players: Player[], qaVotes: boolean): Player[] {
  return players.filter((p) => !roleVotes(p.role, qaVotes))
}

/** Quebra dos pontos por pessoa, na ordem do ranking. */
export function summarize(state: RoomState): PlayerSummary[] {
  const byStory = new Map<string, Story>(state.stories.map((s) => [s.id, s]))

  const rows = scorersOf(state.players).map((player) => {
    const mine = state.participants.filter(
      (p: StoryParticipant) => p.player_id === player.id,
    )

    const stories: ScoredStory[] = mine
      .map((participation) => {
        const story = byStory.get(participation.story_id)
        if (!story) return null
        return {
          storyId: story.id,
          title: story.title,
          link: story.link,
          side: participation.side,
          points: Number(participation.points),
          pending: participation.pending,
        }
      })
      .filter((s): s is ScoredStory => s !== null)
      .sort((a, b) => a.title.localeCompare(b.title))

    return { player, total: Number(player.accumulated_points), stories }
  })

  return rows.sort((a, b) => b.total - a.total)
}

/** Tempo médio de discussão, em segundos, sobre as histórias já fechadas. */
export function averageStorySeconds(stories: Story[]): number {
  const timed = stories.filter((s) => s.started_at && s.ended_at)
  if (timed.length === 0) return 0
  const total = timed.reduce(
    (sum, s) =>
      sum + (new Date(s.ended_at!).getTime() - new Date(s.started_at!).getTime()),
    0,
  )
  return Math.floor(total / timed.length / 1000)
}

export function sprintIsComplete(state: RoomState): boolean {
  return state.stories.length > 0 && state.room.current_story_index >= state.stories.length
}

/** Texto plano do resumo, no formato que o time já colava no ticket. */
export function summaryAsText(summaries: PlayerSummary[]): string {
  return summaries
    .map((row) => {
      const lines = row.stories.map((s) => {
        const parts = [` - ${s.title}`]
        if (s.link) parts.push(s.link)
        if (s.pending) parts.push('(Ag. Definição)')
        return parts.join(' ')
      })
      return [`${row.player.name} ${row.total}`, ...lines].join('\n')
    })
    .join('\n\n')
}

/* -------------------------------------------------------------------------- */
/* Capacidade                                                                  */
/* -------------------------------------------------------------------------- */


export interface CapacityRow {
  player: Player
  /** Dias úteis da sprint menos as ausências desta pessoa. */
  availableDays: number
  capacity: number
  committed: number
  /** Positivo = ainda cabe; negativo = passou do que ela assume. */
  slack: number
}

export interface TeamCapacity {
  window: WindowStats
  rows: CapacityRow[]
  capacity: number
  committed: number
  slack: number
  /** 0 a 1+ — quanto da capacidade já foi comprometido. */
  ratio: number
  /** Ninguém definiu capacidade ainda: o cabeçalho mostra só o total. */
  unset: boolean
}

export function teamCapacity(state: RoomState): TeamCapacity {
  const stats = windowStats({
    start: state.room.sprint_start,
    days: state.room.sprint_days,
    holidays: state.room.holidays ?? [],
  })

  const rows: CapacityRow[] = scorersOf(state.players).map((player) => {
    const capacity = Number(player.capacity_points)
    const committed = Number(player.accumulated_points)
    return {
      player,
      availableDays: Math.max(0, stats.workingDays - player.days_off),
      capacity,
      committed,
      slack: capacity - committed,
    }
  })

  const capacity = rows.reduce((sum, r) => sum + r.capacity, 0)
  const committed = rows.reduce((sum, r) => sum + r.committed, 0)

  return {
    window: stats,
    rows,
    capacity,
    committed,
    slack: capacity - committed,
    ratio: capacity > 0 ? committed / capacity : 0,
    unset: capacity === 0,
  }
}

/**
 * Sugestão de capacidade a partir de um ritmo em pontos por dia. Arredonda em
 * meios pontos, que é a menor fração que o time usa na divisão.
 */
export function suggestCapacity(availableDays: number, pointsPerDay: number): number {
  return Math.round(availableDays * pointsPerDay * 2) / 2
}

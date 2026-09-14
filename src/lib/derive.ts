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

/** O PO acompanha a sessão mas não recebe pontos. */
export function scorersOf(players: Player[]): Player[] {
  return players.filter((p) => p.role !== 'po')
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

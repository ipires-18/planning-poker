import {
  averageStorySeconds,
  scorersOf,
  sprintIsComplete,
  summarize,
  teamCapacity,
  votersOf,
  watchersOf,
  type PlayerSummary,
  type TeamCapacity,
} from './derive'
import { roleVotes, type Player, type RoomState, type Story, type Vote } from '@/types'

/**
 * Tudo que a mesa precisa saber, derivado de uma vez só.
 *
 * Fica fora do React de propósito: é uma função pura sobre o estado da sala, o
 * que a torna conferível sem montar componente nenhum — e mantém a página livre
 * para cuidar só de layout.
 */
export interface GameView {
  /** A cadeira de quem está olhando, se houver. */
  me: Player | null
  /** Dono da sala, PO ou Tech Lead: quem revela e fecha pontuação. */
  isHost: boolean
  /** Se quem está olhando recebe baralho nesta sala. */
  canVote: boolean

  currentStory: Story | null
  sprintComplete: boolean
  averageSeconds: number

  /** Com baralho na mão. */
  voters: Player[]
  /** Na cerimônia, sem carta: o PO e, quando não vota, a QA. */
  watchers: Player[]
  /** Donos de entrega, que aparecem na divisão de pontos. */
  scorers: Player[]

  votedCount: number
  voterCount: number
  everyoneVoted: boolean
  canReveal: boolean

  /** Votos da rodada corrente que a RLS deixou chegar até aqui. */
  roundVotes: Vote[]
  /** Os mesmos votos com a pessoa junto, prontos para a apuração. */
  castVotes: { player: Player; label: string }[]
  myVote: string | null

  summaries: PlayerSummary[]
  capacity: TeamCapacity
  /** Identidade da rodada — serve de `key` para remontar a apuração. */
  roundKey: string
}

export function buildGameView(state: RoomState, userId: string | null): GameView {
  const { room, players, stories, votes } = state

  const me = players.find((p) => p.user_id === userId) ?? null
  const isHost = Boolean(
    me && (room.owner_user_id === userId || me.role === 'po' || me.role === 'tech_lead'),
  )

  const currentStory = stories[room.current_story_index] ?? null

  const voters = votersOf(players, room.qa_votes)
  const watchers = watchersOf(players, room.qa_votes)
  const scorers = scorersOf(players)

  const roundVotes = currentStory
    ? votes.filter(
        (v) =>
          v.story_id === currentStory.id &&
          v.round === room.current_round &&
          v.side === room.current_side,
      )
    : []

  const byId = new Map(players.map((p) => [p.id, p]))
  const castVotes = roundVotes.flatMap((vote) => {
    const player = byId.get(vote.player_id)
    return player ? [{ player, label: vote.value }] : []
  })

  // Quem conta é a luz pública na cadeira, não `roundVotes`: antes da revelação
  // a RLS só entrega o seu próprio voto.
  const votedCount = voters.filter((p) => p.has_voted).length
  const voterCount = voters.length

  return {
    me,
    isHost,
    canVote: Boolean(me && roleVotes(me.role, room.qa_votes)),

    currentStory,
    sprintComplete: sprintIsComplete(state),
    averageSeconds: averageStorySeconds(stories),

    voters,
    watchers,
    scorers,

    votedCount,
    voterCount,
    everyoneVoted: voterCount > 0 && votedCount === voterCount,
    canReveal: votedCount > 0 && !room.revealed,

    roundVotes,
    castVotes,
    myVote: roundVotes.find((v) => v.player_id === me?.id)?.value ?? null,

    summaries: summarize(state),
    capacity: teamCapacity(state),
    roundKey: `${room.current_round}-${room.current_story_index}-${room.current_side}`,
  }
}

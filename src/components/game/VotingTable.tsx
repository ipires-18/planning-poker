import { PlayerSeat } from '../PlayerSeat'
import type { Player, Vote } from '@/types'

interface Props {
  voters: Player[]
  roundVotes: Vote[]
  revealed: boolean
  online: Set<string>
  youId: string | null
}

/** A mesa: uma cadeira por pessoa com baralho. */
export function VotingTable({ voters, roundVotes, revealed, online, youId }: Props) {
  const voteByPlayer = new Map(roundVotes.map((v) => [v.player_id, v.value]))

  return (
    <div className="grid w-full max-w-4xl grid-cols-3 justify-items-center gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-5">
      {voters.map((player) => (
        <PlayerSeat
          key={player.id}
          player={player}
          vote={voteByPlayer.get(player.id) ?? null}
          hasVoted={player.has_voted}
          revealed={revealed}
          isYou={player.user_id === youId}
          isOnline={online.has(player.user_id)}
        />
      ))}
    </div>
  )
}

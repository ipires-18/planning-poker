import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorNote } from '../ui'
import { RoomHeader } from '../RoomHeader'
import { Roster } from '../Roster'
import { CardDeck } from '../CardDeck'
import { ResultsPanel } from '../ResultsPanel'
import { SprintSummary } from '../SprintSummary'
import { SprintProgress, StoryStage } from '../StoryStage'
import { VotingTable } from './VotingTable'
import { WatchersStrip } from './WatchersStrip'
import { VoteProgress } from './VoteProgress'
import { StoriesModal } from './StoriesModal'
import { CapacityModal } from './CapacityModal'
import { useGameActions } from '@/hooks/useGameActions'
import { useTheme } from '@/hooks/useTheme'
import { buildGameView } from '@/lib/gameView'
import type { RoomState } from '@/types'

interface Props {
  roomId: string
  state: RoomState
  userId: string | null
  online: Set<string>
  refresh: () => Promise<void>
}

/** A mesa, com o estado da sala já garantido. Cuida de layout e de quem abre. */
export function GameScreen({ roomId, state, userId, online, refresh }: Props) {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const actions = useGameActions(roomId, refresh)

  const [storiesOpen, setStoriesOpen] = useState(false)
  const [capacityOpen, setCapacityOpen] = useState(false)

  const view = useMemo(() => buildGameView(state, userId), [state, userId])
  const { room } = state
  // Numa constante local o TypeScript consegue estreitar o tipo dentro dos
  // callbacks; lida de `view.currentStory` a cada uso, exigiria `!` em todos.
  const { currentStory } = view

  const openStories = () => setStoriesOpen(true)

  const endGame = () => {
    if (window.confirm('Encerrar a sessão para todo mundo?')) void actions.endGame()
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader
        sessionName={room.session_name}
        roomId={roomId}
        isHost={view.isHost}
        canReveal={view.canReveal}
        sprintComplete={view.sprintComplete}
        capacity={view.capacity}
        theme={theme}
        onToggleTheme={toggle}
        onReveal={() => void actions.reveal()}
        onAddStory={openStories}
        onEndGame={endGame}
        onOpenCapacity={view.isHost ? () => setCapacityOpen(true) : undefined}
      />

      {actions.error && (
        <div className="px-4 pt-3 sm:px-6">
          <ErrorNote>{actions.error}</ErrorNote>
        </div>
      )}

      <div className="flex flex-1">
        <Roster
          summaries={view.summaries}
          capacity={view.capacity}
          watchers={view.watchers}
          online={online}
          youId={userId}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          {view.sprintComplete ? (
            <SprintSummary
              summaries={view.summaries}
              averageSeconds={view.averageSeconds}
              isHost={view.isHost}
              onAdjust={actions.adjustPoints}
              onAddStory={openStories}
              onLeave={() => navigate('/')}
            />
          ) : (
            <>
              {currentStory && (
                <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
                  <SprintProgress
                    stories={state.stories}
                    currentIndex={room.current_story_index}
                  />
                  <StoryStage
                    story={currentStory}
                    side={room.current_side}
                    isHost={view.isHost}
                    onKindChange={(kind) => void actions.setStoryKind(currentStory.id, kind)}
                    onStartTimer={() => void actions.startTimer(currentStory.id)}
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-10 sm:px-6">
                <VotingTable
                  voters={view.voters}
                  roundVotes={view.roundVotes}
                  revealed={room.revealed}
                  online={online}
                  youId={userId}
                />

                <WatchersStrip watchers={view.watchers} online={online} youId={userId} />

                {room.revealed ? (
                  <ResultsPanel
                    // Remonta a cada rodada, para que os campos da divisão
                    // recomecem do zero em vez de herdar a história anterior.
                    key={view.roundKey}
                    scale={room.point_scale}
                    votes={view.castVotes}
                    scorers={view.scorers}
                    voterCount={view.voterCount}
                    isHost={view.isHost}
                    onConfirm={actions.confirmStory}
                    onReset={() => void actions.resetRound()}
                  />
                ) : (
                  <VoteProgress
                    voted={view.votedCount}
                    total={view.voterCount}
                    everyoneVoted={view.everyoneVoted}
                  />
                )}
              </div>

              {/* Só quem vota nesta sala recebe baralho. */}
              {view.canVote && currentStory && (
                <CardDeck
                  scale={room.point_scale}
                  selected={view.myVote}
                  disabled={room.revealed}
                  onSelect={(label) =>
                    void actions.vote(
                      currentStory,
                      room.current_side,
                      room.current_round,
                      label,
                    )
                  }
                />
              )}
            </>
          )}
        </main>
      </div>

      <StoriesModal
        open={storiesOpen}
        onClose={() => setStoriesOpen(false)}
        stories={state.stories}
        room={room}
        onAdd={actions.addStory}
        onEdit={actions.editStory}
        onRemove={actions.removeStory}
        onReorder={actions.reorderStories}
      />

      <CapacityModal
        open={capacityOpen}
        onClose={() => setCapacityOpen(false)}
        room={room}
        players={state.players}
        capacity={view.capacity}
        onSaveWindow={actions.setSprintWindow}
        onSaveCapacity={actions.setCapacity}
        onToggleQaVoting={actions.setQaVoting}
      />
    </div>
  )
}

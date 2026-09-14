import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Button, ErrorNote, Modal, Spinner } from '@/components/ui'
import { RoomHeader } from '@/components/RoomHeader'
import { Roster } from '@/components/Roster'
import { PlayerSeat } from '@/components/PlayerSeat'
import { CardDeck } from '@/components/CardDeck'
import { ResultsPanel } from '@/components/ResultsPanel'
import { SprintSummary } from '@/components/SprintSummary'
import { SprintProgress, StoryStage } from '@/components/StoryStage'
import { StoryEditor, StoryQueue, type QueueItem, type StoryEdit } from '@/components/StoryQueue'
import { CapacityPanel } from '@/components/CapacityPanel'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useRoomState } from '@/hooks/useRoomState'
import * as api from '@/lib/api'
import {
  averageStorySeconds,
  scorersOf,
  sprintIsComplete,
  summarize,
  teamCapacity,
  votersOf,
  watchersOf,
} from '@/lib/derive'
import {
  ROLE_ACCENT,
  ROLE_SHORT,
  roleVotes,
  type Allocation,
  type CapacityEntry,
  type VotingSide,
} from '@/types'

export default function Game() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const { userId, ready } = useAuth()
  const { theme, toggle } = useTheme()
  const { state, loading, error, online, refresh } = useRoomState(roomId, userId)

  const [actionError, setActionError] = useState('')
  const [storiesOpen, setStoriesOpen] = useState(false)
  const [addingStory, setAddingStory] = useState(false)
  const [capacityOpen, setCapacityOpen] = useState(false)

  const me = state?.players.find((p) => p.user_id === userId) ?? null

  /** Quem conduz a sessão: dono da sala, PO ou Tech Lead. */
  const isHost = Boolean(
    state && me && (state.room.owner_user_id === userId || me.role === 'po' || me.role === 'tech_lead'),
  )

  const complete = state ? sprintIsComplete(state) : false
  const currentStory = state?.stories[state.room.current_story_index] ?? null

  /** Votos da rodada corrente — o RLS já filtrou o que você não pode ver. */
  const roundVotes = useMemo(() => {
    if (!state || !currentStory) return []
    return state.votes.filter(
      (v) =>
        v.story_id === currentStory.id &&
        v.round === state.room.current_round &&
        v.side === state.room.current_side,
    )
  }, [state, currentStory])

  const myVote = roundVotes.find((v) => v.player_id === me?.id)?.value ?? null

  const summaries = useMemo(() => (state ? summarize(state) : []), [state])
  const scorers = useMemo(() => (state ? scorersOf(state.players) : []), [state])
  const voters = useMemo(
    () => (state ? votersOf(state.players, state.room.qa_votes) : []),
    [state],
  )
  /** Na cerimônia, mas sem carta na mão. */
  const watchers = useMemo(
    () => (state ? watchersOf(state.players, state.room.qa_votes) : []),
    [state],
  )
  const iVote = Boolean(state && me && roleVotes(me.role, state.room.qa_votes))

  const capacity = useMemo(
    () =>
      state
        ? teamCapacity(state)
        : null,
    [state],
  )

  const storyItems: QueueItem[] = useMemo(
    () =>
      state?.stories.map((story, index) => ({
        id: story.id,
        title: story.title,
        link: story.link,
        kind: story.kind,
        locked: index < state.room.current_story_index,
        current: index === state.room.current_story_index,
      })) ?? [],
    [state],
  )

  /* --- guardas de navegação ------------------------------------------------ */

  useEffect(() => {
    if (loading || !ready || !state) return
    // Sem cadeira nesta sala? Passe pela porta da frente.
    if (!me) navigate(`/entrar/${roomId}`, { replace: true })
  }, [loading, ready, state, me, roomId, navigate])

  useEffect(() => {
    if (state?.room.ended) navigate('/', { replace: true })
  }, [state?.room.ended, navigate])

  /* --- ações --------------------------------------------------------------- */

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setActionError('')
      await fn()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Algo deu errado')
    }
  }, [])

  const vote = (value: string) => {
    if (!state || !me || !currentStory) return
    void run(() =>
      api.castVote(
        roomId,
        currentStory.id,
        state.room.current_side,
        state.room.current_round,
        value,
      ),
    )
  }

  const confirmStory = async (points: number | null, allocations: Allocation[]) => {
    await run(async () => {
      await api.commitStory(roomId, points, allocations)
      // commit_story mexe em cinco tabelas de uma vez; um refresh deixa a tela
      // consistente sem depender da ordem de chegada dos eventos.
      await refresh()
    })
  }

  const adjust = async (
    storyId: string,
    playerId: string,
    side: VotingSide,
    points: number,
  ) => {
    await run(async () => {
      await api.adjustParticipantPoints(storyId, playerId, side, points)
      await refresh()
    })
  }

  /* --- gestão das histórias ------------------------------------------------ */

  const addNewStory = async (edit: StoryEdit) => {
    await run(async () => {
      await api.addStory(roomId, edit.title, edit.link, edit.kind)
      await refresh()
      setAddingStory(false)
    })
  }

  const editStory = async (storyId: string, edit: StoryEdit) => {
    await run(async () => {
      await api.updateStory(storyId, edit.title, edit.link, edit.kind)
      await refresh()
    })
  }

  const removeStory = async (storyId: string) => {
    await run(async () => {
      await api.deleteStory(storyId)
      await refresh()
    })
  }

  /**
   * Só a fila pendente se move — as histórias já pontuadas ficam onde estão,
   * senão o resumo da sessão passaria a contar outra coisa.
   */
  const moveStory = async (storyId: string, delta: -1 | 1) => {
    if (!state) return
    const pending = state.stories.slice(state.room.current_story_index)
    const from = pending.findIndex((s) => s.id === storyId)
    const to = from + delta
    if (from === -1 || to < 0 || to >= pending.length) return

    const next = [...pending]
    ;[next[from], next[to]] = [next[to], next[from]]

    await run(async () => {
      await api.reorderStories(roomId, next.map((s) => s.id))
      await refresh()
    })
  }

  const saveSprintWindow = async (next: {
    start: string
    days: number
    holidays: import('@/lib/holidays').Holiday[]
  }) => {
    await run(async () => {
      await api.setSprintWindow(roomId, next)
      await refresh()
    })
  }

  const saveCapacity = async (entries: CapacityEntry[]) => {
    await run(async () => {
      await api.setTeamCapacity(roomId, entries)
      await refresh()
      setCapacityOpen(false)
    })
  }

  const endGame = () => {
    if (!window.confirm('Encerrar a sessão para todo mundo?')) return
    void run(() => api.endGame(roomId))
  }

  /* --- estados de carregamento --------------------------------------------- */

  if (!ready || loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner label="Entrando na mesa..." />
      </main>
    )
  }

  if (error || !state) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="card-surface max-w-sm p-8 text-center">
          <div className="mb-4 text-5xl" aria-hidden>
            🃏
          </div>
          <h2 className="mb-2 text-2xl font-black">Sala não encontrada</h2>
          <p className="mb-6 text-sm text-ink-muted">
            {error ?? 'Ela pode ter sido encerrada ou expirado.'}
          </p>
          <Button className="w-full" onClick={() => navigate('/')}>
            Voltar ao início
          </Button>
        </div>
      </main>
    )
  }

  // `roundVotes` só traz o que a RLS deixa ver — antes da revelação, apenas o
  // seu próprio voto. Quem conta é a luz pública na cadeira.
  const votedCount = voters.filter((p) => p.has_voted).length
  const expected = voters.length

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader
        sessionName={state.room.session_name}
        roomId={roomId}
        isHost={isHost}
        canReveal={votedCount > 0 && !state.room.revealed}
        sprintComplete={complete}
        theme={theme}
        onToggleTheme={toggle}
        onReveal={() => void run(() => api.revealRound(roomId))}
        onAddStory={() => setStoriesOpen(true)}
        onEndGame={endGame}
        capacity={capacity!}
        onOpenCapacity={isHost ? () => setCapacityOpen(true) : undefined}
      />

      {actionError && (
        <div className="px-4 pt-3 sm:px-6">
          <ErrorNote>{actionError}</ErrorNote>
        </div>
      )}

      <div className="flex flex-1">
        <Roster
            summaries={summaries}
            capacity={capacity!}
            watchers={watchers}
            online={online}
            youId={userId}
          />

        <main className="flex min-w-0 flex-1 flex-col">
          {complete ? (
            <SprintSummary
              summaries={summaries}
              averageSeconds={averageStorySeconds(state.stories)}
              isHost={isHost}
              onAdjust={adjust}
              onAddStory={() => setStoriesOpen(true)}
              onLeave={() => navigate('/')}
            />
          ) : (
            <>
              {currentStory && (
                <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
                  <SprintProgress
                    stories={state.stories}
                    currentIndex={state.room.current_story_index}
                  />
                  <StoryStage
                    story={currentStory}
                    side={state.room.current_side}
                    isHost={isHost}
                    onKindChange={(kind) =>
                      void run(() => api.setStoryKind(currentStory.id, kind))
                    }
                    onStartTimer={() => void run(() => api.startStoryTimer(currentStory.id))}
                  />
                </div>
              )}

              {/* Mesa */}
              <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-10 sm:px-6">
                <div className="grid w-full max-w-4xl grid-cols-3 justify-items-center gap-x-6 gap-y-10 sm:grid-cols-4 lg:grid-cols-5">
                  {voters.map((player) => {
                    const cast = roundVotes.find((v) => v.player_id === player.id)
                    return (
                      <PlayerSeat
                        key={player.id}
                        player={player}
                        vote={cast?.value ?? null}
                        hasVoted={player.has_voted}
                        revealed={state.room.revealed}
                        isYou={player.user_id === userId}
                        isOnline={online.has(player.user_id)}
                      />
                    )
                  })}
                </div>

                {watchers.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-ink-subtle">
                    <span className="uppercase tracking-[0.16em]">Na cerimônia</span>
                    {watchers.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5">
                        <Avatar
                          name={p.name}
                          color={ROLE_ACCENT[p.role]}
                          size={22}
                          dimmed={!online.has(p.user_id)}
                        />
                        {p.name}
                        {p.user_id === userId && ' (você)'}
                        <span
                          className="text-[9px] font-black uppercase tracking-wider"
                          style={{ color: ROLE_ACCENT[p.role] }}
                        >
                          {ROLE_SHORT[p.role]}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {state.room.revealed ? (
                  <ResultsPanel
                    key={`${state.room.current_round}-${state.room.current_story_index}-${state.room.current_side}`}
                    scale={state.room.point_scale}
                    votes={roundVotes
                      .map((v) => ({
                        player: state.players.find((p) => p.id === v.player_id)!,
                        label: v.value,
                      }))
                      .filter((v) => v.player)}
                    scorers={scorers}
                    isHost={isHost}
                    onConfirm={confirmStory}
                    onReset={() => void run(() => api.resetRound(roomId))}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface-raised)] px-5 py-3 shadow-sm">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
                    </span>
                    <p className="text-sm font-bold text-ink-muted">
                      {votedCount} de {expected} {votedCount === 1 ? 'votou' : 'votaram'}
                      {votedCount >= expected && expected > 0 && ' · pode revelar!'}
                    </p>
                  </div>
                )}
              </div>

              {/* Só quem vota nesta sala recebe baralho. */}
              {iVote && currentStory && (
                <CardDeck
                  scale={state.room.point_scale}
                  selected={myVote}
                  onSelect={vote}
                  disabled={state.room.revealed}
                />
              )}
            </>
          )}
        </main>
      </div>

      <Modal
        open={storiesOpen}
        onClose={() => {
          setStoriesOpen(false)
          setAddingStory(false)
        }}
        title="Histórias da sprint"
      >
        <div className="space-y-5">
          <p className="text-xs text-ink-subtle">
            As já pontuadas ficam travadas no lugar — mexer nelas mudaria o resumo da
            sessão. A fila pendente você reordena com ▲▼.
          </p>

          <div className="max-h-[45vh] overflow-y-auto pr-1">
            <StoryQueue
              items={storyItems}
              onEdit={editStory}
              onDelete={removeStory}
              onMove={moveStory}
            />
          </div>

          {addingStory ? (
            <div className="card-surface p-4">
              <StoryEditor
                initial={{ title: '', link: '', kind: 'both' }}
                saveLabel="Adicionar"
                onSave={addNewStory}
                onCancel={() => setAddingStory(false)}
              />
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setAddingStory(true)}
            >
              + Nova história
            </Button>
          )}
        </div>
      </Modal>

      <Modal
        open={capacityOpen}
        onClose={() => setCapacityOpen(false)}
        title="Time e capacidade"
        size="lg"
      >
        {capacity && (
          <CapacityPanel
            capacity={capacity}
            sprint={{
              start: state.room.sprint_start,
              days: state.room.sprint_days,
              holidays: state.room.holidays ?? [],
            }}
            qaVotes={state.room.qa_votes}
            qaPresent={state.players.some((p) => p.role === 'qa')}
            onToggleQaVoting={(enabled) =>
              void run(async () => {
                await api.setQaVoting(roomId, enabled)
                await refresh()
              })
            }
            onSaveWindow={saveSprintWindow}
            onSaveCapacity={saveCapacity}
          />
        )}
      </Modal>
    </div>
  )
}

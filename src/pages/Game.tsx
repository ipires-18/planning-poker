import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Button, ErrorNote, Field, Input, Modal, Select, Spinner } from '@/components/ui'
import { RoomHeader } from '@/components/RoomHeader'
import { Roster } from '@/components/Roster'
import { PlayerSeat } from '@/components/PlayerSeat'
import { CardDeck } from '@/components/CardDeck'
import { ResultsPanel } from '@/components/ResultsPanel'
import { SprintSummary } from '@/components/SprintSummary'
import { SprintProgress, StoryStage } from '@/components/StoryStage'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useRoomState } from '@/hooks/useRoomState'
import * as api from '@/lib/api'
import { averageStorySeconds, scorersOf, sprintIsComplete, summarize } from '@/lib/derive'
import { KIND_LABEL, ROLE_ACCENT, type Allocation, type StoryKind, type VotingSide } from '@/types'

export default function Game() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const { userId, ready } = useAuth()
  const { theme, toggle } = useTheme()
  const { state, loading, error, online, refresh } = useRoomState(roomId, userId)

  const [actionError, setActionError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newLink, setNewLink] = useState('')
  const [newKind, setNewKind] = useState<StoryKind>('both')

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
  const observers = useMemo(
    () => state?.players.filter((p) => p.role === 'po') ?? [],
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

  const submitNewStory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await run(async () => {
      await api.addStory(roomId, newTitle.trim(), newLink.trim(), newKind)
      await refresh()
      setAddOpen(false)
      setNewTitle('')
      setNewLink('')
      setNewKind('both')
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
  const votedCount = scorers.filter((p) => p.has_voted).length
  const expected = scorers.length

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
        onAddStory={() => setAddOpen(true)}
        onEndGame={endGame}
      />

      {actionError && (
        <div className="px-4 pt-3 sm:px-6">
          <ErrorNote>{actionError}</ErrorNote>
        </div>
      )}

      <div className="flex flex-1">
        <Roster summaries={summaries} online={online} youId={userId} />

        <main className="flex min-w-0 flex-1 flex-col">
          {complete ? (
            <SprintSummary
              summaries={summaries}
              averageSeconds={averageStorySeconds(state.stories)}
              isHost={isHost}
              onAdjust={adjust}
              onAddStory={() => setAddOpen(true)}
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
                  {scorers.map((player) => {
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

                {observers.length > 0 && (
                  <div className="flex items-center gap-3 text-xs font-bold text-ink-subtle">
                    <span className="uppercase tracking-[0.16em]">Observando</span>
                    {observers.map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5">
                        <Avatar
                          name={p.name}
                          color={ROLE_ACCENT[p.role]}
                          size={22}
                          dimmed={!online.has(p.user_id)}
                        />
                        {p.name}
                        {p.user_id === userId && ' (você)'}
                      </span>
                    ))}
                  </div>
                )}

                {state.room.revealed ? (
                  <ResultsPanel
                    key={`${state.room.current_round}-${state.room.current_story_index}-${state.room.current_side}`}
                    votes={roundVotes
                      .map((v) => ({
                        player: state.players.find((p) => p.id === v.player_id)!,
                        value: v.value,
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

              {/* O PO observa; quem pontua tem o baralho. */}
              {me && me.role !== 'po' && currentStory && (
                <CardDeck
                  selected={myVote}
                  onSelect={vote}
                  disabled={state.room.revealed}
                />
              )}
            </>
          )}
        </main>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nova história">
        <form onSubmit={submitNewStory} className="space-y-5">
          <Field label="Título">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Refatorar o endpoint de busca"
              maxLength={200}
              autoFocus
            />
          </Field>
          <Field label="Link do ticket" hint="Opcional">
            <Input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://..."
              inputMode="url"
            />
          </Field>
          <Field label="Tipo">
            <Select value={newKind} onChange={(e) => setNewKind(e.target.value as StoryKind)}>
              <option value="both">{KIND_LABEL.both}</option>
              <option value="frontend">{KIND_LABEL.frontend}</option>
              <option value="backend">{KIND_LABEL.backend}</option>
            </Select>
          </Field>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="joy" className="flex-1">
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

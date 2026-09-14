import { useCallback, useMemo, useState } from 'react'
import * as api from '@/lib/api'
import type { Holiday } from '@/lib/holidays'
import type {
  Allocation,
  CapacityEntry,
  OptionalVoterRole,
  Story,
  StoryKind,
  VotingSide,
} from '@/types'
import type { StoryEdit } from '@/components/StoryQueue'

export interface SprintWindow {
  start: string
  days: number
  holidays: Holiday[]
}

/**
 * Todas as escritas da mesa num lugar só.
 *
 * Cada ação faz o mesmo ritual — chamar a API, recarregar, e transformar a falha
 * numa mensagem para a tela — então o ritual mora aqui uma vez, em vez de sete
 * vezes espalhadas pela página.
 */
export function useGameActions(roomId: string, refresh: () => Promise<void>) {
  const [error, setError] = useState('')

  /** Executa e traduz a falha. Não recarrega: o realtime já traz mudanças simples. */
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      setError('')
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado')
    }
  }, [])

  /**
   * Para o que mexe em várias tabelas de uma vez. Recarregar deixa a tela
   * consistente sem depender da ordem em que os eventos chegam.
   */
  const mutate = useCallback(
    (fn: () => Promise<unknown>) =>
      run(async () => {
        await fn()
        await refresh()
      }),
    [run, refresh],
  )

  return useMemo(
    () => ({
      error,
      dismissError: () => setError(''),

      /* --- rodada ------------------------------------------------------- */
      vote: (story: Story, side: VotingSide, round: number, label: string) =>
        run(() => api.castVote(roomId, story.id, side, round, label)),

      reveal: () => run(() => api.revealRound(roomId)),
      resetRound: () => run(() => api.resetRound(roomId)),

      confirmStory: (points: number | null, allocations: Allocation[]) =>
        mutate(() => api.commitStory(roomId, points, allocations)),

      /* --- história corrente -------------------------------------------- */
      setStoryKind: (storyId: string, kind: StoryKind) =>
        run(() => api.setStoryKind(storyId, kind)),

      startTimer: (storyId: string) => run(() => api.startStoryTimer(storyId)),

      /* --- fila de histórias -------------------------------------------- */
      addStory: (edit: StoryEdit) =>
        mutate(() => api.addStory(roomId, edit.title, edit.link, edit.kind)),

      editStory: (storyId: string, edit: StoryEdit) =>
        mutate(() => api.updateStory(storyId, edit.title, edit.link, edit.kind)),

      removeStory: (storyId: string) => mutate(() => api.deleteStory(storyId)),

      reorderStories: (storyIds: string[]) =>
        mutate(() => api.reorderStories(roomId, storyIds)),

      /* --- time e capacidade -------------------------------------------- */
      setSprintWindow: (sprint: SprintWindow) =>
        mutate(() => api.setSprintWindow(roomId, sprint)),

      setCapacity: (entries: CapacityEntry[]) =>
        mutate(() => api.setTeamCapacity(roomId, entries)),

      setOptionalVoter: (role: OptionalVoterRole, enabled: boolean) =>
        mutate(() => api.setOptionalVoter(roomId, role, enabled)),

      setDiscussionLimit: (seconds: number) =>
        mutate(() => api.setDiscussionLimit(roomId, seconds)),

      adjustPoints: (storyId: string, playerId: string, side: VotingSide, points: number) =>
        mutate(() => api.adjustParticipantPoints(storyId, playerId, side, points)),

      /* --- sessão -------------------------------------------------------- */
      endGame: (continueLater: boolean) => mutate(() => api.endGame(roomId, continueLater)),
      resumeGame: () => mutate(() => api.resumeGame(roomId)),
    }),
    [roomId, run, mutate, error],
  )
}

export type GameActions = ReturnType<typeof useGameActions>

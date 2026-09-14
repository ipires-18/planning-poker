import { useCallback, useState } from 'react'
import { moveById } from '@/lib/arrays'
import { DEFAULT_DECK, deckScale, type Card, type DeckId } from '@/lib/decks'
import { holidaysInWindow, nextMonday, type Holiday } from '@/lib/holidays'
import type { StoryEdit } from '@/components/StoryQueue'
import type { OptionalVoterRole, StoryKind } from '@/types'

export interface DraftStory {
  id: string
  title: string
  link: string | null
  kind: StoryKind
}

export interface SprintWindowDraft {
  start: string
  days: number
  holidays: Holiday[]
}

/** Duas semanas a partir da próxima segunda é o começo de sprint mais comum. */
function initialWindow(): SprintWindowDraft {
  const start = nextMonday()
  const days = 14
  return { start, days, holidays: holidaysInWindow(start, days) }
}

/**
 * A sprint sendo montada, antes de existir sala.
 *
 * A página tinha oito `useState` soltos e as regras de edição da fila
 * espalhadas entre eles. Aqui viram um estado só, com verbos no lugar de
 * setters — o formulário chama `addStory`, não `setStories([...prev, x])`.
 */
export function useSprintDraft() {
  const [name, setName] = useState('')
  const [hostName, setHostName] = useState('')
  const [stories, setStories] = useState<DraftStory[]>([])
  const [deckId, setDeckId] = useState<DeckId>(DEFAULT_DECK)
  const [scale, setScale] = useState<Card[]>(() => deckScale(DEFAULT_DECK))
  const [sprint, setSprint] = useState<SprintWindowDraft>(initialWindow)

  /**
   * Quem, entre os que não pontuam, começa com baralho. Ninguém, por padrão:
   * voto de quem não pontua é exceção combinada.
   */
  const [optionalVoters, setOptionalVoters] = useState<OptionalVoterRole[]>([])

  /** Timebox de discussão por história. Cinco minutos é o mais usado. */
  const [discussionLimit, setDiscussionLimit] = useState(300)

  const toggleVoter = useCallback((role: OptionalVoterRole, enabled: boolean) => {
    setOptionalVoters((prev) =>
      enabled ? [...new Set([...prev, role])] : prev.filter((r) => r !== role),
    )
  }, [])

  const addStory = useCallback((edit: StoryEdit) => {
    setStories((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: edit.title.trim(),
        link: edit.link.trim() || null,
        kind: edit.kind,
      },
    ])
  }, [])

  const editStory = useCallback((id: string, edit: StoryEdit) => {
    setStories((prev) =>
      prev.map((story) =>
        story.id === id
          ? { ...story, title: edit.title, link: edit.link || null, kind: edit.kind }
          : story,
      ),
    )
  }, [])

  const removeStory = useCallback((id: string) => {
    setStories((prev) => prev.filter((story) => story.id !== id))
  }, [])

  const moveStory = useCallback((id: string, delta: -1 | 1) => {
    setStories((prev) => moveById(prev, id, delta))
  }, [])

  /** A fila inteira na ordem nova, como o arrastar devolve. */
  const reorderStories = useCallback((ids: string[]) => {
    setStories((prev) => {
      const porId = new Map(prev.map((s) => [s.id, s]))
      const next = ids.map((id) => porId.get(id)).filter((s) => s !== undefined)
      return next.length === prev.length ? next : prev
    })
  }, [])

  const chooseDeck = useCallback((id: DeckId, cards: Card[]) => {
    setDeckId(id)
    setScale(cards)
  }, [])

  /** A primeira coisa que falta para poder criar a sala, ou null se está pronta. */
  const missing = (): string | null => {
    if (!name.trim()) return 'Dê um nome para a sprint'
    if (!hostName.trim()) return 'Diga seu nome'
    if (stories.length === 0) return 'Adicione pelo menos uma história'
    return null
  }

  return {
    name,
    setName,
    hostName,
    setHostName,
    stories,
    addStory,
    editStory,
    removeStory,
    moveStory,
    reorderStories,
    deckId,
    scale,
    chooseDeck,
    sprint,
    setSprint,
    optionalVoters,
    toggleVoter,
    discussionLimit,
    setDiscussionLimit,
    missing,
  }
}

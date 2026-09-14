import type { Card, DeckId } from '@/lib/decks'

export type { Card, DeckId }

export type PlayerRole = 'po' | 'tech_lead' | 'frontend' | 'backend' | 'qa'
export type StoryKind = 'frontend' | 'backend' | 'both'
export type VotingSide = 'frontend' | 'backend'

export interface Room {
  id: string
  session_name: string
  deck_id: DeckId
  point_scale: Card[]
  owner_user_id: string
  current_story_index: number
  current_side: VotingSide
  revealed: boolean
  current_round: number
  ended: boolean
  created_at: string
  expires_at: string
}

export interface Player {
  id: string
  room_id: string
  user_id: string
  name: string
  role: PlayerRole
  accumulated_points: number
  has_voted: boolean
  joined_at: string
}

export interface Story {
  id: string
  room_id: string
  position: number
  title: string
  link: string | null
  kind: StoryKind
  frontend_points: number | null
  backend_points: number | null
  frontend_pending: boolean
  backend_pending: boolean
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface Vote {
  id: string
  room_id: string
  story_id: string
  player_id: string
  side: VotingSide
  round: number
  /** O rótulo da carta, não o valor — é o que a mesa mostra ao revelar. */
  value: string
  created_at: string
}

export interface StoryParticipant {
  id: string
  room_id: string
  story_id: string
  player_id: string
  side: VotingSide
  points: number
  pending: boolean
}

/** Alocação enviada ao confirmar a pontuação de uma história. */
export interface Allocation {
  player_id: string
  points: number
  pending: boolean
}

/** Estado completo da sala, montado a partir das cinco tabelas. */
export interface RoomState {
  room: Room
  players: Player[]
  stories: Story[]
  votes: Vote[]
  participants: StoryParticipant[]
}

export const ROLE_LABEL: Record<PlayerRole, string> = {
  po: 'Product Owner',
  tech_lead: 'Tech Lead',
  frontend: 'Front-End',
  backend: 'Back-End',
  qa: 'QA',
}

export const ROLE_SHORT: Record<PlayerRole, string> = {
  po: 'PO',
  tech_lead: 'Lead',
  frontend: 'Front',
  backend: 'Back',
  qa: 'QA',
}

/** Cada papel tem sua cor — é como o olho acha a pessoa na mesa. */
export const ROLE_ACCENT: Record<PlayerRole, string> = {
  po: 'var(--color-zest)',
  tech_lead: 'var(--color-grape)',
  frontend: 'var(--color-sky)',
  backend: 'var(--color-mint)',
  qa: 'var(--color-punch)',
}

export const KIND_LABEL: Record<StoryKind, string> = {
  frontend: 'Somente Front',
  backend: 'Somente Back',
  both: 'Front & Back',
}

export const KIND_COLOR: Record<StoryKind, string> = {
  frontend: 'var(--color-sky)',
  backend: 'var(--color-mint)',
  both: 'var(--color-grape)',
}

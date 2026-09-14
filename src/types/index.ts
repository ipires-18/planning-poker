import type { Card, DeckId } from '@/lib/decks'
import type { Holiday } from '@/lib/holidays'

export type { Card, DeckId, Holiday }

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
  /** Janela da sprint — base para os dias úteis e a capacidade do time. */
  sprint_start: string
  sprint_days: number
  holidays: Holiday[]
  /** Se a QA recebe baralho nesta sessão. Quem define é o PO / Tech Lead. */
  qa_votes: boolean
}

export interface Player {
  id: string
  room_id: string
  user_id: string
  name: string
  role: PlayerRole
  accumulated_points: number
  has_voted: boolean
  /** Quantos pontos esta pessoa assume na sprint. 0 = não definido. */
  capacity_points: number
  /** Dias em que ela não estará (férias, folga, outro time). */
  days_off: number
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

/** Capacidade enviada em lote pelo painel do time. */
export interface CapacityEntry {
  player_id: string
  capacity_points: number
  days_off: number
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

/**
 * Quem é dono de entrega e por isso recebe pontos.
 *
 * O PO conduz e a QA acompanha para conhecer as histórias e levantar pontos —
 * nenhum dos dois carrega story points. Já votar é outra conversa: a QA pode ou
 * não ter baralho, e isso é decidido por sala.
 */
export function roleScores(role: PlayerRole): boolean {
  return role === 'tech_lead' || role === 'frontend' || role === 'backend'
}

export function roleVotes(role: PlayerRole, qaVotes: boolean): boolean {
  if (role === 'po') return false
  if (role === 'qa') return qaVotes
  return true
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

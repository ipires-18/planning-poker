import type { Card, DeckId } from '@/lib/decks'
import type { Holiday } from '@/lib/holidays'

export type { Card, DeckId, Holiday }

export type PlayerRole =
  | 'po'
  | 'tech_lead'
  | 'frontend'
  | 'backend'
  | 'qa'
  | 'designer'
  | 'product'

/**
 * Quem vota só se a sala configurar.
 *
 * É exatamente quem não é dono de entrega: o PO, que conduz, e os convidados,
 * que entram para conhecer as histórias e levantar pontos. Nenhum deles recebe
 * story point em nenhuma configuração — votar e pontuar são coisas separadas.
 *
 * O padrão é todo mundo em `false`: voto de quem não pontua é exceção
 * combinada, e exceção não pode ser o padrão.
 *
 * "Produto" é o nome da cadeira e não da pessoa: é quem vem do negócio naquela
 * sprint, e isso troca.
 */
export const OPTIONAL_VOTERS = ['po', 'qa', 'designer', 'product'] as const

export type OptionalVoterRole = (typeof OPTIONAL_VOTERS)[number]

export function roleIsOptionalVoter(role: PlayerRole): role is OptionalVoterRole {
  return (OPTIONAL_VOTERS as readonly string[]).includes(role)
}
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
  /** Pausada: a sessão de hoje acabou, mas a planning continua em outro dia. */
  to_continue: boolean
  created_at: string
  expires_at: string
  /** Janela da sprint — base para os dias úteis e a capacidade do time. */
  sprint_start: string
  sprint_days: number
  holidays: Holiday[]
  /** Quem, entre os que não pontuam, tem baralho nesta sessão. */
  optional_voters: OptionalVoterRole[]
  /** Timebox de discussão por história, em segundos. 0 desliga o aviso. */
  discussion_limit_seconds: number
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
  designer: 'Designer',
  product: 'Produto',
}

export const ROLE_SHORT: Record<PlayerRole, string> = {
  po: 'PO',
  tech_lead: 'Lead',
  frontend: 'Front',
  backend: 'Back',
  qa: 'QA',
  designer: 'Design',
  product: 'Produto',
}

/**
 * Quem é dono de entrega e por isso recebe pontos.
 *
 * O PO conduz e os convidados acompanham para conhecer as histórias e levantar
 * pontos — nenhum deles carrega story points, em nenhuma configuração. Já votar
 * é outra conversa: cada um pode ou não ter baralho, e isso é decidido por
 * sala. Quem não pontua é exatamente quem tem voto configurável.
 */
export function roleScores(role: PlayerRole): boolean {
  return role === 'tech_lead' || role === 'frontend' || role === 'backend'
}

export function roleVotes(role: PlayerRole, optionalVoters: OptionalVoterRole[]): boolean {
  if (roleIsOptionalVoter(role)) return optionalVoters.includes(role)
  return true
}

export const KIND_LABEL: Record<StoryKind, string> = {
  frontend: 'Somente Front',
  backend: 'Somente Back',
  both: 'Front & Back',
}

/**
 * O tipo da história e o lado em votação pegam emprestada a cor do papel
 * correspondente: front é ciano porque Front-End é ciano. Guardamos o papel,
 * não a cor — quem resolve a cor é o tema.
 */
export const KIND_TONE: Record<StoryKind, PlayerRole> = {
  frontend: 'frontend',
  backend: 'backend',
  both: 'tech_lead',
}

export const SIDE_TONE: Record<VotingSide, PlayerRole> = {
  frontend: 'frontend',
  backend: 'backend',
}

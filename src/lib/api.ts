import { supabase } from './supabase'
import type {
  Allocation,
  CapacityEntry,
  Card,
  DeckId,
  Holiday,
  Player,
  PlayerRole,
  Room,
  RoomState,
  Story,
  StoryKind,
  StoryParticipant,
  Vote,
  VotingSide,
} from '@/types'

/** Traduz erros do Postgres para algo que cabe num toast. */
function fail(error: { message: string; code?: string } | null): never | void {
  if (!error) return
  const map: Record<string, string> = {
    '42501': 'Você não tem permissão para isso.',
    P0002: 'Não encontrado.',
    '23505': 'Isso já existe.',
  }
  throw new Error(map[error.code ?? ''] ?? error.message)
}

export interface DraftStory {
  title: string
  link?: string
  kind: StoryKind
}

export interface SprintWindowInput {
  start: string
  days: number
  holidays: Holiday[]
}

export async function createRoom(
  sessionName: string,
  hostName: string,
  stories: DraftStory[],
  deckId: DeckId,
  pointScale: Card[],
  sprint: SprintWindowInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_room', {
    p_session_name: sessionName,
    p_host_name: hostName,
    p_stories: stories.map((s) => ({ title: s.title, link: s.link ?? null, kind: s.kind })),
    p_deck_id: deckId,
    p_point_scale: pointScale,
    p_sprint_start: sprint.start,
    p_sprint_days: sprint.days,
    p_holidays: sprint.holidays,
  })
  fail(error)
  return data as string
}

export async function setSprintWindow(roomId: string, sprint: SprintWindowInput) {
  fail(
    (
      await supabase.rpc('set_sprint_window', {
        p_room_id: roomId,
        p_start: sprint.start,
        p_days: sprint.days,
        p_holidays: sprint.holidays,
      })
    ).error,
  )
}

export async function setTeamCapacity(roomId: string, entries: CapacityEntry[]) {
  fail(
    (await supabase.rpc('set_team_capacity', { p_room_id: roomId, p_entries: entries })).error,
  )
}

export async function roomExists(roomId: string): Promise<boolean> {
  const { data, error } = await supabase.from('rooms').select('id').eq('id', roomId).maybeSingle()
  if (error) return false
  return Boolean(data)
}

export async function joinRoom(
  roomId: string,
  name: string,
  role: PlayerRole,
): Promise<string> {
  const { data, error } = await supabase.rpc('join_room', {
    p_room_id: roomId,
    p_name: name,
    p_role: role,
  })
  fail(error)
  return data as string
}

/** Carga inicial da sala. Depois disso, tudo chega por realtime. */
export async function fetchRoomState(roomId: string): Promise<RoomState | null> {
  const [rooms, players, stories, votes, participants] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
    supabase.from('players').select('*').eq('room_id', roomId).order('joined_at'),
    supabase.from('stories').select('*').eq('room_id', roomId).order('position'),
    supabase.from('votes').select('*').eq('room_id', roomId),
    supabase.from('story_participants').select('*').eq('room_id', roomId),
  ])

  if (!rooms.data) return null

  return {
    room: rooms.data as Room,
    players: (players.data ?? []) as Player[],
    stories: (stories.data ?? []) as Story[],
    votes: (votes.data ?? []) as Vote[],
    participants: (participants.data ?? []) as StoryParticipant[],
  }
}

export async function castVote(
  roomId: string,
  storyId: string,
  side: VotingSide,
  round: number,
  value: string,
) {
  fail(
    (
      await supabase.rpc('cast_vote', {
        p_room_id: roomId,
        p_story_id: storyId,
        p_side: side,
        p_round: round,
        p_value: value,
      })
    ).error,
  )
}

export async function revealRound(roomId: string) {
  fail((await supabase.rpc('reveal_round', { p_room_id: roomId })).error)
}

export async function resetRound(roomId: string) {
  fail((await supabase.rpc('reset_round', { p_room_id: roomId })).error)
}

export async function commitStory(
  roomId: string,
  points: number | null,
  allocations: Allocation[],
) {
  fail(
    (
      await supabase.rpc('commit_story', {
        p_room_id: roomId,
        p_points: points,
        p_allocations: allocations,
      })
    ).error,
  )
}

export async function addStory(roomId: string, title: string, link: string, kind: StoryKind) {
  fail(
    (
      await supabase.rpc('add_story', {
        p_room_id: roomId,
        p_title: title,
        p_link: link || null,
        p_kind: kind,
      })
    ).error,
  )
}

export async function setStoryKind(storyId: string, kind: StoryKind) {
  fail((await supabase.rpc('set_story_kind', { p_story_id: storyId, p_kind: kind })).error)
}

export async function updateStory(
  storyId: string,
  title: string,
  link: string,
  kind: StoryKind,
) {
  fail(
    (
      await supabase.rpc('update_story', {
        p_story_id: storyId,
        p_title: title,
        p_link: link || null,
        p_kind: kind,
      })
    ).error,
  )
}

export async function deleteStory(storyId: string) {
  fail((await supabase.rpc('delete_story', { p_story_id: storyId })).error)
}

/** `storyIds` é a nova ordem da fila pendente, da história atual em diante. */
export async function reorderStories(roomId: string, storyIds: string[]) {
  fail(
    (await supabase.rpc('reorder_stories', { p_room_id: roomId, p_story_ids: storyIds })).error,
  )
}

export async function startStoryTimer(storyId: string) {
  fail((await supabase.rpc('start_story_timer', { p_story_id: storyId })).error)
}

export async function adjustParticipantPoints(
  storyId: string,
  playerId: string,
  side: VotingSide,
  points: number,
) {
  fail(
    (
      await supabase.rpc('adjust_participant_points', {
        p_story_id: storyId,
        p_player_id: playerId,
        p_side: side,
        p_points: points,
      })
    ).error,
  )
}

export async function setQaVoting(roomId: string, enabled: boolean) {
  fail((await supabase.rpc('set_qa_voting', { p_room_id: roomId, p_enabled: enabled })).error)
}

export async function endGame(roomId: string) {
  fail((await supabase.rpc('end_game', { p_room_id: roomId })).error)
}

export async function leaveRoom(playerId: string) {
  fail((await supabase.from('players').delete().eq('id', playerId)).error)
}

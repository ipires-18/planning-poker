import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fetchRoomState } from '@/lib/api'
import type { Player, Room, RoomState, Story, Vote } from '@/types'

interface Result {
  state: RoomState | null
  loading: boolean
  error: string | null
  /** user_ids com aba aberta agora. */
  online: Set<string>
  refresh: () => Promise<void>
}

/** Aplica um evento do Postgres sobre uma lista mantendo a ordem por `key`. */
function applyChange<T extends { id: string }>(
  list: T[],
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  row: T,
  sort?: (a: T, b: T) => number,
): T[] {
  let next: T[]
  if (event === 'DELETE') {
    next = list.filter((item) => item.id !== row.id)
  } else if (list.some((item) => item.id === row.id)) {
    next = list.map((item) => (item.id === row.id ? { ...item, ...row } : item))
  } else {
    next = [...list, row]
  }
  return sort ? [...next].sort(sort) : next
}

export function useRoomState(roomId: string | undefined, userId: string | null): Result {
  const [state, setState] = useState<RoomState | null>(null)
  const [loading, setLoading] = useState(Boolean(roomId))
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState<Set<string>>(new Set())

  const channelRef = useRef<RealtimeChannel | null>(null)
  // Guardamos o valor anterior de `revealed` para detectar a virada.
  const revealedRef = useRef(false)
  const burstTimer = useRef<number | null>(null)
  const latest = useRef(0)

  const refresh = useCallback(async () => {
    if (!roomId) return

    // Cada busca leva uma senha. Se outra, mais nova, terminar antes, esta é
    // descartada — sem isso uma resposta lenta anterior sobrescreveria o estado
    // recém-gravado por um commit.
    const ticket = ++latest.current
    const next = await fetchRoomState(roomId)
    if (ticket !== latest.current) return

    if (!next) {
      setError('Sala não encontrada')
      setState(null)
    } else {
      setError(null)
      setState(next)
      revealedRef.current = next.room.revealed
    }
    setLoading(false)
  }, [roomId])

  /** Agenda um refresh no fim da rajada, em vez de um por evento. */
  const scheduleRefresh = useCallback(() => {
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
    burstTimer.current = window.setTimeout(() => {
      burstTimer.current = null
      void refresh()
    }, 120)
  }, [refresh])

  useEffect(() => {
    // Sem sala não há o que buscar; `loading` já nasce false nesse caso, então
    // não há setState a fazer aqui.
    //
    // O aviso de set-state-in-effect é falso positivo: a própria regra abre
    // exceção para sincronizar com sistema externo, que é exatamente o que esta
    // busca faz. O estado não tem como ser derivado na renderização.
    // oxlint-disable-next-line react/set-state-in-effect
    if (roomId) void refresh()
  }, [roomId, refresh])

  useEffect(() => {
    if (!roomId || !userId) return

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: userId } },
    })

    const scoped = { schema: 'public', filter: `room_id=eq.${roomId}` } as const

    channel
      .on('postgres_changes', { event: '*', table: 'rooms', schema: 'public', filter: `id=eq.${roomId}` }, (payload) => {
        const room = payload.new as Room

        // A revelação é o único momento em que linhas que já existiam passam a
        // ser visíveis para você. O Postgres não reenvia o que a RLS escondeu
        // na hora do INSERT, então os votos dos outros só aparecem se pedirmos.
        //
        // E a virada só é aplicada DEPOIS que eles chegam: marcar a sala como
        // revelada antes disso faria o painel de resultados abrir sem votos e
        // sugerir pontuação zero.
        if (room?.revealed && !revealedRef.current) {
          revealedRef.current = true
          void refresh()
          return
        }

        setState((prev) => (prev ? { ...prev, room: { ...prev.room, ...room } } : prev))
        revealedRef.current = Boolean(room?.revealed)
      })
      .on('postgres_changes', { event: '*', table: 'players', ...scoped }, (payload) => {
        setState((prev) =>
          prev
            ? {
                ...prev,
                players: applyChange(
                  prev.players,
                  payload.eventType,
                  (payload.eventType === 'DELETE' ? payload.old : payload.new) as Player,
                  (a, b) => a.joined_at.localeCompare(b.joined_at),
                ),
              }
            : prev,
        )
      })
      .on('postgres_changes', { event: '*', table: 'stories', ...scoped }, (payload) => {
        setState((prev) =>
          prev
            ? {
                ...prev,
                stories: applyChange(
                  prev.stories,
                  payload.eventType,
                  (payload.eventType === 'DELETE' ? payload.old : payload.new) as Story,
                  (a, b) => a.position - b.position,
                ),
              }
            : prev,
        )
      })
      .on('postgres_changes', { event: '*', table: 'votes', ...scoped }, (payload) => {
        setState((prev) =>
          prev
            ? {
                ...prev,
                votes: applyChange(
                  prev.votes,
                  payload.eventType,
                  (payload.eventType === 'DELETE' ? payload.old : payload.new) as Vote,
                ),
              }
            : prev,
        )
      })
      .on('postgres_changes', { event: '*', table: 'story_participants', ...scoped }, () => {
        // Fechar uma história insere uma linha por pessoa. Agrupamos.
        scheduleRefresh()
      })
      .on('presence', { event: 'sync' }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ at: Date.now() })
      })

    channelRef.current = channel

    return () => {
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
      void channel.unsubscribe()
      channelRef.current = null
    }
  }, [roomId, userId, refresh, scheduleRefresh])

  return { state, loading, error, online, refresh }
}

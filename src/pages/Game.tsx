import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import { RoomNotFound } from '@/components/game/RoomNotFound'
import { GameScreen } from '@/components/game/GameScreen'
import { useAuth } from '@/hooks/useAuth'
import { useRoomState } from '@/hooks/useRoomState'

/**
 * Só as guardas: carregando, sala inexistente, sem cadeira, sessão encerrada.
 *
 * Quando tudo passa, entrega o estado já resolvido para <GameScreen>. É o que
 * livra a tela inteira de conviver com `state` possivelmente nulo — e das
 * asserções `!` que isso obrigaria a espalhar.
 */
export default function Game() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const { userId, ready } = useAuth()
  const { state, loading, error, online, refresh } = useRoomState(roomId, userId)

  const iAmSeated = Boolean(state?.players.some((p) => p.user_id === userId))

  useEffect(() => {
    if (loading || !ready || !state) return
    // Sem cadeira nesta sala? Passe pela porta da frente.
    if (!iAmSeated) navigate(`/entrar/${roomId}`, { replace: true })
  }, [loading, ready, state, iAmSeated, roomId, navigate])

  useEffect(() => {
    // Pausada não é encerrada: quem chega numa dessas vê a tela de retomar,
    // não a porta fechada.
    const finished = state?.room.ended && !state.room.to_continue
    if (finished) navigate('/', { replace: true })
  }, [state?.room.ended, state?.room.to_continue, navigate])

  if (!ready || loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner label="Entrando na mesa..." />
      </main>
    )
  }

  if (error || !state) {
    return <RoomNotFound reason={error} onLeave={() => navigate('/')} />
  }

  if (!iAmSeated) return null

  return (
    <GameScreen
      roomId={roomId}
      state={state}
      userId={userId}
      online={online}
      refresh={refresh}
    />
  )
}

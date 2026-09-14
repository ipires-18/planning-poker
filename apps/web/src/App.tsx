import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Landing from '@/pages/Landing'
import { useAuth } from '@/hooks/useAuth'
import { Button, Note, Spinner } from '@pp/ds/atoms'

// A mesa carrega o painel de resultados, o resumo e o confete. Quem só abriu o
// link para entrar numa sala não precisa baixar nada disso de imediato.
const SprintSetup = lazy(() => import('@/pages/SprintSetup'))
const JoinRoom = lazy(() => import('@/pages/JoinRoom'))
const Game = lazy(() => import('@/pages/Game'))

function PageFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </main>
  )
}

/**
 * Nenhuma tela chama a API antes de existir um JWT anônimo. Sem isso, o RLS vê
 * um pedido sem `auth.uid()` e recusa tudo — inclusive criar a primeira sala.
 */
function SessionGate({ children }: { children: React.ReactNode }) {
  const { ready, error } = useAuth()

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner label="Embaralhando as cartas..." />
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="card-surface max-w-sm space-y-5 p-8 text-center">
          <div className="text-5xl" aria-hidden>
            🔌
          </div>
          <h1 className="text-2xl font-black">Sem conexão com o servidor</h1>
          <Note>{error}</Note>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Tentar de novo
          </Button>
        </div>
      </main>
    )
  }

  return <>{children}</>
}

function LegacyRedirect({ to }: { to: string }) {
  const { roomId } = useParams()
  return <Navigate to={`/${to}/${roomId}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionGate>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/new" element={<SprintSetup />} />
            <Route path="/join/:roomId" element={<JoinRoom />} />
            <Route path="/room/:roomId" element={<Game />} />
            {/* Endereços antigos continuam funcionando: link de sala circula em
                chat e calendário, e quebrar um deles é quebrar a cerimônia de
                alguém. Redirecionam para o nome novo, sem sujar o histórico. */}
            <Route path="/nova" element={<Navigate to="/new" replace />} />
            <Route path="/sprint-setup" element={<Navigate to="/new" replace />} />
            <Route path="/entrar/:roomId" element={<LegacyRedirect to="join" />} />
            <Route path="/sala/:roomId" element={<LegacyRedirect to="room" />} />
            <Route path="/game/:roomId" element={<LegacyRedirect to="room" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SessionGate>
    </BrowserRouter>
  )
}

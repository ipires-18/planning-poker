import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import Landing from '@/pages/Landing'
import { useAuth } from '@/hooks/useAuth'
import { Button, ErrorNote, Spinner } from '@/components/ui'

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
          <ErrorNote>{error}</ErrorNote>
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
            <Route path="/nova" element={<SprintSetup />} />
            <Route path="/entrar/:roomId" element={<JoinRoom />} />
            <Route path="/sala/:roomId" element={<Game />} />
            {/* Links do app anterior continuam funcionando. */}
            <Route path="/sprint-setup" element={<Navigate to="/nova" replace />} />
            <Route path="/room/:roomId" element={<LegacyRedirect to="entrar" />} />
            <Route path="/game/:roomId" element={<LegacyRedirect to="sala" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SessionGate>
    </BrowserRouter>
  )
}

import { Button } from '../ui'

export function RoomNotFound({ reason, onLeave }: { reason?: string | null; onLeave: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="card-surface max-w-sm p-8 text-center">
        <div className="mb-4 text-5xl" aria-hidden>
          🃏
        </div>
        <h1 className="mb-2 text-2xl font-black">Sala não encontrada</h1>
        <p className="mb-6 text-sm text-ink-muted">
          {reason ?? 'Ela pode ter sido encerrada ou expirado.'}
        </p>
        <Button className="w-full" onClick={onLeave}>
          Voltar ao início
        </Button>
      </div>
    </main>
  )
}

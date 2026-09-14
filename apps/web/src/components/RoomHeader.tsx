import { useState } from 'react'
import { Button, Logo } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import { CapacityMeter } from './CapacityPanel'
import type { TeamCapacity } from '@/lib/derive'

interface Props {
  sessionName: string
  roomId: string
  isHost: boolean
  canReveal: boolean
  sprintComplete: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onReveal: () => void
  onAddStory: () => void
  onEndGame: () => void
  capacity: TeamCapacity
  onOpenCapacity?: () => void
}

export function RoomHeader({
  sessionName,
  roomId,
  isHost,
  canReveal,
  sprintComplete,
  theme,
  onToggleTheme,
  onReveal,
  onAddStory,
  onEndGame,
  capacity,
  onOpenCapacity,
}: Props) {
  const [copied, setCopied] = useState(false)

  const invite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sem permissão de clipboard: o código fica visível ao lado do botão,
      // então ainda dá para ditar para o time.
      setCopied(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-[var(--surface-raised)]/85 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo className="size-9" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-black leading-tight text-ink">
              {sessionName}
            </h1>
            <button
              onClick={invite}
              className="cursor-pointer font-mono text-[11px] font-black uppercase tracking-[0.18em] text-ink-subtle transition-colors hover:text-brand-400"
              title="Copiar link do convite"
            >
              {copied ? '✓ link copiado' : `${roomId} · convidar`}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* O quanto o time já assumiu fica sempre à vista, ao lado das ações
              que fazem esse número subir. */}
          <CapacityMeter capacity={capacity} onClick={onOpenCapacity} />

          <button
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            className="cursor-pointer rounded-xl px-3 py-2 text-base transition-colors hover:bg-[var(--surface-sunken)]"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isHost && (
            <>
              {!sprintComplete && (
                <Button variant="white" size="sm" onClick={onAddStory}>
                  + História
                </Button>
              )}
              {!sprintComplete && (
                <Button
                  size="sm"
                  onClick={onReveal}
                  isDisabled={!canReveal}
                  className={cx(canReveal && 'ring-rainbow')}
                >
                  Revelar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onEndGame}>
                {sprintComplete ? 'Encerrar' : 'Encerrar'}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

import { useState } from 'react'
import { Avatar, Button } from '../ui'
import { formatShort, fromISODate, toISODate } from '@/lib/holidays'
import { ROLE_ACCENT, type Room, type Story } from '@/types'
import type { PlayerSummary } from '@/lib/derive'

interface Props {
  room: Room
  stories: Story[]
  summaries: PlayerSummary[]
  isHost: boolean
  onResume: () => Promise<void>
  onLeave: () => void
}

/**
 * A sala pausada. É o que quem abre o link no dia seguinte encontra.
 *
 * Mostra de onde o time vai continuar antes de qualquer botão: o placar de
 * ontem e o que sobrou na fila. Retomar é ato do PO ou do Tech Lead; os demais
 * ficam nesta tela até alguém dar o start, e a mesa aparece sozinha quando
 * isso acontece, pelo tempo real.
 */
export function PausedScreen({
  room,
  stories,
  summaries,
  isHost,
  onResume,
  onLeave,
}: Props) {
  const [busy, setBusy] = useState(false)

  const pending = stories.slice(room.current_story_index)
  const done = room.current_story_index
  const scored = summaries.reduce((sum, row) => sum + row.total, 0)

  // A validade é um instante; para quem lê importa o dia.
  const deadline = formatShort(toISODate(fromISODate(room.expires_at.slice(0, 10))))

  const resume = async () => {
    if (busy) return
    setBusy(true)
    try {
      await onResume()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-14">
      <header className="mb-8 text-center">
        <div className="animate-float-idle mb-4 text-6xl" aria-hidden>
          ⏸️
        </div>
        <h1 className="text-3xl font-black tracking-tight">
          Sessão <span className="ds-text-gradient">pausada</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          {room.session_name} parou com {pending.length}{' '}
          {pending.length === 1 ? 'história' : 'histórias'} na fila. Nada se perdeu.
        </p>
      </header>

      <div className="card-surface space-y-6 p-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat value={done} label={done === 1 ? 'pontuada' : 'pontuadas'} />
          <Stat value={pending.length} label="na fila" />
          <Stat value={scored} label="pontos" highlight />
        </div>

        {summaries.length > 0 && (
          <div className="border-t border-hairline pt-5">
            <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
              Como o time estava
            </h2>
            <ul className="flex flex-wrap gap-2">
              {summaries.map(({ player, total }) => (
                <li
                  key={player.id}
                  className="flex items-center gap-2 rounded-xl bg-[var(--surface-sunken)] px-3 py-2"
                >
                  <Avatar name={player.name} color={ROLE_ACCENT[player.role]} size={24} />
                  <span className="text-xs font-bold text-ink">{player.name}</span>
                  <span className="text-xs font-black text-ink-muted">{total}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pending.length > 0 && (
          <div className="border-t border-hairline pt-5">
            <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
              Continua em
            </h2>
            <ol className="space-y-1.5">
              {pending.slice(0, 5).map((story, index) => (
                <li
                  key={story.id}
                  className="flex items-center gap-3 text-sm"
                  aria-current={index === 0 ? 'step' : undefined}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)] font-mono text-[10px] font-black text-ink-muted">
                    {done + index + 1}
                  </span>
                  <span
                    className={index === 0 ? 'truncate font-bold text-ink' : 'truncate text-ink-muted'}
                  >
                    {story.title}
                  </span>
                </li>
              ))}
              {pending.length > 5 && (
                <li className="pl-9 text-xs text-ink-subtle">
                  e mais {pending.length - 5}
                </li>
              )}
            </ol>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {isHost ? (
          <Button variant="joy" size="lg" className="w-full" onClick={resume} isDisabled={busy}>
            {busy ? 'Abrindo a mesa...' : '▶ Retomar de onde paramos'}
          </Button>
        ) : (
          <p className="rounded-2xl bg-[var(--surface-sunken)] py-4 text-center text-sm font-bold text-ink-muted">
            Aguardando o PO ou o Tech Lead dar o start. Pode deixar esta aba aberta.
          </p>
        )}

        <Button variant="secondary" size="lg" className="w-full" onClick={onLeave}>
          Voltar ao início
        </Button>

        <p className="pt-1 text-center text-xs text-ink-subtle">
          Esta sala espera até {deadline}. Retomar dá 24 horas novas.
        </p>
      </div>
    </main>
  )
}

function Stat({
  value,
  label,
  highlight,
}: {
  value: number
  label: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-sunken)] py-4">
      <span
        className={
          highlight
            ? 'block text-3xl font-black ds-text-gradient'
            : 'block text-3xl font-black text-ink'
        }
      >
        {value}
      </span>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-ink-subtle">
        {label}
      </span>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Avatar, Button, Input } from './ui'
import { cx } from '@/lib/cx'
import { formatClock } from '@/lib/holidays'
import { ROLE_ACCENT, type VotingSide } from '@/types'
import { safeUrl } from '@/lib/links'
import { summaryAsText, type PlayerSummary } from '@/lib/derive'

interface Props {
  summaries: PlayerSummary[]
  averageSeconds: number
  isHost: boolean
  onAdjust: (storyId: string, playerId: string, side: VotingSide, points: number) => Promise<void>
  onAddStory: () => void
  onLeave: () => void
}

const CONFETTI_COLORS = [
  'var(--color-brand-400)',
  'var(--color-punch)',
  'var(--color-zest)',
  'var(--color-mint)',
  'var(--color-sky)',
]

/** Chuva de confete em CSS puro. Roda uma vez, e some. */
function Confetti() {
  // Inicializador do useState, e não useMemo: um memo pode ser descartado pelo
  // React e recalculado, fazendo o confete inteiro pular de posição no meio da
  // queda.
  const [pieces] = useState(() =>
    Array.from({ length: 44 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 2.6 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    })),
  )

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}

export function SprintSummary({
  summaries,
  averageSeconds,
  isHost,
  onAdjust,
  onAddStory,
  onLeave,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const id = window.setTimeout(() => setShowConfetti(false), 6000)
    return () => window.clearTimeout(id)
  }, [])

  const copy = async () => {
    const text = summaryAsText(summaries)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Contextos sem clipboard (http, permissão negada): abre o texto para
      // seleção manual em vez de falhar em silêncio.
      window.prompt('Copie o resumo:', text)
    }
  }

  const commitEdit = async (storyId: string, playerId: string, side: VotingSide) => {
    const value = parseFloat(draft)
    if (!Number.isNaN(value)) await onAdjust(storyId, playerId, side, value)
    setEditing(null)
  }

  const grandTotal = summaries.reduce((sum, row) => sum + row.total, 0)

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="mx-auto w-full max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <div className="animate-float-idle mb-4 text-6xl" aria-hidden>
            🍔
          </div>
          <h2 className="text-3xl font-black tracking-tight">
            Sprint <span className="ds-text-gradient">pontuada</span>
          </h2>
          <p className="mt-2 text-ink-muted">
            {grandTotal} pontos distribuídos entre {summaries.length}{' '}
            {summaries.length === 1 ? 'pessoa' : 'pessoas'}
            {averageSeconds > 0 && ` · ${formatClock(averageSeconds)} em média por história`}
          </p>
        </div>

        <div className="card-surface p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
              Resumo final
            </h3>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? '✓ Copiado' : 'Copiar resumo'}
            </Button>
          </div>

          <div className="space-y-4">
            {summaries.map((row) => {
              const accent = ROLE_ACCENT[row.player.role]
              return (
                <div
                  key={row.player.id}
                  className="rounded-2xl bg-[var(--surface-sunken)] p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-hairline pb-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={row.player.name} color={accent} size={38} />
                      <h4 className="truncate text-lg font-black text-ink">
                        {row.player.name}
                      </h4>
                    </div>
                    <span
                      className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-black text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {row.total} pt{row.total !== 1 && 's'}
                    </span>
                  </div>

                  {row.stories.length === 0 ? (
                    <p className="py-2 text-center text-xs italic text-ink-subtle">
                      Nenhuma história registrada
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {row.stories.map((story) => {
                        const key = `${story.storyId}-${row.player.id}-${story.side}`
                        const isEditing = editing === key

                        return (
                          <li
                            key={key}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            {safeUrl(story.link) ? (
                              <a
                                href={safeUrl(story.link) ?? undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate font-bold text-ink-muted transition-colors hover:text-brand-400 hover:underline"
                              >
                                {story.title} ↗
                              </a>
                            ) : (
                              <span className="truncate font-bold text-ink-muted">
                                {story.title}
                              </span>
                            )}

                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.5"
                                autoFocus
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={() =>
                                  commitEdit(story.storyId, row.player.id, story.side)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') e.currentTarget.blur()
                                  if (e.key === 'Escape') setEditing(null)
                                }}
                                className="w-20 py-1 text-right font-black"
                                aria-label={`Pontos de ${row.player.name} em ${story.title}`}
                              />
                            ) : (
                              <button
                                disabled={!isHost}
                                onClick={() => {
                                  setEditing(key)
                                  setDraft(String(story.points))
                                }}
                                className={cx(
                                  'shrink-0 rounded-lg px-2 py-1 font-black text-ink',
                                  isHost
                                    ? 'cursor-pointer hover:bg-brand-500/15'
                                    : 'cursor-default',
                                )}
                                title={isHost ? 'Clique para corrigir' : undefined}
                              >
                                {story.pending ? 'Ag. Definição' : story.points}
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {isHost && (
            <Button variant="joy" size="lg" className="w-full" onClick={onAddStory}>
              Continuar a sprint · adicionar história
            </Button>
          )}
          <Button variant="secondary" size="lg" className="w-full" onClick={onLeave}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </>
  )
}

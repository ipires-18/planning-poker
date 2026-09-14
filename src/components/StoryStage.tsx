import { useEffect, useState } from 'react'
import { Badge, Button, Select } from './ui'
import { cx } from '@/lib/cx'
import { formatClock } from '@/lib/holidays'
import { safeUrl } from '@/lib/links'
import { KIND_LABEL, type Story, type StoryKind, type VotingSide } from '@/types'

const SIDE_COLOR: Record<VotingSide, string> = {
  frontend: 'var(--color-sky)',
  backend: 'var(--color-mint)',
}

/* -------------------------------------------------------------------------- */

export function SprintProgress({
  stories,
  currentIndex,
}: {
  stories: Story[]
  currentIndex: number
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
          Progresso da sprint
        </span>
        <span className="text-xs font-black text-ink-muted">
          {Math.min(currentIndex + 1, stories.length)} de {stories.length}
        </span>
      </div>
      <div className="flex gap-1" role="list">
        {stories.map((story, index) => (
          <span
            key={story.id}
            role="listitem"
            title={story.title}
            className={cx(
              'h-1.5 flex-1 rounded-full transition-all duration-500',
              index < currentIndex && 'bg-mint',
              index === currentIndex && 'bg-[linear-gradient(90deg,var(--color-brand-400),var(--color-punch))]',
              index > currentIndex && 'bg-[var(--surface-sunken)]',
            )}
          />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

interface StageProps {
  story: Story
  side: VotingSide
  isHost: boolean
  onKindChange: (kind: StoryKind) => void
  onStartTimer: () => void
}

export function StoryStage({ story, side, isHost, onKindChange, onStartTimer }: StageProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!story.started_at || story.ended_at) return
    const startedAt = new Date(story.started_at).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [story.started_at, story.ended_at])

  const link = safeUrl(story.link)
  const both = story.kind === 'both'
  const front = story.frontend_pending ? 'Ag.' : (story.frontend_points ?? '–')
  const back = story.backend_pending ? 'Ag.' : (story.backend_points ?? '–')
  const totalPoints =
    story.frontend_points !== null || story.backend_points !== null
      ? (story.frontend_points ?? 0) + (story.backend_points ?? 0)
      : null

  return (
    <div className="card-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge color={SIDE_COLOR[side]}>
              Votando {side === 'frontend' ? 'Front-End' : 'Back-End'}
            </Badge>

            {isHost ? (
              <Select
                value={story.kind}
                onChange={(e) => onKindChange(e.target.value as StoryKind)}
                aria-label="Tipo da história"
                className="w-auto px-2 py-1 text-[10px] font-black uppercase tracking-wider"
              >
                <option value="both">{KIND_LABEL.both}</option>
                <option value="frontend">{KIND_LABEL.frontend}</option>
                <option value="backend">{KIND_LABEL.backend}</option>
              </Select>
            ) : (
              <Badge color="var(--color-grape)">{KIND_LABEL[story.kind]}</Badge>
            )}

            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-ink-subtle underline-offset-4 transition-colors hover:text-brand-400 hover:underline"
              >
                abrir ticket ↗
              </a>
            )}
          </div>

          <h2 className="text-2xl font-black leading-tight tracking-tight text-ink">
            {story.title}
          </h2>
        </div>

        {/* Placar da história */}
        <div className="flex items-center gap-4">
          {(both || story.kind === 'frontend') && (
            <Score label="Front" value={front} color={SIDE_COLOR.frontend} />
          )}
          {(both || story.kind === 'backend') && (
            <Score label="Back" value={back} color={SIDE_COLOR.backend} />
          )}
          {both && totalPoints !== null && (
            <Score label="Total" value={totalPoints} color="var(--color-brand-400)" strong />
          )}
        </div>
      </div>

      {/* Cronômetro */}
      <div className="mt-5 border-t border-hairline pt-4">
        {story.started_at ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-zest" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-subtle">
              Discutindo há
            </span>
            <span className="font-mono text-base font-black text-zest">
              {formatClock(elapsed)}
            </span>
          </div>
        ) : isHost ? (
          <Button size="sm" variant="secondary" onClick={onStartTimer}>
            ⏱ Iniciar cronômetro
          </Button>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-subtle">
            Cronômetro parado
          </span>
        )}
      </div>
    </div>
  )
}

function Score({
  label,
  value,
  color,
  strong,
}: {
  label: string
  value: number | string
  color: string
  strong?: boolean
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </span>
      <span
        className={cx('font-black leading-none', strong ? 'text-2xl' : 'text-xl')}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  )
}

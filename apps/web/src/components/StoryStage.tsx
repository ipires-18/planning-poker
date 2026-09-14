import { useEffect, useState } from 'react'
import { Badge, Button, Note, Select } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import { formatClock } from '@/lib/holidays'
import { safeUrl } from '@/lib/links'
import {
  KIND_LABEL,
  SIDE_TONE,
  type PlayerRole,
  type Story,
  type StoryKind,
  type VotingSide,
} from '@/types'

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
  /** Timebox combinado para a sala, em segundos. 0 = sem aviso. */
  discussionLimit: number
  onKindChange: (kind: StoryKind) => void
  onStartTimer: () => void
}

export function StoryStage({
  story,
  side,
  isHost,
  discussionLimit,
  onKindChange,
  onStartTimer,
}: StageProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!story.started_at || story.ended_at) return
    const startedAt = new Date(story.started_at).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [story.started_at, story.ended_at])

  const temLimite = discussionLimit > 0
  const estourou = temLimite && Boolean(story.started_at) && !story.ended_at && elapsed > discussionLimit

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
          {/* O ticket vem antes de tudo: é o que a pessoa abre para entender a
              história, e no meio dos selos ele virava enfeite no fim da linha. */}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-ink-subtle underline-offset-4 transition-colors hover:text-brand-400 hover:underline"
            >
              abrir ticket ↗
            </a>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge role={SIDE_TONE[side]}>
              Votando {side === 'frontend' ? 'Front-End' : 'Back-End'}
            </Badge>

            {isHost ? (
              <Select
                value={story.kind}
                onChange={(e) => onKindChange(e.target.value as StoryKind)}
                aria-label="Tipo da história"
                size="sm"
                fullWidth={false}
                className="text-overline uppercase tracking-(--tracking-overline)"
              >
                <option value="both">{KIND_LABEL.both}</option>
                <option value="frontend">{KIND_LABEL.frontend}</option>
                <option value="backend">{KIND_LABEL.backend}</option>
              </Select>
            ) : (
              <Badge role="tech_lead">{KIND_LABEL[story.kind]}</Badge>
            )}
          </div>

          <h2 className="text-2xl font-black leading-tight tracking-tight text-ink">
            {story.title}
          </h2>
        </div>

        {/* Placar da história */}
        <div className="flex items-center gap-4">
          {(both || story.kind === 'frontend') && (
            <Score label="Front" value={front} role="frontend" />
          )}
          {(both || story.kind === 'backend') && (
            <Score label="Back" value={back} role="backend" />
          )}
          {both && totalPoints !== null && (
            <Score label="Total" value={totalPoints} tone="brand" strong />
          )}
        </div>
      </div>

      {/* Cronômetro */}
      <div className="mt-5 space-y-3 border-t border-hairline pt-4">
        {story.started_at ? (
          <div data-tone={estourou ? 'critical' : 'attention'} className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-(--ds-accent)" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-subtle">
              Discutindo há
            </span>
            <span className="font-mono text-base font-black text-(--ds-accent)">
              {formatClock(elapsed)}
            </span>
            {temLimite && !estourou && (
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-ink-subtle">
                de {formatClock(discussionLimit)}
              </span>
            )}
          </div>
        ) : (
          /* Qualquer pessoa da mesa começa a contar: quem percebe que a
             discussão engrenou costuma ser quem está discutindo. */
          <Button size="sm" variant="white" onClick={onStartTimer}>
            ⏱ Iniciar cronômetro
          </Button>
        )}

        {estourou && (
          <Note tone="critical" className="animate-nudge">
            <strong>Discussão longa.</strong> Já são {formatClock(elapsed)} nesta história, e o
            time combinou {formatClock(discussionLimit)}. Anote a dúvida, vote com o que se
            sabe e siga — dá para revisitar depois sem travar a planning.
          </Note>
        )}
      </div>
    </div>
  )
}

/** Um lado do placar da história. A cor vem do papel, resolvida pelo tema. */
function Score({
  label,
  value,
  role,
  tone,
  strong,
}: {
  label: string
  value: number | string
  role?: PlayerRole
  tone?: 'brand'
  strong?: boolean
}) {
  return (
    <div data-role={role} data-tone={role ? undefined : tone} className="flex flex-col items-end">
      <span className="text-[9px] font-black uppercase tracking-(--tracking-overline) text-ink-subtle">
        {label}
      </span>
      <span
        className={cx(
          'font-black leading-none text-(--ds-accent)',
          strong ? 'text-title' : 'text-title-sm',
        )}
      >
        {value}
      </span>
    </div>
  )
}

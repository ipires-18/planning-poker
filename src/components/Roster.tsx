import { Avatar, cx } from './ui'
import { ROLE_ACCENT, ROLE_SHORT } from '@/types'
import type { PlayerSummary, TeamCapacity } from '@/lib/derive'

interface Props {
  summaries: PlayerSummary[]
  capacity: TeamCapacity
  online: Set<string>
  youId: string | null
}

export function Roster({ summaries, capacity, online, youId }: Props) {
  const byPlayer = new Map(capacity.rows.map((r) => [r.player.id, r]))

  return (
    <aside className="hidden w-72 shrink-0 border-r border-hairline bg-[var(--surface-raised)]/50 p-5 lg:block">
      <h2 className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
        Placar do time
      </h2>

      {summaries.length === 0 && (
        <p className="text-sm text-ink-subtle">Ninguém sentou à mesa ainda.</p>
      )}

      <ul className="space-y-3">
        {summaries.map((row, rank) => {
          const accent = ROLE_ACCENT[row.player.role]
          const isOnline = online.has(row.player.user_id)
          const isYou = row.player.user_id === youId
          const cap = byPlayer.get(row.player.id)
          const hasCapacity = (cap?.capacity ?? 0) > 0
          const ratio = hasCapacity ? row.total / cap!.capacity : 0
          const over = ratio > 1

          return (
            <li
              key={row.player.id}
              className={cx(
                'rounded-2xl p-3 transition-colors',
                isYou ? 'bg-brand-500/10' : 'hover:bg-[var(--surface-sunken)]',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center font-mono text-xs font-black text-ink-subtle">
                  {rank + 1}
                </span>
                <Avatar name={row.player.name} color={accent} size={34} dimmed={!isOnline} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {row.player.name}
                    {isYou && <span className="text-ink-subtle"> (você)</span>}
                  </p>
                  <span
                    className="block truncate text-[9px] font-black uppercase tracking-[0.1em]"
                    style={{ color: accent }}
                    title={!isOnline ? 'Sem aba aberta agora' : undefined}
                  >
                    {[
                      ROLE_SHORT[row.player.role],
                      cap && cap.player.days_off > 0 ? `falta ${cap.player.days_off}d` : null,
                      !isOnline ? 'ausente' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <span className="shrink-0 rounded-xl bg-[var(--surface-sunken)] px-2 py-1 text-sm font-black text-ink">
                  {row.total}
                  {hasCapacity && (
                    <span className="text-[10px] font-bold text-ink-subtle">
                      /{cap!.capacity}
                    </span>
                  )}
                </span>
              </div>

              {/* Barra de ocupação — só aparece quando a capacidade foi definida. */}
              {hasCapacity && (
                <div
                  className="ml-7 mt-2 h-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
                  title={`${row.total} de ${cap!.capacity} pontos`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ratio * 100)}%`,
                      backgroundColor: over
                        ? 'var(--color-coral)'
                        : ratio > 0.9
                          ? 'var(--color-zest)'
                          : accent,
                    }}
                  />
                </div>
              )}

              {row.stories.length > 0 && (
                <ul className="ml-7 mt-2 space-y-1 border-l border-hairline pl-3">
                  {row.stories.map((story) => (
                    <li
                      key={`${story.storyId}-${story.side}`}
                      className="flex items-center justify-between gap-2 text-[11px] text-ink-subtle"
                    >
                      {story.link ? (
                        <a
                          href={story.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={story.title}
                          className="truncate transition-colors hover:text-brand-400 hover:underline"
                        >
                          {story.title}
                        </a>
                      ) : (
                        <span className="truncate" title={story.title}>
                          {story.title}
                        </span>
                      )}
                      <span className="shrink-0 font-black">
                        {story.pending ? 'Ag.' : story.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {/* Rodapé: dias úteis da janela, que é de onde a capacidade sai. */}
      <div className="mt-5 border-t border-hairline pt-4 text-[10px] font-black uppercase tracking-wider text-ink-subtle">
        {capacity.window.workingDays} dias úteis
        {capacity.window.holidayDays > 0 &&
          ` · ${capacity.window.holidayDays} feriado${capacity.window.holidayDays > 1 ? 's' : ''}`}
      </div>
    </aside>
  )
}

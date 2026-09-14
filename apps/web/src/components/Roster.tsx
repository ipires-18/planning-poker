import { Initials, Progress } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import { ROLE_LABEL, ROLE_SHORT, type Player } from '@/types'
import { safeUrl } from '@/lib/links'
import type { CapacityRow, PlayerSummary, TeamCapacity } from '@/lib/derive'

interface Props {
  summaries: PlayerSummary[]
  capacity: TeamCapacity
  /** Quem está na cerimônia sem carta — o PO e o convidado sem baralho. */
  watchers: Player[]
  online: Set<string>
  youId: string | null
}

export function Roster({ summaries, capacity, watchers, online, youId }: Props) {
  const capacityByPlayer = new Map(capacity.rows.map((row) => [row.player.id, row]))

  return (
    <aside className="hidden w-72 shrink-0 border-r border-hairline bg-[var(--surface-raised)]/50 p-5 lg:block">
      <h2 className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
        Placar do time
      </h2>

      {summaries.length === 0 ? (
        <p className="text-sm text-ink-subtle">Ninguém sentou à mesa ainda.</p>
      ) : (
        <ul className="space-y-3">
          {summaries.map((summary, index) => (
            <ScorerRow
              key={summary.player.id}
              summary={summary}
              rank={index + 1}
              capacity={capacityByPlayer.get(summary.player.id)}
              isOnline={online.has(summary.player.user_id)}
              isYou={summary.player.user_id === youId}
            />
          ))}
        </ul>
      )}

      {/* Quem acompanha sem pontuar aparece aqui, e não some da sessão só por
          não carregar pontos. */}
      {watchers.length > 0 && (
        <div className="mt-6 border-t border-hairline pt-4">
          <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
            Acompanhando
          </h2>
          <ul className="space-y-2">
            {watchers.map((player) => (
              <WatcherRow
                key={player.id}
                player={player}
                isOnline={online.has(player.user_id)}
                isYou={player.user_id === youId}
              />
            ))}
          </ul>
        </div>
      )}

      <SprintFooter capacity={capacity} />
    </aside>
  )
}

/* -------------------------------------------------------------------------- */

function ScorerRow({
  summary,
  rank,
  capacity,
  isOnline,
  isYou,
}: {
  summary: PlayerSummary
  rank: number
  capacity: CapacityRow | undefined
  isOnline: boolean
  isYou: boolean
}) {
  const { player, total, stories } = summary

  // O número sai do opcional uma vez, e é ele que decide se a barra aparece.
  // Um booleano `hasCapacity` solto não estreitaria `capacity` para o
  // TypeScript, e cada uso exigiria um `!`.
  const target = capacity?.capacity ?? 0
  const occupancy = target > 0 ? total / target : null

  const meta = [
    ROLE_SHORT[player.role],
    player.days_off > 0 ? `falta ${player.days_off}d` : null,
    isOnline ? null : 'ausente',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li
      data-role={player.role}
      className={cx(
        'rounded-[var(--radius-card)] p-3 transition-colors',
        isYou ? 'bg-brand-500/10' : 'hover:bg-sunken',
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-4 shrink-0 text-center font-mono text-xs font-black text-ink-subtle">
          {rank}
        </span>
        <Initials name={player.name} role={player.role} size="md" dimmed={!isOnline} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {player.name}
            {isYou && <span className="text-ink-subtle"> (você)</span>}
          </p>
          <span
            className="block truncate text-[9px] font-black uppercase tracking-[0.1em] text-(--ds-accent)"
            title={isOnline ? undefined : 'Sem aba aberta agora'}
          >
            {meta}
          </span>
        </div>

        <span className="shrink-0 rounded-xl bg-[var(--surface-sunken)] px-2 py-1 text-sm font-black text-ink">
          {total}
          {target > 0 && (
            <span className="text-[10px] font-bold text-ink-subtle">/{target}</span>
          )}
        </span>
      </div>

      {occupancy !== null && (
        <OccupancyBar ratio={occupancy} label={`${total} de ${target} pontos`} />
      )}

      {stories.length > 0 && (
        <ul className="ml-7 mt-2 space-y-1 border-l border-hairline pl-3">
          {stories.map((story) => (
            <li
              key={`${story.storyId}-${story.side}`}
              className="flex items-center justify-between gap-2 text-[11px] text-ink-subtle"
            >
              {safeUrl(story.link) ? (
                <a
                  href={safeUrl(story.link) ?? undefined}
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
}

/**
 * Quanto da capacidade da pessoa já foi comprometido.
 *
 * O aviso é por cor: acima de 90% o tom vira atenção, acima de 100% vira
 * crítico — e a barra satura, porque passar do teto não deve fazer o traço
 * vazar para fora do poço.
 */
function OccupancyBar({ ratio, label }: { ratio: number; label: string }) {
  const tone = ratio > 1 ? 'critical' : ratio > 0.9 ? 'attention' : undefined

  return <Progress value={ratio * 100} tone={tone} label={label} size="sm" className="ml-7 mt-2" />
}

function WatcherRow({
  player,
  isOnline,
  isYou,
}: {
  player: Player
  isOnline: boolean
  isYou: boolean
}) {

  return (
    <li data-role={player.role} className="flex items-center gap-3 px-3">
      <Initials name={player.name} role={player.role} size="sm" dimmed={!isOnline} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-ink">
          {player.name}
          {isYou && <span className="text-ink-subtle"> (você)</span>}
        </p>
        <span
          className="text-[9px] font-black uppercase tracking-[0.1em] text-(--ds-accent)"
          title={`${ROLE_LABEL[player.role]} — não recebe pontuação`}
        >
          {ROLE_SHORT[player.role]} · não pontua
        </span>
      </div>
    </li>
  )
}

/** De onde a capacidade sai: os dias úteis da janela. */
function SprintFooter({ capacity }: { capacity: TeamCapacity }) {
  const { workingDays, holidayDays } = capacity.window
  const holidays =
    holidayDays > 0 ? ` · ${holidayDays} feriado${holidayDays > 1 ? 's' : ''}` : ''

  return (
    <div className="mt-5 border-t border-hairline pt-4 text-[10px] font-black uppercase tracking-wider text-ink-subtle">
      {workingDays} dias úteis
      {holidays}
    </div>
  )
}

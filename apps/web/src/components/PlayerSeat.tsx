import { Initials } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import { ROLE_SHORT, type Player } from '@/types'

interface Props {
  player: Player
  vote: string | null
  hasVoted: boolean
  revealed: boolean
  isYou: boolean
  isOnline: boolean
}

/**
 * Uma cadeira da mesa. A carta vira de verdade — o verso e a frente são duas
 * faces do mesmo elemento 3D, então a revelação de todos acontece junta.
 *
 * `data-role` no topo faz o acento descer para tudo aqui dentro: o degradê do
 * verso, a sombra, o número na frente e o rótulo do papel leem a mesma
 * `--ds-accent`, que o tema resolve.
 */
export function PlayerSeat({ player, vote, hasVoted, revealed, isYou, isOnline }: Props) {
  const showFace = revealed && vote !== null

  return (
    <div data-role={player.role} className="flex flex-col items-center gap-3">
      <div className="[perspective:1000px]">
        <div
          className={cx(
            'relative h-28 w-20 transition-transform duration-700 [transform-style:preserve-3d]',
            '[transition-timing-function:var(--ease-spring)]',
            showFace && '[transform:rotateY(180deg)]',
            !hasVoted && 'opacity-45',
            hasVoted && !revealed && 'animate-float-idle',
          )}
        >
          {/* Verso */}
          <div
            className={cx(
              'absolute inset-0 flex items-center justify-center rounded-[1.1rem] [backface-visibility:hidden]',
              hasVoted
                ? 'bg-[linear-gradient(145deg,var(--ds-accent),color-mix(in_oklab,var(--ds-accent)_45%,var(--color-brand-700)))] shadow-[0_14px_30px_-16px_var(--ds-accent)]'
                : 'border-2 border-dashed border-hairline bg-sunken',
            )}
          >
            {hasVoted && (
              <span className="text-2xl text-white/70" aria-hidden>
                ◆
              </span>
            )}
          </div>

          {/* Frente */}
          <div className="absolute inset-0 flex items-center justify-center rounded-[1.1rem] border-2 border-hairline bg-raised shadow-[0_14px_30px_-18px_var(--ds-accent)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span
              className={cx(
                'px-1 text-center font-black leading-none text-(--ds-accent)',
                vote && vote.length > 3 ? 'text-[10px] uppercase' : 'text-3xl',
              )}
            >
              {vote}
            </span>
          </div>
        </div>
      </div>

      <div className="flex max-w-24 flex-col items-center gap-1">
        <div className="relative">
          <Initials name={player.name} role={player.role} size="lg" dimmed={!isOnline} />
          {isOnline && (
            <span
              className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-mint"
              title="Online"
            />
          )}
        </div>
        <span
          className={cx(
            'max-w-full truncate text-caption font-black',
            isYou ? 'text-ink' : 'text-ink-muted',
          )}
          title={player.name}
        >
          {player.name}
          {isYou && ' (você)'}
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-(--ds-accent)">
          {ROLE_SHORT[player.role]}
        </span>
      </div>
    </div>
  )
}

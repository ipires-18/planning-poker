import { Avatar, cx } from './ui'
import { ROLE_ACCENT, ROLE_SHORT, type Player } from '@/types'

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
 */
export function PlayerSeat({ player, vote, hasVoted, revealed, isYou, isOnline }: Props) {
  const accent = ROLE_ACCENT[player.role]
  const showFace = revealed && vote !== null

  return (
    <div className="flex flex-col items-center gap-3">
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
            className="absolute inset-0 flex items-center justify-center rounded-[1.1rem] [backface-visibility:hidden]"
            style={{
              background: hasVoted
                ? `linear-gradient(145deg, ${accent}, color-mix(in oklab, ${accent} 45%, var(--color-brand-700)))`
                : 'var(--surface-sunken)',
              border: hasVoted ? 'none' : '2px dashed var(--surface-border)',
              boxShadow: hasVoted ? `0 14px 30px -16px ${accent}` : 'none',
            }}
          >
            {hasVoted && (
              <span className="text-2xl text-white/70" aria-hidden>
                ◆
              </span>
            )}
          </div>

          {/* Frente */}
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[1.1rem] border-2 border-hairline bg-[var(--surface-raised)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={{ boxShadow: `0 14px 30px -18px ${accent}` }}
          >
            <span
              className={cx(
                'px-1 text-center font-black leading-none',
                vote && vote.length > 3 ? 'text-[10px] uppercase' : 'text-3xl',
              )}
              style={{ color: accent }}
            >
              {vote}
            </span>
          </div>
        </div>
      </div>

      <div className="flex max-w-24 flex-col items-center gap-1">
        <div className="relative">
          <Avatar name={player.name} color={accent} size={40} dimmed={!isOnline} />
          {isOnline && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
              style={{
                backgroundColor: 'var(--color-mint)',
                borderColor: 'var(--surface-base)',
              }}
              title="Online"
            />
          )}
        </div>
        <span
          className={cx(
            'max-w-full truncate text-xs font-black',
            isYou ? 'text-ink' : 'text-ink-muted',
          )}
          title={player.name}
        >
          {player.name}
          {isYou && ' (você)'}
        </span>
        <span
          className="text-[9px] font-black uppercase tracking-[0.1em]"
          style={{ color: accent }}
        >
          {ROLE_SHORT[player.role]}
        </span>
      </div>
    </div>
  )
}

import { Initials } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import type { TallyEntry } from '@/lib/scoring'

/** "Como o time votou": uma coluna por carta, com quem escolheu cada uma. */
export function VoteTally({ tally, consensus }: { tally: TallyEntry[]; consensus: boolean }) {
  return (
    <div className="mb-7">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.14em] text-ink-muted">
          Como o time votou
        </h3>
        {consensus && (
          <span className="animate-pop-in rounded-full bg-[linear-gradient(100deg,var(--color-brand-500),var(--color-punch),var(--color-zest))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-lg">
            Consenso 🎯
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {tally.map(({ label, players }) => (
          <div
            key={label}
            className="flex min-w-24 flex-1 flex-col items-center gap-2 rounded-2xl bg-[var(--surface-sunken)] p-4"
          >
            <span
              className={cx('font-black text-ink', label.length > 3 ? 'text-xs uppercase' : 'text-3xl')}
            >
              {label}
            </span>
            <div className="flex -space-x-2">
              {players.map((player) => (
                <span key={player.id} title={player.name}>
                  <Initials name={player.name} role={player.role} size="sm" />
                </span>
              ))}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-ink-subtle">
              {players.length} voto{players.length !== 1 && 's'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

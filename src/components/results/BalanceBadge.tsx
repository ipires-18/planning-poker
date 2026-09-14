import { cx } from '@/lib/cx'
import { tidy } from '@/lib/scoring'

/** Quanto ainda falta (ou sobra) distribuir. */
export function BalanceBadge({ remaining, balanced }: { remaining: number; balanced: boolean }) {
  const tone = balanced
    ? 'bg-mint/15 text-mint'
    : remaining > 0
      ? 'bg-zest/15 text-zest'
      : 'bg-coral/15 text-coral'

  const text = balanced
    ? 'Fecha certinho ✓'
    : remaining > 0
      ? `Faltam ${tidy(remaining)}`
      : `Excedeu ${tidy(Math.abs(remaining))}`

  return <div className={cx('rounded-xl px-3 py-1.5 text-xs font-black', tone)}>{text}</div>
}

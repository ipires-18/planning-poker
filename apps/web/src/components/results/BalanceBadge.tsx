import { Badge } from '@pp/ds/atoms'
import { tidy } from '@/lib/scoring'

/** Quanto ainda falta (ou sobra) distribuir. */
export function BalanceBadge({ remaining, balanced }: { remaining: number; balanced: boolean }) {
  if (balanced) return <Badge tone="positive">Fecha certinho ✓</Badge>

  return remaining > 0 ? (
    <Badge tone="attention">Faltam {tidy(remaining)}</Badge>
  ) : (
    <Badge tone="critical">Excedeu {tidy(Math.abs(remaining))}</Badge>
  )
}

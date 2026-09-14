import { Initials, type InitialsSize } from '#atoms/initials'
import { cn } from '#lib/utils'
import type { AccentRole } from '#tokens/index'

/**
 * Quem é a pessoa, em uma linha: inicial colorida, nome e papel.
 *
 * Aparece na mesa, no placar, na divisão de pontos e no resumo. Ter uma peça só
 * é o que garante que a mesma pessoa se pareça consigo mesma em todas.
 *
 * A cor vem do `data-role`, resolvida pelo tema — o componente não sabe que
 * Front-End é ciano, e não precisa saber.
 */
export function PersonChip({
  name,
  role,
  roleLabel,
  size = 'md',
  meta,
  dimmed,
  className,
}: {
  name: string
  role: AccentRole
  /** Rótulo curto do papel: "Front", "Lead", "QA". */
  roleLabel?: string
  size?: 'sm' | 'md'
  /** Complemento discreto: "falta 2d", "ausente". */
  meta?: string
  dimmed?: boolean
  className?: string
}) {
  const avatar: InitialsSize = size === 'sm' ? 'sm' : 'md'

  return (
    <span data-role={role} className={cn('flex min-w-0 items-center gap-3', className)}>
      <Initials name={name} role={role} size={avatar} dimmed={dimmed} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            'truncate font-bold text-ink',
            size === 'sm' ? 'text-caption' : 'text-body-sm',
          )}
        >
          {name}
        </span>
        {(roleLabel || meta) && (
          <span className="truncate text-overline font-black uppercase tracking-(--tracking-overline) text-(--ds-accent)">
            {[roleLabel, meta].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
    </span>
  )
}

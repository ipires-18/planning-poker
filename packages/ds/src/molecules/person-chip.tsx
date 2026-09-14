import { Initials } from '#atoms/initials'
import { cn } from '#lib/utils'

/**
 * Quem é a pessoa, em uma linha: inicial colorida, nome e papel.
 *
 * Aparece na mesa, no placar, na divisão de pontos e no resumo. Ter uma peça
 * só é o que garante que a mesma pessoa se pareça consigo mesma em todas.
 */
export function PersonChip({
  name,
  role,
  accent,
  size = 'md',
  meta,
  dimmed,
  className,
}: {
  name: string
  /** Rótulo curto do papel: "Front", "Lead", "QA". */
  role?: string
  /** Cor do papel: `ROLE_ACCENT[role]`. */
  accent: string
  size?: 'sm' | 'md'
  /** Complemento discreto: "falta 2d", "ausente". */
  meta?: string
  dimmed?: boolean
  className?: string
}) {
  const avatar = size === 'sm' ? 26 : 34

  return (
    <span className={cn('flex min-w-0 items-center gap-3', className)}>
      <Initials name={name} color={accent} size={avatar} dimmed={dimmed} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            'truncate font-bold text-ink',
            size === 'sm' ? 'text-caption' : 'text-body-sm',
          )}
        >
          {name}
        </span>
        {(role || meta) && (
          <span
            className="truncate text-overline font-black uppercase tracking-(--tracking-overline)"
            style={{ color: accent }}
          >
            {[role, meta].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
    </span>
  )
}

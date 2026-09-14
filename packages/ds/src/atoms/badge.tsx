import type { ReactNode } from 'react'
import { cn } from '#lib/utils'
import type { AccentRole, Tone } from '#tokens/index'

/**
 * Selo — um rótulo curto que classifica o que está ao lado.
 *
 * Não recebe cor: recebe um tom ou um papel, e o tema resolve. Por isso o mesmo
 * selo serve para "QA" e para "estourou o limite" sem ganhar variante nova.
 *
 * `soft` é o padrão (fundo lavado, como no Preline). `solid` é para quando o
 * selo precisa ganhar da superfície, e `outline` para quando ele não pode
 * competir com o conteúdo.
 */
export type BadgeVariant = 'soft' | 'solid' | 'outline'

const VARIANT: Record<BadgeVariant, string> = {
  soft: 'ds-accent-wash text-(--ds-accent-ink)',
  solid: 'bg-(--ds-accent) text-white',
  outline: 'border border-(--ds-accent-line) text-(--ds-accent-ink)',
}

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  /** Estado: `brand`, `positive`, `attention`, `critical`, `neutral`. */
  tone?: Tone
  /** Quando o selo fala de uma pessoa, o papel dela manda na cor. */
  role?: AccentRole
  className?: string
}

export function Badge({ children, variant = 'soft', tone, role, className }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-tone={role ? undefined : tone}
      data-role={role}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1',
        'text-overline font-black uppercase tracking-(--tracking-overline)',
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

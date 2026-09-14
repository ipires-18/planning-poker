/**
 * Ponte entre as telas e o design system.
 *
 * Os primitivos agora moram no @pp/ds. Este arquivo existe para as telas
 * continuarem importando de um lugar só enquanto migram uma a uma — quando a
 * última sair daqui, ele some.
 *
 * O que ainda não tem equivalente no DS fica logo abaixo, marcado.
 */
import type { ReactNode } from 'react'

export { Button, Input, Card, Spinner } from '@pp/ds/atoms'
export { Field } from '@pp/ds/molecules'
export { Modal } from '@pp/ds/organisms'
export { cn as cx } from '@pp/ds/lib/utils'

import { Initials } from '@pp/ds/atoms'
import { cn } from '@pp/ds/lib/utils'

/** Ainda do produto: o DS expõe `Initials`, e o nome antigo segue por ora. */
export const Avatar = Initials

/* -------------------------------------------------------------------------- */
/* Sem equivalente no DS por enquanto                                          */
/* -------------------------------------------------------------------------- */

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cn(
      'w-full cursor-pointer rounded-[var(--radius-control)] border border-hairline bg-sunken px-4 py-3 text-ink',
      'outline-none transition-all duration-(--duration-quick)',
      'focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15',
      props.className,
    )}
  />
)

export function Badge({
  children,
  color = 'var(--color-brand-400)',
}: {
  children: ReactNode
  color?: string
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-overline font-black uppercase tracking-(--tracking-overline)"
      style={{ color, backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
    >
      {children}
    </span>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-control)] border border-coral/30 bg-coral/10 px-4 py-3 text-body-sm font-semibold text-coral"
    >
      {children}
    </div>
  )
}

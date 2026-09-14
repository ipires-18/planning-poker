import { cn } from '#lib/utils'
import type { AccentRole } from '#tokens/index'

/** Degraus fechados, porque avatar em tamanho arbitrário não alinha com nada. */
export type InitialsSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE: Record<InitialsSize, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-body-sm',
  lg: 'size-10 text-body',
  xl: 'size-13 text-title-sm',
}

/**
 * A inicial de quem não tem foto, no degradê da cor do papel.
 *
 * A cor não entra por prop: entra por `data-role`, e o tema resolve. É o que
 * mantém o mapa papel→cor num lugar só e tira o `style` inline do caminho.
 *
 * Fica ao lado do Avatar do registry em vez de dentro dele — o Avatar resolve
 * imagem com fallback, e aqui nunca há imagem, porque o produto não pede foto
 * a ninguém.
 */
export function Initials({
  name,
  role,
  size = 'md',
  dimmed,
  className,
}: {
  name: string
  role: AccentRole
  size?: InitialsSize
  dimmed?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      data-role={role}
      className={cn(
        'ds-accent-gradient inline-flex shrink-0 items-center justify-center',
        'rounded-full font-black text-white',
        'transition-opacity duration-(--duration-scene)',
        SIZE[size],
        dimmed && 'opacity-40',
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

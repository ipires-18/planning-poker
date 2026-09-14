import { cn } from '#lib/utils'

/**
 * A inicial de quem não tem foto, num degradê da cor do papel.
 *
 * Fica ao lado do Avatar do registry em vez de dentro dele: o Avatar do shadcn
 * resolve imagem com fallback, e aqui nunca há imagem — o produto não pede
 * foto a ninguém.
 */
export function Initials({
  name,
  color,
  size = 40,
  dimmed,
  className,
}: {
  name: string
  /** Cor do papel: `ROLE_ACCENT[role]`. */
  color: string
  size?: number
  dimmed?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-black text-white',
        'transition-opacity duration-(--duration-scene)',
        dimmed && 'opacity-40',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(140deg, ${color}, color-mix(in oklab, ${color} 55%, var(--color-brand-600)))`,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

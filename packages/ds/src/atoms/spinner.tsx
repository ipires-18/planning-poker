import { cn } from '#lib/utils'

const DOTS = [
  'var(--color-brand-400)',
  'var(--color-punch)',
  'var(--color-zest)',
]

/**
 * Três bolinhas subindo em sequência.
 *
 * Não é um spinner de biblioteca de propósito: o produto é lúdico, e um
 * círculo girando cinza destoaria de tudo ao redor.
 */
export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4', className)} role="status">
      <div className="flex gap-1.5" aria-hidden>
        {DOTS.map((color, i) => (
          <span
            key={color}
            className="size-3 rounded-full"
            style={{
              backgroundColor: color,
              animation: `ds-bounce 0.9s ${i * 0.12}s var(--ease-out-soft) infinite`,
            }}
          />
        ))}
      </div>
      {label ? (
        <p className="text-sm font-bold text-ink-muted">{label}</p>
      ) : (
        <span className="sr-only">Carregando</span>
      )}
    </div>
  )
}

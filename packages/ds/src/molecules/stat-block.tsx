import { cn } from '#lib/utils'

/**
 * Um número grande com um rótulo embaixo.
 *
 * Repetido em dias úteis, pontos distribuídos, histórias na fila. Sem uma peça
 * comum, cada tela escolhia um corpo de fonte diferente para o mesmo tipo de
 * informação.
 */
export function StatBlock({
  value,
  label,
  highlight,
  className,
}: {
  value: number | string
  label: string
  /** Aplica o degradê da marca — use no número que importa mais no bloco. */
  highlight?: boolean
  className?: string
}) {
  return (
    <div className={cn('rounded-[var(--radius-control)] bg-sunken py-4 text-center', className)}>
      <span
        className={cn(
          'block text-display-sm font-black',
          highlight ? 'ds-text-gradient' : 'text-ink',
        )}
      >
        {value}
      </span>
      <span className="mt-1 block text-overline font-black uppercase tracking-(--tracking-overline) text-ink-subtle">
        {label}
      </span>
    </div>
  )
}

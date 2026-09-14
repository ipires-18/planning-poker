import { cn } from '#lib/utils'
import type { Tone } from '#tokens/index'

/**
 * Barra de progresso.
 *
 * Recebe quanto e de quanto, e não a porcentagem pronta — assim o cálculo mora
 * num lugar só e os atributos de acessibilidade saem de graça. Passar do teto é
 * permitido: a barra satura em 100%, e quem quiser avisar troca o tom.
 */
export interface ProgressProps {
  value: number
  max?: number
  tone?: Tone
  /** Descrição para leitor de tela e para o balão do mouse. */
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function Progress({
  value,
  max = 100,
  tone,
  label,
  size = 'md',
  className,
}: ProgressProps) {
  const ratio = max > 0 ? value / max : 0
  const pct = Math.min(1, Math.max(0, ratio)) * 100

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      title={label}
      className={cn(
        'overflow-hidden rounded-full bg-sunken',
        size === 'sm' ? 'h-1' : 'h-2',
        className,
      )}
    >
      <div
        data-tone={tone}
        className="h-full rounded-full bg-(--ds-accent) transition-[width] duration-(--duration-scene)"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

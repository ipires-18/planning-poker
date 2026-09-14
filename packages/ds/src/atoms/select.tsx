import type { ComponentProps } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '#lib/utils'

/**
 * Campo de escolha.
 *
 * É um `<select>` nativo de propósito, e não um menu montado à mão: no celular
 * ele abre a roda do sistema, que é mais rápida de usar com o polegar do que
 * qualquer lista que a gente desenhe — e vem com busca por digitação e leitura
 * de tela sem custo nenhum.
 *
 * O que o navegador não deixa estilizar é a setinha; ela é desenhada por cima,
 * e o `appearance-none` tira a original.
 */
export interface SelectProps extends Omit<ComponentProps<'select'>, 'size'> {
  size?: 'sm' | 'md'
  /**
   * Ocupa a largura do container, que é o caso comum num formulário. Desligue
   * quando o select for parte de uma linha — um seletor de tipo ao lado de um
   * título, por exemplo — e ele encolhe até o conteúdo.
   */
  fullWidth?: boolean
}

const SIZE = {
  sm: 'h-(--control-sm) ps-3 pe-9 text-caption',
  md: 'h-(--control-md) ps-4 pe-10 text-body-sm',
} as const

export function Select({ size = 'md', fullWidth = true, className, ...props }: SelectProps) {
  return (
    <span className={cn('relative inline-flex items-center', fullWidth && 'w-full')}>
      <select
        data-slot="select"
        className={cn(
          'appearance-none rounded-[var(--radius-control)] border border-hairline bg-sunken',
          fullWidth && 'w-full',
          'font-bold text-ink outline-none',
          'transition-colors duration-(--duration-quick)',
          'hover:border-(--ds-accent-line)',
          'focus-visible:border-(--ds-accent) focus-visible:ring-3 focus-visible:ring-(--ds-accent-line)',
          'disabled:cursor-not-allowed disabled:opacity-50',
          SIZE[size],
          className,
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        className={cn(
          'pointer-events-none absolute end-3 size-4 text-ink-subtle',
          props.disabled && 'opacity-50',
        )}
      />
    </span>
  )
}

import type { ComponentProps } from 'react'
import { Input as ShadcnInput } from '#ui/input'
import { cn } from '#lib/utils'

/**
 * O campo de texto do produto.
 *
 * O do registry tem 32px de altura travada, que é pouco para o polegar e, pior,
 * nunca bate com o botão ao lado. Aqui a altura sai do mesmo token que o botão
 * e o select leem, então um campo `lg` e um botão `lg` na mesma linha alinham
 * sem ninguém ajustar na mão.
 */
export type InputSize = 'sm' | 'md' | 'lg'

const SIZE: Record<InputSize, string> = {
  sm: 'h-(--control-sm) px-3 text-caption',
  md: 'h-(--control-md) px-4 text-body-sm',
  lg: 'h-(--control-lg) px-5 text-body',
}

export interface InputProps extends Omit<ComponentProps<typeof ShadcnInput>, 'size'> {
  size?: InputSize
}

export function Input({ size = 'md', className, ...props }: InputProps) {
  return (
    <ShadcnInput
      className={cn(
        'rounded-[var(--radius-control)] font-bold',
        'focus-visible:border-(--ds-accent) focus-visible:ring-(--ds-accent-line)',
        SIZE[size],
        className,
      )}
      {...props}
    />
  )
}

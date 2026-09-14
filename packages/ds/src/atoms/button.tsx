import type { ComponentProps } from 'react'
import { Button as ShadcnButton } from '#ui/button'
import { cn } from '#lib/utils'

type ShadcnProps = ComponentProps<typeof ShadcnButton>

/**
 * Variantes do produto, por cima das do registry.
 *
 * `joy` é a única que o shadcn não tem: o degradê da marca, reservado para a
 * ação principal de uma tela — criar a sessão, confirmar a pontuação, retomar.
 * As demais são apelidos com o vocabulário que o time já usa, mapeados para o
 * que o registry chama.
 */
export type ButtonTone =
  | 'joy'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline'
  | 'link'

const TO_SHADCN: Record<Exclude<ButtonTone, 'joy'>, ShadcnProps['variant']> = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
  danger: 'destructive',
  outline: 'outline',
  link: 'link',
}

const JOY =
  'text-white shadow-lg shadow-punch/30 border-transparent ' +
  'bg-[linear-gradient(100deg,var(--color-brand-500),var(--color-punch),var(--color-zest))] ' +
  'bg-[length:200%_auto] hover:bg-[position:right_center]'

/**
 * Escala de tamanho do produto.
 *
 * A do registry é mais compacta (32px de altura no padrão) do que a que este
 * produto usa: a mesa é tocada por gente no celular, e o alvo precisa caber no
 * polegar. Os três degraus abaixo substituem a altura e o respiro do registry;
 * o resto das classes dele continua valendo.
 */
export type ButtonSize = 'sm' | 'md' | 'lg'

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-[var(--radius-control)] px-3 text-caption',
  md: 'h-11 gap-2 rounded-[var(--radius-control)] px-4 text-body-sm',
  lg: 'h-14 gap-2.5 rounded-[var(--radius-control)] px-6 text-body',
}

export interface ButtonProps extends Omit<ShadcnProps, 'variant' | 'size'> {
  variant?: ButtonTone
  size?: ButtonSize
}

/**
 * O botão do produto.
 *
 * Herda de `#ui/button`, que é React Aria por baixo — então o `disabled` do
 * HTML aqui se chama `isDisabled`, e o clique responde a teclado e toque sem
 * nada extra.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const joy = variant === 'joy'

  return (
    <ShadcnButton
      variant={joy ? 'default' : TO_SHADCN[variant]}
      className={cn(
        'font-bold tracking-(--tracking-tight)',
        'transition-all duration-(--duration-settle) [transition-timing-function:var(--ease-spring)]',
        'active:scale-[0.97]',
        SIZE[size],
        joy && JOY,
        className,
      )}
      {...props}
    />
  )
}

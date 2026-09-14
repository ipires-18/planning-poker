import type { ComponentProps } from 'react'
import { Button as ShadcnButton } from '#ui/button'
import { cn } from '#lib/utils'

type ShadcnProps = ComponentProps<typeof ShadcnButton>

/**
 * Variantes no padrão do Preline: a forma do botão e o peso dele na tela são
 * uma coisa (`variant`), e a cor é outra (`tone`). As seis variantes cobrem a
 * escada inteira de ênfase, de "a ação da tela" até "isto é só um link".
 *
 *   solid    a ação principal — o tom cheio
 *   soft     ênfase média, o tom lavado no fundo
 *   outline  ação secundária, só traço
 *   ghost    ação terciária, sem traço, o fundo só aparece no hover
 *   white    a neutra: superfície elevada com traço fino (o "White" do Preline)
 *   link     sem caixa nenhuma
 *
 * `joy` e `joy-mirror` são as únicas fora do padrão, e existem de propósito:
 * são o degradê da marca, reservado às duas pontas da jornada — criar a sessão
 * e sentar nela. O espelho corre ao contrário (âmbar → rosa → violeta), o que
 * faz as duas telas se reconhecerem como par sem serem a mesma coisa. Fora
 * dessas duas, use `solid`.
 */
export type ButtonVariant =
  | 'solid'
  | 'soft'
  | 'outline'
  | 'ghost'
  | 'white'
  | 'link'
  | 'joy'
  | 'joy-mirror'

/**
 * O tom só diz *qual* cor; cada variante decide como usá-la. É o mesmo
 * `data-tone` que o resto do DS já lê, então um botão dentro de um bloco com
 * papel declarado herda a cor da pessoa sem receber prop nenhuma.
 */
export type ButtonTone = 'brand' | 'critical' | 'positive' | 'attention'

/**
 * Cada recipe reescreve hover e foco por completo — inclusive no escuro.
 * O registry traz hover próprio na variante que herdamos dele, e classe com
 * `dark:` não some por conflito: só outra `dark:` a vence.
 */
const VARIANT: Record<ButtonVariant, string> = {
  solid:
    'border-transparent bg-(--ds-accent) text-white shadow-sm ' +
    'hover:bg-(--ds-accent-hover) hover:text-white dark:hover:bg-(--ds-accent-hover) ' +
    'active:bg-(--ds-accent-active)',
  soft:
    'border-transparent bg-(--ds-accent-soft) text-(--ds-accent-ink) ' +
    'hover:bg-(--ds-accent-soft-hover) hover:text-(--ds-accent-ink) dark:hover:bg-(--ds-accent-soft-hover) ' +
    'active:bg-(--ds-accent-soft-hover)',
  outline:
    'border-hairline bg-transparent text-ink-muted ' +
    'hover:border-(--ds-accent-line) hover:bg-transparent hover:text-(--ds-accent-ink) dark:hover:bg-transparent ' +
    'active:border-(--ds-accent) active:text-(--ds-accent-ink)',
  ghost:
    'border-transparent bg-transparent text-(--ds-accent-ink) ' +
    'hover:bg-(--ds-accent-soft) hover:text-(--ds-accent-ink) dark:hover:bg-(--ds-accent-soft) ' +
    'active:bg-(--ds-accent-soft-hover)',
  white:
    'border-hairline bg-raised text-ink shadow-xs ' +
    'hover:bg-sunken hover:text-ink dark:hover:bg-sunken ' +
    'active:bg-sunken',
  link:
    'border-transparent bg-transparent text-(--ds-accent-ink) underline-offset-4 ' +
    'hover:bg-transparent hover:underline dark:hover:bg-transparent',
  joy:
    'border-transparent text-white shadow-lg shadow-punch/30 ' +
    'bg-[linear-gradient(100deg,var(--color-brand-500),var(--color-punch),var(--color-zest))] ' +
    'bg-[length:200%_auto] hover:bg-[position:right_center] hover:text-white',
  'joy-mirror':
    'border-transparent text-white shadow-lg shadow-punch/30 ' +
    'bg-[linear-gradient(100deg,var(--color-zest),var(--color-punch),var(--color-brand-500))] ' +
    'bg-[length:200%_auto] hover:bg-[position:right_center] hover:text-white',
}

/**
 * Escala de tamanho.
 *
 * A do registry é mais compacta (32px de altura no padrão) do que a que este
 * produto usa: a mesa é tocada por gente no celular, e o alvo precisa caber no
 * polegar. Os três degraus abaixo substituem a altura e o respiro do registry;
 * o resto das classes dele continua valendo.
 *
 * A altura vem de token, e não de padding: é o mesmo token que o campo e o
 * select leem, e é o que faz um botão ao lado de um campo alinhar sozinho. Com
 * padding, os dois só coincidiriam por acaso — e deixariam de coincidir na
 * primeira vez que alguém mudasse o corpo do texto de um deles.
 */
export type ButtonSize = 'sm' | 'md' | 'lg'

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-(--control-sm) gap-x-1.5 px-3 text-caption',
  md: 'h-(--control-md) gap-x-2 px-4 text-body-sm',
  lg: 'h-(--control-lg) gap-x-2 px-5 text-body',
}

export interface ButtonProps extends Omit<ShadcnProps, 'variant' | 'size'> {
  variant?: ButtonVariant
  size?: ButtonSize
  tone?: ButtonTone
  fullWidth?: boolean
}

/**
 * O botão do produto.
 *
 * Herda de `#ui/button`, que é React Aria por baixo — então o `disabled` do
 * HTML aqui se chama `isDisabled`, e o clique responde a teclado e toque sem
 * nada extra. Do registry aproveitamos a base (foco visível, tamanho de ícone,
 * estado desabilitado); a aparência é toda daqui.
 */
export function Button({
  variant = 'solid',
  size = 'md',
  tone,
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <ShadcnButton
      variant="ghost"
      data-tone={tone}
      className={cn(
        'rounded-[var(--radius-control)] font-bold tracking-(--tracking-tight)',
        'transition-colors duration-(--duration-quick)',
        'focus-visible:ring-(--ds-accent-line)',
        SIZE[size],
        VARIANT[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  )
}

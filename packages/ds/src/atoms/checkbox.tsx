import { CheckIcon, MinusIcon } from 'lucide-react'
import {
  Checkbox as CheckboxPrimitive,
  composeRenderProps,
  type CheckboxProps as AriaCheckboxProps,
} from 'react-aria-components'
import { cn } from '#lib/utils'

/**
 * Caixa e rótulo, lado a lado.
 *
 * O `Checkbox` do registry é só a caixa: ele aplica o tamanho de 16px na
 * própria raiz, e o que você passa como filho cai *dentro* dela. Serve para
 * quem compõe com `Field`, e quebra para quem escreve
 * `<Checkbox>A QA vota</Checkbox>`, que é o uso do dia a dia.
 *
 * Este átomo assume esse uso: a raiz vira a linha, a caixa vira um filho, e o
 * rótulo fica ao lado com o alvo de toque inteiro clicável. O registry segue
 * intocado em `src/ui/`, disponível para quem quiser compor na mão.
 *
 * A cor marcada é `--ds-accent`, então um checkbox dentro de um bloco com tom
 * ou papel declarado acompanha sem receber prop nenhuma.
 */
export interface CheckboxProps extends Omit<AriaCheckboxProps, 'className'> {
  className?: string
  /** Linha de apoio abaixo do rótulo. */
  description?: string
}

export function Checkbox({ children, className, description, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox-row"
      className={cn(
        'group/checkbox flex w-fit items-start gap-2.5 text-body-sm text-ink',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected, isIndeterminate }) => (
        <>
          <span
            data-slot="checkbox"
            className={cn(
              'mt-0.5 grid size-[18px] shrink-0 place-content-center rounded-[var(--radius-check)]',
              'border-2 border-hairline bg-raised text-white',
              'transition-colors duration-(--duration-instant)',
              'group-data-[hovered]/checkbox:border-(--ds-accent-line)',
              'group-data-[focus-visible]/checkbox:ring-3 group-data-[focus-visible]/checkbox:ring-(--ds-accent-line)',
              (isSelected || isIndeterminate) && 'border-(--ds-accent) bg-(--ds-accent)',
            )}
          >
            {isIndeterminate ? (
              <MinusIcon className="size-3" strokeWidth={4} />
            ) : (
              isSelected && <CheckIcon className="size-3" strokeWidth={4} />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-bold leading-snug">{children}</span>
            {description && (
              <span className="text-caption font-normal text-ink-muted">{description}</span>
            )}
          </span>
        </>
      ))}
    </CheckboxPrimitive>
  )
}

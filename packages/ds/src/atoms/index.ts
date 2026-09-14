/**
 * Átomos — a menor peça que ainda faz sentido sozinha.
 *
 * A maioria vem do registry do shadcn e vive intocada em `src/ui/`, para que
 * `shadcn add` e `shadcn diff` continuem funcionando. Esta camada é a fachada:
 * é por aqui que o produto importa, e é aqui que um átomo nosso entra quando
 * o registry não tem equivalente.
 *
 * A regra para estar aqui: não depende de nenhum outro componente do DS.
 */

export { Button, type ButtonProps, type ButtonTone } from './button'
export { buttonVariants } from '#ui/button'
export { Input, type InputProps } from './input'
export { Select, type SelectProps } from './select'
export { Checkbox, type CheckboxProps } from './checkbox'
export { Label } from '#ui/label'
export { Badge, type BadgeProps, type BadgeVariant } from './badge'
export { Avatar, AvatarImage, AvatarFallback } from '#ui/avatar'
export { Separator } from '#ui/separator'

/* Nossos, sem equivalente no registry. */
export { Note, type NoteProps } from './note'
export { Progress, type ProgressProps } from './progress'
export { Card } from './card'
export { Spinner } from './spinner'
export { Initials } from './initials'
export { Logo } from './logo'

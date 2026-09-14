import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Junta classes resolvendo conflito do Tailwind.
 *
 * `clsx` monta a lista e `twMerge` resolve o empate: quem passa `className`
 * de fora ganha do valor padrão do componente, que é o que faz a customização
 * pontual funcionar sem `!important`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

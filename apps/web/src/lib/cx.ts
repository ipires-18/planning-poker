/**
 * O app usa o mesmo juntador de classes do design system.
 *
 * Existia uma cópia aqui — mais fraca: não resolvia conflito do Tailwind nem
 * aceitava array. Duas funções com o mesmo nome e comportamentos diferentes é
 * exatamente o tipo de divergência que um DS existe para acabar.
 */
export { cn as cx } from '@pp/ds/lib/utils'

/**
 * Os tokens que o TypeScript precisa enxergar.
 *
 * Cor e tipografia vivem no CSS — é lá que o tema troca sem recompilar. O que
 * sobe para cá é o que a lógica consulta: o papel de cada acento, os degraus da
 * escala, os nomes que a documentação lista.
 */

export const ROLE_ACCENT = {
  po: 'var(--color-zest)',
  tech_lead: 'var(--color-grape)',
  frontend: 'var(--color-sky)',
  backend: 'var(--color-mint)',
  qa: 'var(--color-punch)',
} as const

export type AccentRole = keyof typeof ROLE_ACCENT

/** Semânticos: o que a cor quer dizer, não como ela é. */
export const FEEDBACK = {
  positive: 'var(--color-mint)',
  attention: 'var(--color-zest)',
  critical: 'var(--color-coral)',
  brand: 'var(--color-brand-500)',
} as const

export type Feedback = keyof typeof FEEDBACK

/** A escala tipográfica, na ordem, para a página de estilo listar. */
export const TYPE_SCALE = [
  { token: 'overline', size: '10px', use: 'Rótulo em caixa alta' },
  { token: 'caption', size: '12px', use: 'Apoio e metadado' },
  { token: 'body-sm', size: '14px', use: 'Interface densa' },
  { token: 'body', size: '16px', use: 'Texto corrido' },
  { token: 'title-sm', size: '20px', use: 'Título de bloco' },
  { token: 'title', size: '24px', use: 'Título de seção' },
  { token: 'display-sm', size: '32px', use: 'Título de tela' },
  { token: 'display', size: '40px', use: 'Título de página' },
  { token: 'hero', size: '56px', use: 'Só na entrada' },
] as const

/** Múltiplos da base de 4px que o produto usa. */
export const SPACE_SCALE = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20] as const

export const RADII = [
  { token: 'control', value: '1rem', use: 'Botão e campo' },
  { token: 'card', value: '1.5rem', use: 'Cartão e painel' },
  { token: 'blob', value: '2.5rem', use: 'Superfície grande' },
] as const

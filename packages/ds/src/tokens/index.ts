/**
 * Os tokens que o TypeScript precisa enxergar.
 *
 * Cor e tipografia vivem no CSS — é lá que o tema troca sem recompilar. O que
 * sobe para cá é o que a lógica consulta: o papel de cada acento, os degraus da
 * escala, os nomes que a documentação lista.
 */

/** Os degraus de toda rampa do DS, na ordem. */
export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

/**
 * As rampas de cor e o que cada uma significa.
 *
 * O valor de cada degrau não está aqui — está no CSS, que é onde o tema troca
 * sem recompilar. O que sobe para o TypeScript é o nome e o sentido, que é do
 * que a vitrine e a lógica precisam. Ler um degrau é `var(--color-mint-300)`.
 */
export const PALETTES = [
  { name: 'brand', label: 'Marca', means: 'Ação, identidade, foco' },
  { name: 'grape', label: 'Uva', means: 'Tech Lead' },
  { name: 'sky', label: 'Ciano', means: 'Front-End' },
  { name: 'mint', label: 'Verde', means: 'Back-End, e o positivo: dentro do limite' },
  { name: 'zest', label: 'Âmbar', means: 'Product Owner, e a atenção: perto do teto' },
  { name: 'punch', label: 'Rosa', means: 'QA, destaque quente' },
  { name: 'iris', label: 'Azul', means: 'Designer' },
  { name: 'lime', label: 'Limão', means: 'Produto — a cadeira do negócio' },
  { name: 'coral', label: 'Coral', means: 'Erro, estouro, ação destrutiva' },
] as const

export type PaletteName = (typeof PALETTES)[number]['name']

/**
 * Papel na cerimônia → rampa. Espelha o `[data-role]` do tema.
 *
 * Componente nenhum consulta este mapa: quem pinta é o CSS, a partir do
 * atributo. Ele existe para a documentação poder listar a correspondência, e
 * para o tipo do papel ter um lugar só.
 */
export const ROLE_PALETTE = {
  po: 'zest',
  tech_lead: 'grape',
  frontend: 'sky',
  backend: 'mint',
  qa: 'punch',
  designer: 'iris',
  product: 'lime',
} as const satisfies Record<string, PaletteName>

export type AccentRole = keyof typeof ROLE_PALETTE

/** Estado → rampa. O outro eixo de cor, espelhando o `[data-tone]`. */
export const TONE_PALETTE = {
  brand: 'brand',
  positive: 'mint',
  attention: 'zest',
  critical: 'coral',
} as const satisfies Record<string, PaletteName>

export type Tone = keyof typeof TONE_PALETTE | 'neutral'

/**
 * As variantes que todo tom oferece, e para que serve cada uma.
 *
 * Este é o contrato do Preline traduzido: quem declara um tom ganha estes seis
 * valores de graça, já resolvidos para claro e escuro.
 */
export const TONE_VARIANTS = [
  { token: '--ds-accent', use: 'A cor em repouso — fundo cheio, número, traço forte' },
  { token: '--ds-accent-hover', use: 'Mouse em cima' },
  { token: '--ds-accent-active', use: 'Pressionado' },
  { token: '--ds-accent-ink', use: 'A cor como texto, legível sobre o fundo do tema' },
  { token: '--ds-accent-soft', use: 'Fundo lavado — selo, realce, variante soft' },
  { token: '--ds-accent-line', use: 'Traço e anel de foco' },
] as const

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

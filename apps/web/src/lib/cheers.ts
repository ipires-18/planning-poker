/**
 * As frases da comemoração de consenso.
 *
 * A lista padrão é neutra de propósito — vai rodar em time que eu não conheço.
 * Mas piada interna é metade da graça de uma cerimônia, então a lista é
 * configurável por ambiente: cada time sobe a sua sem tocar no código.
 *
 *   VITE_CONSENSUS_CHEERS=Rumo ao hambúrguer 🍔|Nem precisou discutir!
 *
 * O separador é `|` e não vírgula porque frase costuma ter vírgula dentro.
 * Entrada vazia, só espaços ou variável ausente caem no padrão: uma configuração
 * errada não pode deixar a festa muda.
 */

const PADRAO = [
  'Todo mundo no mesmo número!',
  'Consenso de primeira!',
  'O time teve a mesma sintonia!',
  'Nem precisou discutir!',
  'Alinhadíssimos!',
]

function parse(bruto: string | undefined): string[] {
  if (!bruto) return PADRAO
  const frases = bruto
    .split('|')
    .map((f) => f.trim())
    .filter(Boolean)
  return frases.length > 0 ? frases : PADRAO
}

/** Resolvida uma vez: a variável não muda enquanto a aba está aberta. */
export const CHEERS = parse(import.meta.env.VITE_CONSENSUS_CHEERS)

/** Uma frase ao acaso, para a festa não repetir a mesma toda rodada. */
export function randomCheer(): string {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)]
}

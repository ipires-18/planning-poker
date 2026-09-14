/**
 * Links de história vêm digitados por gente, então passam por aqui antes de
 * virar href ou texto copiado.
 *
 * O React 19 já barra `javascript:` num href, mas essa proteção acaba na borda
 * do app: o resumo final é copiado e colado no Jira ou no Slack, onde quem
 * renderiza é outro programa. A regra principal está no banco; esta é a rede
 * para o que já foi gravado antes dela existir.
 */

const ALLOWED = new Set(['http:', 'https:'])

/** Devolve o link se for navegável, ou null. */
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null

  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    return ALLOWED.has(new URL(trimmed).protocol) ? trimmed : null
  } catch {
    // Sem esquema não dá para saber para onde vai; não vira link.
    return null
  }
}

/** Como o link aparece na tela: sem o "https://", que só ocupa espaço. */
export function prettyUrl(raw: string | null | undefined): string | null {
  const url = safeUrl(raw)
  return url?.replace(/^https?:\/\//, '') ?? null
}

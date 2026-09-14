/**
 * Credenciais para os scripts, sem nada escrito no código.
 *
 * Ordem de procura: variáveis de ambiente, depois `.env.local`, depois `.env`.
 * Os dois arquivos estão no .gitignore — é lá que a chave mora, não aqui.
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/smoke.mjs
 *   # ou, mais comum: preencha .env.local e rode `npm run smoke`
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Leitor de .env enxuto: comentários, aspas e `export` à frente. */
function readEnvFile(name) {
  let raw
  try {
    raw = readFileSync(resolve(ROOT, name), 'utf8')
  } catch {
    return {}
  }

  const out = {}
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    const [, key, rest] = match
    let value = rest.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      value = value.split(' #')[0].trim()
    }
    if (value) out[key] = value
  }
  return out
}

const files = { ...readEnvFile('.env'), ...readEnvFile('.env.local') }

/** Aceita o nome puro e o com prefixo VITE_, que é o que o app usa. */
function lookup(name) {
  return (
    process.env[name] ??
    process.env[`VITE_${name}`] ??
    files[name] ??
    files[`VITE_${name}`] ??
    null
  )
}

function abort(message, hint) {
  console.error(`\n✗ ${message}`)
  if (hint) console.error(`  ${hint}`)
  console.error('')
  process.exit(1)
}

export const SUPABASE_URL = lookup('SUPABASE_URL')
export const SUPABASE_ANON_KEY = lookup('SUPABASE_ANON_KEY')
export const APP_URL = lookup('APP_URL') ?? 'http://localhost:5173'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  abort(
    'Faltam SUPABASE_URL e SUPABASE_ANON_KEY.',
    'Copie .env.example para .env.local e preencha — para o ambiente local, ' +
      '`npm run db:start` imprime os dois valores.',
  )
}

/** Um Supabase rodando na própria máquina. */
export const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(SUPABASE_URL)

/**
 * Alguns scripts criam salas e jogadores de mentira. Rodar isso contra o
 * ambiente de verdade é um acidente fácil de cometer quando o .env.local aponta
 * para produção — então é preciso dizer em voz alta que é de propósito.
 */
export function requireLocal(scriptName) {
  if (isLocal) return
  if (process.env.ALLOW_REMOTE === '1') {
    console.warn(`\n⚠  ${scriptName} rodando contra ${SUPABASE_URL} — não é o ambiente local.\n`)
    return
  }
  abort(
    `${scriptName} cria dados de teste e o .env.local aponta para ${SUPABASE_URL}.`,
    'Se é mesmo o que você quer, rode de novo com ALLOW_REMOTE=1.',
  )
}

export { abort }

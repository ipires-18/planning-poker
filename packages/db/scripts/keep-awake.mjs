/**
 * A visita semanal.
 *
 * O plano Free do Supabase pausa um projeto depois de 7 dias sem atividade.
 * Despausar é um botão no painel, mas quem descobre que precisava é a pessoa
 * que abriu o link e não viu nada — num portfólio, é o pior momento possível.
 *
 * Este script faz o mínimo que conta como atividade: entra como convidado e lê
 * uma linha. Não cria sala, não escreve nada, não usa chave secreta.
 *
 *   pnpm awake
 *
 * Ele precisa apontar para a produção, e por isso lê também o .env.local do
 * app, que é onde a URL e a chave de lá já moram. Contra um banco na própria
 * máquina ele recusa: não há o que acordar.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isLocal } from './env.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))

/** Lê o .env.local do app, que é onde as credenciais de produção vivem. */
function doApp(nome) {
  try {
    const raw = readFileSync(resolve(AQUI, '../../../apps/web/.env.local'), 'utf8')
    const linha = raw.split('\n').find((l) => l.startsWith(`${nome}=`))
    return linha ? linha.slice(nome.length + 1).trim() : null
  } catch {
    return null
  }
}

const url = isLocal ? doApp('VITE_SUPABASE_URL') : SUPABASE_URL
const key = isLocal ? doApp('VITE_SUPABASE_ANON_KEY') : SUPABASE_ANON_KEY

// A guarda olha a URL que sobrou, e não de onde ela veio: o .env.local deste
// pacote aponta para a máquina mesmo quando o do app aponta para a produção.
if (!url || !key || /127\.0\.0\.1|localhost|\[::1\]/.test(url)) {
  console.error('\n✗ Não achei um Supabase remoto para visitar.')
  console.error('  Preencha apps/web/.env.local com a URL e a chave de produção,')
  console.error('  ou rode com SUPABASE_URL=... SUPABASE_ANON_KEY=... pnpm awake\n')
  process.exit(1)
}

const inicio = Date.now()
const supabase = createClient(url, key, { auth: { persistSession: false } })

const { error: erroLogin } = await supabase.auth.signInAnonymously()
if (erroLogin) {
  console.error(`\n✗ O projeto não respondeu ao login: ${erroLogin.message}`)
  console.error('  Se ele estiver pausado, o painel do Supabase tem o botão de restaurar.\n')
  process.exit(1)
}

const { error: erroLeitura } = await supabase
  .from('rooms')
  .select('id', { count: 'exact', head: true })

if (erroLeitura) {
  console.error(`\n✗ O banco não respondeu à leitura: ${erroLeitura.message}\n`)
  process.exit(1)
}

const levou = Date.now() - inicio
const proxima = new Date(Date.now() + 6 * 864e5).toLocaleDateString('pt-BR')

console.log(`\n✓ ${new URL(url).hostname} acordado — respondeu em ${levou} ms`)
if (levou > 4000) {
  console.log('  Demorou mais que o normal: pode ter sido a saída da pausa.')
}
console.log(`  A contagem de 7 dias zerou. Volte aqui até ${proxima}.\n`)

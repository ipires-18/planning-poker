/**
 * Enche uma sala com participantes e votos, para conferir a mesa e o tempo real
 * sem precisar de vários dispositivos.
 *
 *   npm run seed            → cria uma sala de demonstração e povoa
 *   npm run seed ABC123     → povoa uma sala que já existe
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

const CAST = [
  { name: 'Ana', role: 'frontend', pick: 0.45 },
  { name: 'Bruno', role: 'backend', pick: 0.65 },
  { name: 'Carla', role: 'qa', pick: 0.45 },
  { name: 'Diego', role: 'tech_lead', pick: 0.8 },
]

/** Escolhe uma carta do baralho real da sala — pode ser camisetas, não números. */
function pickCard(scale, ratio) {
  const scoring = scale.filter((c) => c.value !== null)
  return scoring[Math.min(scoring.length - 1, Math.floor(ratio * scoring.length))].label
}

const DEMO_STORIES = [
  { title: 'Tela de login com SSO', link: 'https://jira.local/PP-1', kind: 'both' },
  { title: 'Cache do endpoint de busca', link: null, kind: 'backend' },
  { title: 'Ajuste de contraste no tema escuro', link: null, kind: 'frontend' },
]

/** Encerra com uma mensagem legível em vez de despejar stack trace. */
function abort(message, hint) {
  console.error(`\n✗ ${message}`)
  if (hint) console.error(`  ${hint}`)
  console.error('')
  process.exit(1)
}

function newClient() {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signedIn() {
  const client = newClient()
  const { error } = await client.auth.signInAnonymously()
  if (error) {
    if (error.message.includes('fetch failed')) {
      abort(
        `Não consegui falar com o Supabase em ${URL}.`,
        'Se for o ambiente local, rode `npm run db:start` antes.',
      )
    }
    if (/anonymous/i.test(error.message)) {
      abort(
        'Login anônimo está desativado no projeto.',
        'Ative em Authentication → Providers → Anonymous sign-ins.',
      )
    }
    abort(`Falha ao autenticar: ${error.message}`)
  }
  return client
}

/* ------------------------------------------------------------------------- */

const requested = (process.argv[2] ?? '').toUpperCase()
let roomId = requested

const host = await signedIn()

if (roomId) {
  const { data: room } = await host.from('rooms').select('id, session_name, ended').eq('id', roomId).maybeSingle()

  if (!room) {
    abort(
      `A sala ${roomId} não existe.`,
      'Crie uma sessão no app e use o código do cabeçalho — ou rode `npm run seed` sem argumento para eu criar uma.',
    )
  }
  if (room.ended) abort(`A sala ${roomId} já foi encerrada.`)

  console.log(`\nPovoando a sala ${roomId} — ${room.session_name}\n`)
} else {
  // Sem código: o próprio script vira o PO e monta uma sprint de demonstração.
  const { data, error } = await host.rpc('create_room', {
    p_session_name: 'Sprint de demonstração',
    p_host_name: 'PO da demo',
    p_stories: DEMO_STORIES,
  })
  if (error) abort(`Não consegui criar a sala: ${error.message}`)

  roomId = data
  console.log(`\nSala de demonstração criada: ${roomId}\n`)
}

async function actor({ name, role, pick }) {
  const client = await signedIn()

  const { error } = await client.rpc('join_room', {
    p_room_id: roomId,
    p_name: name,
    p_role: role,
  })
  if (error) abort(`${name} não conseguiu entrar: ${error.message}`)

  const { data: state } = await client.from('rooms').select('*').eq('id', roomId).single()
  const { data: stories } = await client
    .from('stories')
    .select('*')
    .eq('room_id', roomId)
    .order('position')

  const card = pickCard(state.point_scale, pick)
  const story = stories?.[state.current_story_index]
  if (!story) {
    console.log(`  ${name} (${role}) entrou — a sprint já acabou, ninguém votou`)
    return
  }

  const { error: voteError } = await client.rpc('cast_vote', {
    p_room_id: roomId,
    p_story_id: story.id,
    p_side: state.current_side,
    p_round: state.current_round,
    p_value: card,
  })
  if (voteError) abort(`${name} não conseguiu votar: ${voteError.message}`)

  console.log(`  ${name} (${role}) entrou e votou ${card}`)
}

// Entram um a um, com pausa, para dar para ver a mesa se enchendo ao vivo.
for (const member of CAST) {
  await actor(member)
  await new Promise((r) => setTimeout(r, 900))
}

console.log(`\n✓ Mesa pronta.`)
console.log(`  Entrar:     ${APP_URL}/entrar/${roomId}`)
if (!requested) {
  console.log(`\n  O PO desta sala é o script, não você — para revelar as cartas,`)
  console.log(`  entre como Tech Lead, que tem os mesmos poderes.`)
}
console.log('')

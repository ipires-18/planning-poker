/**
 * Enche uma sala aberta no navegador com participantes e votos, para conferir a
 * mesa e o tempo real sem precisar de vários dispositivos.
 *
 *   node scripts/seed-room.mjs ABC123 [--reveal]
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const roomId = (process.argv[2] ?? '').toUpperCase()
if (!roomId) {
  console.error('uso: node scripts/seed-room.mjs <CODIGO> [--reveal]')
  process.exit(1)
}

const CAST = [
  { name: 'Ana', role: 'frontend', card: '5' },
  { name: 'Bruno', role: 'backend', card: '8' },
  { name: 'Carla', role: 'qa', card: '5' },
  { name: 'Diego', role: 'tech_lead', card: '13' },
]

const anon = createClient(URL, KEY, { auth: { persistSession: false } })
const { data: room, error: roomError } = await anon.from('rooms').select('*').eq('id', roomId).maybeSingle()
// Sem sessão, a leitura acima falha por RLS — então autenticamos antes.
void roomError

async function actor({ name, role, card }) {
  const client = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await client.auth.signInAnonymously()

  const { error } = await client.rpc('join_room', {
    p_room_id: roomId,
    p_name: name,
    p_role: role,
  })
  if (error) throw new Error(`${name}: ${error.message}`)

  const { data: state } = await client.from('rooms').select('*').eq('id', roomId).single()
  const { data: stories } = await client
    .from('stories')
    .select('*')
    .eq('room_id', roomId)
    .order('position')

  const story = stories[state.current_story_index]
  if (story) {
    const { error: voteError } = await client.rpc('cast_vote', {
      p_room_id: roomId,
      p_story_id: story.id,
      p_side: state.current_side,
      p_round: state.current_round,
      p_value: card,
    })
    if (voteError) throw new Error(`${name} votando: ${voteError.message}`)
  }

  console.log(`  ${name} (${role}) entrou e votou ${card}`)
  return client
}

console.log(`\nPovoando a sala ${roomId}${room ? ` — ${room.session_name}` : ''}\n`)

// Entram um a um, com pausa, para dar para ver a mesa se enchendo ao vivo.
for (const member of CAST) {
  await actor(member)
  await new Promise((r) => setTimeout(r, 900))
}

console.log('\nPronto. A mesa deve estar cheia na aba aberta.\n')

/**
 * Deixa uma sala pronta com o time inteiro votando a mesma carta, para ver a
 * comemoração de consenso. Entre pelo link e clique em Revelar.
 *
 *   node scripts/demo-consenso.mjs [carta]
 */
import { createClient } from '@supabase/supabase-js'
import { APP_URL, SUPABASE_ANON_KEY as KEY, SUPABASE_URL as URL, requireLocal } from './env.mjs'

// Cria uma sala e três jogadores de mentira.
requireLocal('A demonstração de consenso')

const carta = process.argv[2] ?? '8'

const novo = async () => {
  const c = createClient(URL, KEY, { auth: { persistSession: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) {
    console.error(`\n✗ ${error.message}\n  Rode \`npm run db:start\` antes.\n`)
    process.exit(1)
  }
  return c
}

const host = await novo()
const { data: room, error } = await host.rpc('create_room', {
  p_session_name: 'Demonstração de consenso',
  p_host_name: 'PO da demo',
  p_stories: [{ title: 'História em que todo mundo concorda', link: null, kind: 'frontend' }],
})
if (error) {
  console.error(`\n✗ ${error.message}\n`)
  process.exit(1)
}

for (const [nome, papel] of [
  ['Ana', 'frontend'],
  ['Bruno', 'backend'],
  ['Diego', 'tech_lead'],
]) {
  const c = await novo()
  await c.rpc('join_room', { p_room_id: room, p_name: nome, p_role: papel })

  // Só depois de entrar a RLS libera ler a sala e as histórias.
  const { data: sala } = await c.from('rooms').select('*').eq('id', room).single()
  const { data: stories } = await c.from('stories').select('*').eq('room_id', room).order('position')

  const { error: voteError } = await c.rpc('cast_vote', {
    p_room_id: room,
    p_story_id: stories[sala.current_story_index].id,
    p_side: sala.current_side,
    p_round: sala.current_round,
    p_value: carta,
  })
  console.log(`  ${nome} votou ${voteError ? `— ${voteError.message}` : carta}`)
}

console.log(`
✓ Sala ${room} pronta, três pessoas cravaram ${carta}.

  1. Abra  ${APP_URL}/join/${room}
  2. Entre como Tech Lead
  3. Vote ${carta} também — o consenso só conta com todo mundo
  4. Clique em Revelar
`)

/**
 * Teste de fumaça contra o Supabase local.
 *
 * Simula uma sessão inteira com quatro pessoas e, no meio do caminho, tenta
 * ler os votos alheios antes da revelação — que é a garantia que o projeto faz.
 *
 *   npx supabase start && node scripts/smoke.mjs
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

let failures = 0
const ok = (label) => console.log(`  ✓ ${label}`)
const bad = (label, detail) => {
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}
function check(label, condition, detail) {
  condition ? ok(label) : bad(label, detail)
}

async function newUser(label) {
  const client = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInAnonymously()
  if (error) throw new Error(`${label}: ${error.message}`)
  return { label, client, userId: data.user.id }
}

console.log('\n🃏 Planning Poker — teste de fumaça\n')

/* ---------------------------------------------------------------- sessão --- */
console.log('Autenticação anônima')
const po = await newUser('PO')
const ana = await newUser('Ana')
const bruno = await newUser('Bruno')
const carla = await newUser('Carla')
check('quatro sessões anônimas distintas', new Set([po.userId, ana.userId, bruno.userId, carla.userId]).size === 4)

/* ------------------------------------------------------------- criar sala --- */
console.log('\nCriação da sala')
const { data: roomId, error: createError } = await po.client.rpc('create_room', {
  p_session_name: 'Sprint 42',
  p_host_name: 'Iago (PO)',
  p_stories: [
    { title: 'Tela de login com SSO', link: 'https://jira.local/PP-1', kind: 'both' },
    { title: 'Cache do endpoint de busca', link: null, kind: 'backend' },
  ],
})
check('create_room retorna código', !createError && /^[A-Z0-9]{6}$/.test(roomId ?? ''), createError?.message)

const { data: firstRoom } = await po.client.from('rooms').select('*').eq('id', roomId).single()
check('primeira história é "both" → começa pelo front', firstRoom.current_side === 'frontend')

/* ----------------------------------------------------------------- entrar --- */
console.log('\nEntrada dos participantes')
const joins = await Promise.all([
  ana.client.rpc('join_room', { p_room_id: roomId, p_name: 'Ana', p_role: 'frontend' }),
  bruno.client.rpc('join_room', { p_room_id: roomId, p_name: 'Bruno', p_role: 'backend' }),
  carla.client.rpc('join_room', { p_room_id: roomId, p_name: 'Carla', p_role: 'qa' }),
])
check('três entradas simultâneas sem erro', joins.every((j) => !j.error), joins.find((j) => j.error)?.error?.message)

const anaId = joins[0].data
const brunoId = joins[1].data
const carlaId = joins[2].data

const { count: seatCount } = await po.client
  .from('players')
  .select('*', { count: 'exact', head: true })
  .eq('room_id', roomId)
check('mesa com 4 cadeiras, nenhuma sobrescrita', seatCount === 4, `veio ${seatCount}`)

// Entrar de novo não duplica — é o mesmo JWT.
await ana.client.rpc('join_room', { p_room_id: roomId, p_name: 'Ana Maria', p_role: 'frontend' })
const { count: afterRejoin } = await po.client
  .from('players')
  .select('*', { count: 'exact', head: true })
  .eq('room_id', roomId)
check('reentrar não cria cadeira duplicada', afterRejoin === 4, `veio ${afterRejoin}`)

/* ------------------------------------------------------------------ votos --- */
console.log('\nVotação (cartas na mesa, escondidas)')
const { data: stories } = await po.client.from('stories').select('*').eq('room_id', roomId).order('position')
const story1 = stories[0]

const vote = (user, _playerId, value) =>
  user.client.rpc('cast_vote', {
    p_room_id: roomId,
    p_story_id: story1.id,
    p_side: 'frontend',
    p_round: 1,
    p_value: value,
  })

const votes = await Promise.all([
  vote(ana, anaId, '5'),
  vote(bruno, brunoId, '8'),
  vote(carla, carlaId, '3'),
])
check('três votos registrados', votes.every((v) => !v.error), votes.find((v) => v.error)?.error?.message)

// --- A garantia central ---
const { data: brunoSees } = await bruno.client.from('votes').select('*').eq('room_id', roomId)
check(
  'Bruno só enxerga o próprio voto antes da revelação',
  brunoSees.length === 1 && brunoSees[0].player_id === brunoId,
  `enxergou ${brunoSees.length} voto(s)`,
)

const { data: poSees } = await po.client.from('votes').select('*').eq('room_id', roomId)
check('nem o PO consegue espiar antes da revelação', poSees.length === 0, `enxergou ${poSees.length}`)

const { data: seats } = await po.client.from('players').select('id, has_voted').eq('room_id', roomId)
check(
  'mas o PO sabe QUEM já votou (3 de 4 cadeiras acesas)',
  seats.filter((s) => s.has_voted).length === 3,
  `${seats.filter((s) => s.has_voted).length} acesas`,
)

const { error: directVote } = await ana.client.from('votes').insert({
  room_id: roomId, story_id: story1.id, player_id: anaId, side: 'frontend', round: 1, value: '0',
})
check('escrita direta na tabela de votos é bloqueada', Boolean(directVote))

// Alguém de fora da sala não vê nada.
const intruso = await newUser('Intruso')
const { data: intrusoSees } = await intruso.client.from('votes').select('*').eq('room_id', roomId)
check('quem não está na sala não vê voto nenhum', intrusoSees.length === 0)

const { error: intrusoWrite } = await intruso.client.rpc('reveal_round', { p_room_id: roomId })
check('quem não está na sala não consegue revelar', Boolean(intrusoWrite))

const { error: anaReveal } = await ana.client.rpc('reveal_round', { p_room_id: roomId })
check('participante comum não consegue revelar', Boolean(anaReveal))

/* -------------------------------------------------------------- revelação --- */
console.log('\nRevelação')
const { error: revealError } = await po.client.rpc('reveal_round', { p_room_id: roomId })
check('PO revela', !revealError, revealError?.message)

const { data: afterReveal } = await bruno.client.from('votes').select('*').eq('room_id', roomId)
check('depois de revelar, todos os votos aparecem', afterReveal.length === 3, `veio ${afterReveal.length}`)

const { error: lateVote } = await vote(ana, anaId, '13')
check('não dá para votar depois de revelado', Boolean(lateVote))

/* ------------------------------------------------------------- pontuação --- */
console.log('\nFechamento da história (front)')
const { error: unbalanced } = await po.client.rpc('commit_story', {
  p_room_id: roomId,
  p_points: 8,
  p_allocations: [{ player_id: anaId, points: 3, pending: false }],
})
check('divisão que não soma o total é recusada pelo banco', Boolean(unbalanced))

const { error: negative } = await po.client.rpc('commit_story', {
  p_room_id: roomId,
  p_points: 8,
  p_allocations: [
    { player_id: anaId, points: 10, pending: false },
    { player_id: brunoId, points: -2, pending: false },
  ],
})
check('divisão com pontos negativos é recusada', Boolean(negative))

const { error: commitError } = await po.client.rpc('commit_story', {
  p_room_id: roomId,
  p_points: 8,
  p_allocations: [
    { player_id: anaId, points: 5, pending: false },
    { player_id: brunoId, points: 2, pending: false },
    { player_id: carlaId, points: 1, pending: false },
  ],
})
check('commit_story aceita divisão que fecha', !commitError, commitError?.message)

const { data: roomAfter } = await po.client.from('rooms').select('*').eq('id', roomId).single()
check('história "both": avança de front para back, sem trocar de história', roomAfter.current_side === 'backend' && roomAfter.current_story_index === 0)
check('nova rodada aberta e cartas viradas de novo', roomAfter.revealed === false && roomAfter.current_round === 2)

const { data: anaRow } = await po.client.from('players').select('accumulated_points').eq('id', anaId).single()
check('pontos creditados na pessoa', Number(anaRow.accumulated_points) === 5, `veio ${anaRow.accumulated_points}`)

/* ------------------------------------------------- segundo lado + avanço --- */
console.log('\nFechamento do back e avanço de história')
await Promise.all([
  bruno.client.rpc('cast_vote', { p_room_id: roomId, p_story_id: story1.id, p_side: 'backend', p_round: 2, p_value: '13' }),
  ana.client.rpc('cast_vote', { p_room_id: roomId, p_story_id: story1.id, p_side: 'backend', p_round: 2, p_value: '13' }),
])
await po.client.rpc('reveal_round', { p_room_id: roomId })
const { error: backCommit } = await po.client.rpc('commit_story', {
  p_room_id: roomId,
  p_points: 13,
  p_allocations: [
    { player_id: brunoId, points: 10, pending: false },
    { player_id: anaId, points: 3, pending: false },
  ],
})
check('fecha o back', !backCommit, backCommit?.message)

const { data: room2 } = await po.client.from('rooms').select('*').eq('id', roomId).single()
check('agora sim avança para a história 2', room2.current_story_index === 1)
check('história 2 é "somente back" → já começa no back', room2.current_side === 'backend')

const { data: story1After } = await po.client.from('stories').select('*').eq('id', story1.id).single()
check('história 1 marcada como encerrada', story1After.ended_at !== null)
check('pontos front e back gravados', Number(story1After.frontend_points) === 8 && Number(story1After.backend_points) === 13)

/* -------------------------------------------------------- Ag. Definição --- */
console.log('\nHistória sem definição')
const story2 = stories[1]
await bruno.client.rpc('cast_vote', { p_room_id: roomId, p_story_id: story2.id, p_side: 'backend', p_round: room2.current_round, p_value: 'Ag. Definição' })
await po.client.rpc('reveal_round', { p_room_id: roomId })
const { error: pendingError } = await po.client.rpc('commit_story', {
  p_room_id: roomId,
  p_points: null,
  p_allocations: [{ player_id: brunoId, points: 0, pending: true }],
})
check('aceita "Ag. Definição" com responsável e sem pontos', !pendingError, pendingError?.message)

const { data: story2After } = await po.client.from('stories').select('*').eq('id', story2.id).single()
check('marca backend_pending na história', story2After.backend_pending === true)

const { data: finalRoom } = await po.client.from('rooms').select('*').eq('id', roomId).single()
check('sprint terminou (índice passou do fim)', finalRoom.current_story_index >= 2)

/* ---------------------------------------------------- retomar e corrigir --- */
console.log('\nRetomar sprint e corrigir pontos')
const { error: addError } = await po.client.rpc('add_story', {
  p_room_id: roomId,
  p_title: 'Ajuste de contraste no tema escuro',
  p_link: null,
  p_kind: 'frontend',
})
check('adicionar história retoma a sprint', !addError, addError?.message)

const { data: resumed } = await po.client.from('rooms').select('*').eq('id', roomId).single()
check('volta a apontar para a nova história', resumed.current_story_index === 2 && resumed.current_side === 'frontend')

const { data: beforeAdjust } = await po.client.from('players').select('accumulated_points').eq('id', anaId).single()
await po.client.rpc('adjust_participant_points', {
  p_story_id: story1.id,
  p_player_id: anaId,
  p_side: 'frontend',
  p_points: 7,
})
const { data: afterAdjust } = await po.client.from('players').select('accumulated_points').eq('id', anaId).single()
check(
  'correção move o acumulado pelo mesmo delta',
  Number(afterAdjust.accumulated_points) - Number(beforeAdjust.accumulated_points) === 2,
  `${beforeAdjust.accumulated_points} → ${afterAdjust.accumulated_points}`,
)

const { error: anaAdjust } = await ana.client.rpc('adjust_participant_points', {
  p_story_id: story1.id,
  p_player_id: anaId,
  p_side: 'frontend',
  p_points: 999,
})
check('participante comum não corrige a própria pontuação', Boolean(anaAdjust))

/* ------------------------------------------------------------- encerrar --- */
console.log('\nEncerramento')
const { error: anaEnd } = await ana.client.rpc('end_game', { p_room_id: roomId })
check('participante comum não encerra a sessão', Boolean(anaEnd))

const { error: endError } = await po.client.rpc('end_game', { p_room_id: roomId })
check('PO encerra', !endError, endError?.message)

const { error: joinEnded } = await intruso.client.rpc('join_room', { p_room_id: roomId, p_name: 'Atrasado', p_role: 'qa' })
check('não dá para entrar em sessão encerrada', Boolean(joinEnded))

/* ----------------------------------------------------------------------- */
console.log(
  failures === 0
    ? '\n✅ Tudo passou.\n'
    : `\n❌ ${failures} verificação(ões) falharam.\n`,
)
process.exit(failures === 0 ? 0 : 1)

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

// Carla entrou como QA. Ligamos o voto dela para exercitar o caso mais
// interessante do modelo: vota, aparece na mesa, e mesmo assim não pontua.
await po.client.rpc('set_qa_voting', { p_room_id: roomId, p_enabled: true })

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
    { player_id: brunoId, points: 3, pending: false },
  ],
})
check('commit_story aceita divisão que fecha', !commitError, commitError?.message)

const { error: carlaShare } = await po.client.rpc('commit_story', {
  p_room_id: roomId,
  p_points: 8,
  p_allocations: [
    { player_id: anaId, points: 4, pending: false },
    { player_id: carlaId, points: 4, pending: false },
  ],
})
check('a QA vota mas continua fora da divisão de pontos', Boolean(carlaShare))

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

/* --------------------------------------------------- gestão das histórias --- */
console.log('\nEdição, reordenação e exclusão de histórias')

// Sala nova, limpa, para exercitar a fila sem herdar o estado acima.
const { data: roomB } = await po.client.rpc('create_room', {
  p_session_name: 'Sprint da fila',
  p_host_name: 'Iago (PO)',
  p_stories: [
    { title: 'Primeira', link: null, kind: 'frontend' },
    { title: 'Segunda', link: null, kind: 'frontend' },
    { title: 'Terceira', link: null, kind: 'frontend' },
  ],
})
await ana.client.rpc('join_room', { p_room_id: roomB, p_name: 'Ana', p_role: 'frontend' })
await bruno.client.rpc('join_room', { p_room_id: roomB, p_name: 'Bruno', p_role: 'backend' })

const listB = async () => {
  const { data } = await po.client.from('stories').select('*').eq('room_id', roomB).order('position')
  return data
}

let sB = await listB()
check('três histórias em ordem', sB.map((x) => x.title).join() === 'Primeira,Segunda,Terceira')

// --- editar ---
const { error: editError } = await po.client.rpc('update_story', {
  p_story_id: sB[1].id,
  p_title: 'Segunda (revisada)',
  p_link: 'https://jira.local/PP-9',
  p_kind: 'both',
})
check('PO edita título, link e tipo', !editError, editError?.message)

sB = await listB()
check('edição gravada', sB[1].title === 'Segunda (revisada)' && sB[1].kind === 'both')

const { error: anaEdit } = await ana.client.rpc('update_story', {
  p_story_id: sB[1].id, p_title: 'hack', p_link: null, p_kind: 'frontend',
})
check('participante comum não edita história', Boolean(anaEdit))

const { error: emptyTitle } = await po.client.rpc('update_story', {
  p_story_id: sB[1].id, p_title: '   ', p_link: null, p_kind: 'frontend',
})
check('título vazio é recusado', Boolean(emptyTitle))

// --- reordenar ---
const { error: reorderError } = await po.client.rpc('reorder_stories', {
  p_room_id: roomB,
  p_story_ids: [sB[2].id, sB[0].id, sB[1].id],
})
check('PO reordena a fila', !reorderError, reorderError?.message)

sB = await listB()
check(
  'nova ordem gravada',
  sB.map((x) => x.title).join() === 'Terceira,Primeira,Segunda (revisada)',
  sB.map((x) => x.title).join(),
)

const { data: roomBState } = await po.client.from('rooms').select('*').eq('id', roomB).single()
check('trocar a história em votação abre rodada nova', roomBState.current_round === 2 && !roomBState.revealed)

const { error: shortOrder } = await po.client.rpc('reorder_stories', {
  p_room_id: roomB,
  p_story_ids: [sB[0].id],
})
check('ordem incompleta é recusada', Boolean(shortOrder))

const { error: anaReorder } = await ana.client.rpc('reorder_stories', {
  p_room_id: roomB,
  p_story_ids: sB.map((x) => x.id),
})
check('participante comum não reordena', Boolean(anaReorder))

// --- excluir uma pendente ---
const { error: delError } = await po.client.rpc('delete_story', { p_story_id: sB[2].id })
check('PO exclui uma história pendente', !delError, delError?.message)

sB = await listB()
check('sobraram duas, numeradas sem buraco', sB.length === 2 && sB[0].position === 0 && sB[1].position === 1)

// --- excluir uma já pontuada devolve os pontos ---
const { data: anaB } = await po.client.from('players').select('id').eq('room_id', roomB).eq('name', 'Ana').single()
const { data: brunoB } = await po.client.from('players').select('id').eq('room_id', roomB).eq('name', 'Bruno').single()

const { data: roomB2 } = await po.client.from('rooms').select('*').eq('id', roomB).single()
await ana.client.rpc('cast_vote', {
  p_room_id: roomB, p_story_id: sB[roomB2.current_story_index].id,
  p_side: roomB2.current_side, p_round: roomB2.current_round, p_value: '5',
})
await po.client.rpc('reveal_round', { p_room_id: roomB })
await po.client.rpc('commit_story', {
  p_room_id: roomB,
  p_points: 5,
  p_allocations: [
    { player_id: anaB.id, points: 3, pending: false },
    { player_id: brunoB.id, points: 2, pending: false },
  ],
})

const { data: anaBefore } = await po.client.from('players').select('accumulated_points').eq('id', anaB.id).single()
check('pontos creditados antes da exclusão', Number(anaBefore.accumulated_points) === 3)

sB = await listB()
const scored = sB.find((x) => x.frontend_points !== null || x.backend_points !== null)
const { error: delScored } = await po.client.rpc('delete_story', { p_story_id: scored.id })
check('PO exclui uma história já pontuada', !delScored, delScored?.message)

const { data: anaAfterDelete } = await po.client.from('players').select('accumulated_points').eq('id', anaB.id).single()
check(
  'os pontos da história excluída voltam para quem os recebeu',
  Number(anaAfterDelete.accumulated_points) === 0,
  `sobrou ${anaAfterDelete.accumulated_points}`,
)

const { error: lastOne } = await po.client.rpc('delete_story', { p_story_id: (await listB())[0].id })
check('não dá para deixar a sprint sem nenhuma história', Boolean(lastOne))

const { error: anaDelete } = await ana.client.rpc('delete_story', { p_story_id: (await listB())[0].id })
check('participante comum não exclui história', Boolean(anaDelete))

/* --------------------------------------------------------------- baralhos --- */
console.log('\nBaralhos de pontuação')

const TSHIRT = [
  { label: 'PP', value: 1 }, { label: 'P', value: 2 }, { label: 'M', value: 3 },
  { label: 'G', value: 5 }, { label: 'GG', value: 8 }, { label: 'XGG', value: 13 },
  { label: '?', value: null }, { label: '☕', value: null }, { label: 'Ag. Definição', value: null },
]

const { data: roomC, error: deckError } = await po.client.rpc('create_room', {
  p_session_name: 'Sprint de camisetas',
  p_host_name: 'Iago (PO)',
  p_stories: [{ title: 'História tamanho M', link: null, kind: 'frontend' }],
  p_deck_id: 'tshirt',
  p_point_scale: TSHIRT,
})
check('cria sala com baralho de camisetas', !deckError, deckError?.message)

const { data: roomCRow } = await po.client.from('rooms').select('*').eq('id', roomC).single()
check('baralho gravado na sala', roomCRow.deck_id === 'tshirt' && roomCRow.point_scale.length === 9)
check('carta "M" vale 3 na conta', roomCRow.point_scale.find((c) => c.label === 'M').value === 3)

// A API não pode aceitar carta fora do baralho da sala.
await ana.client.rpc('join_room', { p_room_id: roomC, p_name: 'Ana', p_role: 'frontend' })
const { data: storiesC } = await po.client.from('stories').select('*').eq('room_id', roomC)
const { error: foreignCard } = await ana.client.rpc('cast_vote', {
  p_room_id: roomC, p_story_id: storiesC[0].id, p_side: 'frontend', p_round: 1, p_value: '13',
})
check('carta fora do baralho da sala é recusada', Boolean(foreignCard))

const { error: validCard } = await ana.client.rpc('cast_vote', {
  p_room_id: roomC, p_story_id: storiesC[0].id, p_side: 'frontend', p_round: 1, p_value: 'M',
})
check('carta do baralho da sala é aceita', !validCard, validCard?.message)

const { data: roomD } = await po.client.rpc('create_room', {
  p_session_name: 'Sprint padrão',
  p_host_name: 'Iago (PO)',
  p_stories: [{ title: 'Qualquer', link: null, kind: 'frontend' }],
})
const { data: roomDRow } = await po.client.from('rooms').select('*').eq('id', roomD).single()
check('sem baralho informado, usa Fibonacci', roomDRow.deck_id === 'fibonacci')
check(
  'Fibonacci tem a carta de meio ponto',
  roomDRow.point_scale.some((c) => c.value === 0.5),
)

/* ------------------------------------------------------------ capacidade --- */
console.log('\nCapacidade do time')

const HOLIDAYS = [
  { date: '2026-04-21', name: 'Tiradentes' },
  { date: '2026-05-01', name: 'Dia do Trabalho' },
]

const { data: roomE, error: capRoomError } = await po.client.rpc('create_room', {
  p_session_name: 'Sprint com capacidade',
  p_host_name: 'Iago (PO)',
  p_stories: [{ title: 'Alguma coisa', link: null, kind: 'frontend' }],
  p_sprint_start: '2026-04-20',
  p_sprint_days: 15,
  p_holidays: HOLIDAYS,
})
check('cria sala com janela de sprint', !capRoomError, capRoomError?.message)

const { data: roomERow } = await po.client.from('rooms').select('*').eq('id', roomE).single()
check(
  'janela gravada (início, duração e feriados)',
  roomERow.sprint_start === '2026-04-20' && roomERow.sprint_days === 15 && roomERow.holidays.length === 2,
  `${roomERow.sprint_start} / ${roomERow.sprint_days} / ${roomERow.holidays.length}`,
)

const anaE = await ana.client.rpc('join_room', { p_room_id: roomE, p_name: 'Ana', p_role: 'frontend' })
const brunoE = await bruno.client.rpc('join_room', { p_room_id: roomE, p_name: 'Bruno', p_role: 'backend' })

const { error: capError } = await po.client.rpc('set_team_capacity', {
  p_room_id: roomE,
  p_entries: [
    { player_id: anaE.data, capacity_points: 12, days_off: 2 },
    { player_id: brunoE.data, capacity_points: 8, days_off: 0 },
  ],
})
check('PO define a capacidade de cada pessoa', !capError, capError?.message)

const { data: playersE } = await po.client.from('players').select('*').eq('room_id', roomE)
const anaCapRow = playersE.find((p) => p.name === 'Ana')
check(
  'capacidade e ausências gravadas',
  Number(anaCapRow.capacity_points) === 12 && anaCapRow.days_off === 2,
  `${anaCapRow.capacity_points} pts / ${anaCapRow.days_off} dias`,
)

// Editável a qualquer momento.
await po.client.rpc('set_team_capacity', {
  p_room_id: roomE,
  p_entries: [{ player_id: anaE.data, capacity_points: 15, days_off: 0 }],
})
const { data: anaUpdated } = await po.client.from('players').select('*').eq('id', anaE.data).single()
check('capacidade continua editável depois', Number(anaUpdated.capacity_points) === 15)

const { error: anaCapacity } = await ana.client.rpc('set_team_capacity', {
  p_room_id: roomE,
  p_entries: [{ player_id: anaE.data, capacity_points: 999, days_off: 0 }],
})
check('participante comum não define capacidade', Boolean(anaCapacity))

const { error: negativeCap } = await po.client.rpc('set_team_capacity', {
  p_room_id: roomE,
  p_entries: [{ player_id: anaE.data, capacity_points: -5, days_off: 0 }],
})
check('capacidade negativa é recusada', Boolean(negativeCap))

// Uma pessoa de outra sala não pode ser afetada daqui.
const { data: anaRoomB } = await po.client.from('players').select('id, capacity_points').eq('room_id', roomB).eq('name', 'Ana').maybeSingle()
if (anaRoomB) {
  await po.client.rpc('set_team_capacity', {
    p_room_id: roomE,
    p_entries: [{ player_id: anaRoomB.id, capacity_points: 99, days_off: 0 }],
  })
  const { data: untouched } = await po.client.from('players').select('capacity_points').eq('id', anaRoomB.id).single()
  check(
    'não dá para mexer na capacidade de quem está em outra sala',
    Number(untouched.capacity_points) !== 99,
    `virou ${untouched.capacity_points}`,
  )
}

const { error: windowError } = await po.client.rpc('set_sprint_window', {
  p_room_id: roomE, p_start: '2026-06-01', p_days: 7, p_holidays: [],
})
check('PO ajusta a janela durante a sessão', !windowError, windowError?.message)

const { error: anaWindow } = await ana.client.rpc('set_sprint_window', {
  p_room_id: roomE, p_start: '2026-06-01', p_days: 7, p_holidays: [],
})
check('participante comum não ajusta a janela', Boolean(anaWindow))

const { error: longSprint } = await po.client.rpc('set_sprint_window', {
  p_room_id: roomE, p_start: '2026-06-01', p_days: 200, p_holidays: [],
})
check('sprint absurdamente longa é recusada', Boolean(longSprint))

/* ------------------------------------------------------------------- QA --- */
console.log('\nQA na cerimônia')

const { data: roomQ } = await po.client.rpc('create_room', {
  p_session_name: 'Sprint com QA',
  p_host_name: 'Iago (PO)',
  p_stories: [{ title: 'História qualquer', link: null, kind: 'frontend' }],
})

const devQ = await ana.client.rpc('join_room', { p_room_id: roomQ, p_name: 'Ana', p_role: 'frontend' })
const qaQ = await carla.client.rpc('join_room', { p_room_id: roomQ, p_name: 'Carla', p_role: 'qa' })

const { data: roomQRow } = await po.client.from('rooms').select('qa_votes').eq('id', roomQ).single()
check('por padrão a QA não vota', roomQRow.qa_votes === false)

const { data: storiesQ } = await po.client.from('stories').select('*').eq('room_id', roomQ)
const voteAs = (client, value) =>
  client.rpc('cast_vote', {
    p_room_id: roomQ, p_story_id: storiesQ[0].id, p_side: 'frontend', p_round: 1, p_value: value,
  })

const { error: qaBlocked } = await voteAs(carla.client, '5')
check('com a QA desligada, o voto dela é recusado pelo banco', Boolean(qaBlocked))

const { error: poBlocked } = await voteAs(po.client, '5')
check('o PO nunca vota', Boolean(poBlocked))

const { error: devVote } = await voteAs(ana.client, '5')
check('quem é dono de entrega vota normalmente', !devVote, devVote?.message)

// --- ligar a QA ---
const { error: carlaToggle } = await carla.client.rpc('set_qa_voting', {
  p_room_id: roomQ, p_enabled: true,
})
check('a própria QA não liga o próprio voto', Boolean(carlaToggle))

const { error: toggleError } = await po.client.rpc('set_qa_voting', {
  p_room_id: roomQ, p_enabled: true,
})
check('PO liga o voto da QA', !toggleError, toggleError?.message)

const { error: qaAllowed } = await voteAs(carla.client, '8')
check('com a QA ligada, ela vota', !qaAllowed, qaAllowed?.message)

// --- desligar no meio da rodada limpa o voto dela ---
await po.client.rpc('set_qa_voting', { p_room_id: roomQ, p_enabled: false })
const { data: qaSeat } = await po.client.from('players').select('has_voted').eq('id', qaQ.data).single()
check('desligar limpa o voto e apaga a carta da QA', qaSeat.has_voted === false)

const { data: roundVotes } = await po.client.from('players').select('id, has_voted').eq('room_id', roomQ)
check(
  'o voto de quem pontua continua de pé',
  roundVotes.find((p) => p.id === devQ.data).has_voted === true,
)

// --- pontuação nunca vai para a QA ---
await po.client.rpc('reveal_round', { p_room_id: roomQ })
const { error: qaPoints } = await po.client.rpc('commit_story', {
  p_room_id: roomQ,
  p_points: 5,
  p_allocations: [
    { player_id: devQ.data, points: 3, pending: false },
    { player_id: qaQ.data, points: 2, pending: false },
  ],
})
check('não dá para distribuir pontos para a QA', Boolean(qaPoints))

const { data: poSeat } = await po.client.from('players').select('id').eq('room_id', roomQ).eq('role', 'po').single()
const { error: poPoints } = await po.client.rpc('commit_story', {
  p_room_id: roomQ,
  p_points: 5,
  p_allocations: [{ player_id: poSeat.id, points: 5, pending: false }],
})
check('nem para o PO', Boolean(poPoints))

const { error: okPoints } = await po.client.rpc('commit_story', {
  p_room_id: roomQ,
  p_points: 5,
  p_allocations: [{ player_id: devQ.data, points: 5, pending: false }],
})
check('a divisão entre quem pontua passa', !okPoints, okPoints?.message)

// --- capacidade também não ---
await po.client.rpc('set_team_capacity', {
  p_room_id: roomQ,
  p_entries: [{ player_id: qaQ.data, capacity_points: 10, days_off: 0 }],
})
const { data: qaCapacity } = await po.client.from('players').select('capacity_points').eq('id', qaQ.data).single()
check(
  'a QA não recebe capacidade',
  Number(qaCapacity.capacity_points) === 0,
  `ficou com ${qaCapacity.capacity_points}`,
)

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

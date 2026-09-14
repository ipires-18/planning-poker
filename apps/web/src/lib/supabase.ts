import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Copie .env.example para .env.local e preencha.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    // Presença e votos são rajadas curtas; esse teto evita throttle do servidor
    // em salas grandes sem atrasar a mesa.
    params: { eventsPerSecond: 20 },
  },
})

/**
 * Toda pessoa recebe um JWT anônimo. Não há tela de login: o identificador
 * existe para que o RLS consiga dizer "este voto é seu" — é o que mantém as
 * cartas escondidas até a revelação sem depender do cliente se comportar.
 */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession()

  if (data.session) {
    // O token guardado pode apontar para um usuário que não existe mais — conta
    // anônima expirada, ou banco recriado. `getUser` pergunta ao servidor; sem
    // essa checagem o app carrega e só falha na primeira escrita, com um erro
    // de chave estrangeira que não diz nada a quem está usando.
    const { error } = await supabase.auth.getUser()
    if (!error) return data.session
    await supabase.auth.signOut({ scope: 'local' })
  }

  const { data: signedIn, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signedIn.session
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

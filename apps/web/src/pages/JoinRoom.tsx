import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Note, Spinner } from '@pp/ds/atoms'
import { Field } from '@pp/ds/molecules'
import { cx } from '@/lib/cx'
import { joinRoom } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABEL, type PlayerRole } from '@/types'

/**
 * As cadeiras que alguém escolhe ao entrar. O PO não está aqui porque quem cria
 * a sessão já senta como PO — ninguém "vira" PO entrando depois.
 */
const PICKABLE: PlayerRole[] = [
  'frontend',
  'backend',
  'tech_lead',
  'qa',
  'designer',
  'product',
]

export default function JoinRoom() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const { userId, ready } = useAuth()

  const [sessionName, setSessionName] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<PlayerRole>('frontend')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!ready || !userId) return
    let cancelled = false

    ;(async () => {
      const { data: room } = await supabase
        .from('rooms')
        .select('session_name, ended, to_continue')
        .eq('id', roomId)
        .maybeSingle()

      if (cancelled) return
      if (!room) {
        setError('Sala não encontrada. Confira o link.')
        setChecking(false)
        return
      }
      // Pausada ainda recebe gente: a planning volta em outro dia, e quem chega
      // agora já fica na sala esperando o start.
      if (room.ended && !room.to_continue) {
        setError('Esta planning já foi finalizada.')
        setChecking(false)
        return
      }
      setSessionName(room.session_name)
      setPaused(room.to_continue)

      // Já tem cadeira nesta sala? Vai direto para a mesa. É o que faz
      // recarregar a página não pedir seu nome de novo.
      const { data: seat } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return
      if (seat) navigate(`/room/${roomId}`, { replace: true })
      else setChecking(false)
    })()

    return () => {
      cancelled = true
    }
  }, [ready, userId, roomId, navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Diga como o time te chama')

    setJoining(true)
    setError('')
    try {
      await joinRoom(roomId, name.trim(), role)
      navigate(`/room/${roomId}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu para entrar')
      setJoining(false)
    }
  }

  if (!ready || checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner label="Procurando a sala..." />
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="card-surface animate-pop-in w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <span className="font-mono text-xs font-black uppercase tracking-[0.3em] text-ink-subtle">
            {roomId}
          </span>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {sessionName ?? 'Entrar na sessão'}
          </h1>
          {sessionName && (
            <p className="mt-2 text-sm text-ink-muted">
              {paused
                ? 'Esta planning está pausada. Entre agora e espere o start.'
                : 'O time já está esperando.'}
            </p>
          )}
        </div>

        {sessionName ? (
          <form onSubmit={submit} className="space-y-6">
            <Field label="Seu nome">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como o time te chama"
                maxLength={40}
                autoFocus
              />
            </Field>

            <fieldset>
              <legend className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-ink-muted">
                Seu papel na sprint
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {PICKABLE.map((option) => {
                  const active = role === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      aria-pressed={active}
                      data-role={option}
                      className={cx(
                        'rounded-2xl border-2 p-4 text-left transition-all duration-300',
                        '[transition-timing-function:var(--ease-spring)]',
                        active
                          ? 'ds-accent-gradient scale-[1.03] border-transparent text-white shadow-[0_14px_30px_-14px_var(--ds-accent)]'
                          : 'border-hairline bg-sunken text-ink-muted hover:border-brand-400/50',
                      )}
                    >
                      <span className="block text-sm font-black">{ROLE_LABEL[option]}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
                Tech Lead também revela cartas e fecha a pontuação. QA, Designer e
                Produto acompanham a cerimônia sem receber story points — se cada um
                vota ou não é o PO ou o Tech Lead quem decide. Produto é a cadeira de
                quem vem do negócio nesta sprint.
              </p>
            </fieldset>

            <Note>{error}</Note>

            <Button type="submit" variant="joy-mirror" size="lg" isDisabled={joining} className="w-full">
              {joining ? 'Puxando a cadeira...' : 'Sentar à mesa'}
            </Button>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            <Note>{error}</Note>
            <Button variant="white" onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

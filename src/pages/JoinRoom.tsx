import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, ErrorNote, Field, Input, Spinner } from '@/components/ui'
import { cx } from '@/lib/cx'
import { joinRoom } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_ACCENT, ROLE_LABEL, type PlayerRole } from '@/types'

const PICKABLE: PlayerRole[] = ['frontend', 'backend', 'tech_lead', 'qa']

export default function JoinRoom() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const { userId, ready } = useAuth()

  const [sessionName, setSessionName] = useState<string | null>(null)
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
        .select('session_name, ended')
        .eq('id', roomId)
        .maybeSingle()

      if (cancelled) return
      if (!room) {
        setError('Sala não encontrada. Confira o link.')
        setChecking(false)
        return
      }
      if (room.ended) {
        setError('Esta sessão já foi encerrada.')
        setChecking(false)
        return
      }
      setSessionName(room.session_name)

      // Já tem cadeira nesta sala? Vai direto para a mesa. É o que faz
      // recarregar a página não pedir seu nome de novo.
      const { data: seat } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle()

      if (cancelled) return
      if (seat) navigate(`/sala/${roomId}`, { replace: true })
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
      navigate(`/sala/${roomId}`, { replace: true })
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
          {sessionName && <p className="mt-2 text-sm text-ink-muted">O time já está esperando.</p>}
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
                      className={cx(
                        'cursor-pointer rounded-2xl border-2 p-4 text-left transition-all duration-300',
                        '[transition-timing-function:var(--ease-spring)]',
                        active
                          ? 'scale-[1.03] border-transparent text-white'
                          : 'border-hairline bg-[var(--surface-sunken)] text-ink-muted hover:border-brand-400/50',
                      )}
                      style={
                        active
                          ? {
                              background: `linear-gradient(140deg, ${ROLE_ACCENT[option]}, color-mix(in oklab, ${ROLE_ACCENT[option]} 55%, var(--color-brand-600)))`,
                              boxShadow: `0 14px 30px -14px ${ROLE_ACCENT[option]}`,
                            }
                          : undefined
                      }
                    >
                      <span className="block text-sm font-black">{ROLE_LABEL[option]}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
                Tech Lead também revela cartas e fecha a pontuação. A QA acompanha a
                cerimônia sem receber story points — se ela vota ou não é o PO ou o
                Tech Lead quem decide.
              </p>
            </fieldset>

            <ErrorNote>{error}</ErrorNote>

            <Button type="submit" variant="joy" size="lg" disabled={joining} className="w-full">
              {joining ? 'Puxando a cadeira...' : 'Sentar à mesa'}
            </Button>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            <ErrorNote>{error}</ErrorNote>
            <Button variant="secondary" onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

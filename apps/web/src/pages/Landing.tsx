import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import { roomExists } from '@/lib/api'

/**
 * Cartas decorativas em leque atrás do título.
 *
 * A cor sai dos papéis do time, e não de uma paleta à parte: quem chega já vê
 * as cores que vai encontrar na mesa. `spread` e `tilt` são classes porque os
 * cinco valores são fixos; fossem inline, o Tailwind não teria o que gerar.
 */
const FAN = [
  { value: '3', role: 'frontend', tilt: '-rotate-[18deg]', spread: '-translate-x-[calc(50%+117px)]', delay: 'delay-0' },
  { value: '5', role: 'backend', tilt: '-rotate-[9deg]', spread: '-translate-x-[calc(50%+58px)]', delay: 'delay-100' },
  { value: '8', role: 'tech_lead', tilt: 'rotate-0', spread: '-translate-x-1/2', delay: 'delay-200' },
  { value: '13', role: 'qa', tilt: 'rotate-[9deg]', spread: '-translate-x-[calc(50%-58px)]', delay: 'delay-300' },
  { value: '21', role: 'po', tilt: 'rotate-[18deg]', spread: '-translate-x-[calc(50%-117px)]', delay: 'delay-400' },
] as const

export default function Landing() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean.length !== 6) {
      setError('O código tem 6 caracteres')
      return
    }
    setChecking(true)
    setError('')
    if (await roomExists(clean)) {
      navigate(`/join/${clean}`)
    } else {
      setError('Não achamos essa sala. Confira o código.')
      setChecking(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        {/* Leque de cartas. O posicionamento fica no wrapper porque a animação
            de entrada anima `transform` e sobrescreveria a rotação. */}
        <div className="relative mx-auto mb-12 h-36 w-full" aria-hidden>
          {FAN.map((card) => (
            <div
              key={card.value}
              data-role={card.role}
              className={cx('absolute left-1/2 top-0', card.spread, card.tilt)}
            >
              <div
                className={cx(
                  'animate-pop-in flex h-32 w-22 items-center justify-center rounded-[1.1rem]',
                  'text-3xl font-black text-white',
                  'bg-[linear-gradient(150deg,var(--ds-accent),color-mix(in_oklab,var(--ds-accent)_50%,var(--color-brand-700)))]',
                  'shadow-[0_18px_38px_-14px_var(--ds-accent)]',
                  card.delay,
                )}
              >
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
          <span className="ds-text-gradient">Planning</span>
          <br />
          <span className="text-ink">Poker</span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-lg text-ink-muted">
          Estime a sprint com o time inteiro na mesma mesa. Sem cadastro, sem planilha,
          e ninguém enxerga a carta de ninguém antes da hora.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Button size="lg" variant="joy" onClick={() => navigate('/new')} className="w-full sm:w-auto">
            Criar uma sessão
          </Button>

          <div className="flex w-full items-center gap-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-ink-subtle">
            <span className="h-px flex-1 bg-hairline" />
            ou entre em uma
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <form onSubmit={join} className="flex w-full gap-2">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().slice(0, 6))
                setError('')
              }}
              placeholder="CÓDIGO"
              aria-label="Código da sala"
              autoComplete="off"
              spellCheck={false}
              size="lg"
              className={cx(
                'text-center font-mono text-title-sm font-black uppercase tracking-[0.3em]',
                error && 'border-coral',
              )}
            />
            <Button type="submit" variant="white" size="lg" isDisabled={checking}>
              {checking ? '...' : 'Entrar'}
            </Button>
          </form>

          {error && <p className="text-sm font-bold text-coral">{error}</p>}
        </div>
      </div>
    </main>
  )
}

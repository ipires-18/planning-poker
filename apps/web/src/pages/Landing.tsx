import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { cx } from '@/lib/cx'
import { roomExists } from '@/lib/api'

/** Cartas decorativas em leque atrás do título. */
const FAN = [
  { value: '3', rotate: -18, x: -150, color: 'var(--color-sky)', delay: '0s' },
  { value: '5', rotate: -9, x: -75, color: 'var(--color-mint)', delay: '0.1s' },
  { value: '8', rotate: 0, x: 0, color: 'var(--color-brand-500)', delay: '0.2s' },
  { value: '13', rotate: 9, x: 75, color: 'var(--color-punch)', delay: '0.3s' },
  { value: '21', rotate: 18, x: 150, color: 'var(--color-zest)', delay: '0.4s' },
]

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
      navigate(`/room/${clean}`)
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
              className="absolute left-1/2 top-0"
              style={{
                transform: `translateX(calc(-50% + ${card.x * 0.78}px)) rotate(${card.rotate}deg)`,
              }}
            >
              <div
                className="animate-pop-in flex h-32 w-22 items-center justify-center rounded-[1.1rem] text-3xl font-black text-white"
                style={{
                  background: `linear-gradient(150deg, ${card.color}, color-mix(in oklab, ${card.color} 50%, var(--color-brand-700)))`,
                  boxShadow: `0 18px 38px -14px ${card.color}`,
                  animationDelay: card.delay,
                  width: '5.5rem',
                }}
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
          <Button size="lg" variant="joy" onClick={() => navigate('/nova')} className="w-full sm:w-auto">
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
              className={cx(
                'text-center font-mono text-2xl font-black tracking-[0.35em] uppercase',
                error && 'border-coral',
              )}
            />
            <Button type="submit" variant="secondary" size="lg" isDisabled={checking}>
              {checking ? '...' : 'Entrar'}
            </Button>
          </form>

          {error && <p className="text-sm font-bold text-coral">{error}</p>}
        </div>

        <p className="mt-14 text-xs font-bold uppercase tracking-[0.18em] text-ink-subtle">
          Tempo real · Votos protegidos no banco · Código aberto
        </p>
      </div>
    </main>
  )
}

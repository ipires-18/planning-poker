import { useEffect, useMemo, useState } from 'react'

/**
 * Comemoração de consenso.
 *
 * Movimento deliberadamente diferente do confete de fim de sprint: aquele cai,
 * este explode do centro para fora. Se os dois fossem iguais, o fim da sprint
 * perderia o peso de ser o momento maior.
 */

const CHEERS = [
  'Todo mundo no mesmo número!',
  'Consenso de primeira!',
  'O time leu a mesma história!',
  'Nem precisou discutir!',
  'Alinhadíssimos!',
]

const SPARKS = ['✦', '✧', '★', '◆', '●']

const COLORS = [
  'var(--color-brand-400)',
  'var(--color-punch)',
  'var(--color-zest)',
  'var(--color-mint)',
  'var(--color-sky)',
  'var(--color-grape)',
]

interface Props {
  /** O rótulo da carta em que o time cravou. */
  value: string
  /** Quantas pessoas votaram — vira o tamanho da festa. */
  voters: number
  onDone?: () => void
}

export function ConsensusBurst({ value, voters, onDone }: Props) {
  const [visible, setVisible] = useState(true)

  // Time maior, festa maior — mas com teto, senão vira ruído na tela.
  const particleCount = Math.min(42, 14 + voters * 4)

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }, (_, i) => {
        const angle = (i / particleCount) * 360 + Math.random() * 12
        const distance = 140 + Math.random() * 220
        return {
          id: i,
          glyph: SPARKS[i % SPARKS.length],
          color: COLORS[i % COLORS.length],
          x: Math.cos((angle * Math.PI) / 180) * distance,
          y: Math.sin((angle * Math.PI) / 180) * distance,
          size: 12 + Math.random() * 18,
          delay: Math.random() * 0.18,
          spin: (Math.random() - 0.5) * 540,
        }
      }),
    [particleCount],
  )

  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)], [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, 2600)
    return () => window.clearTimeout(id)
  }, [onDone])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Consenso: todo o time votou {value}</span>

      {/* Clarão que abre e some */}
      <div className="consensus-flash absolute h-[36rem] w-[36rem] rounded-full" aria-hidden />

      {/* Raios girando devagar atrás do número */}
      <div className="consensus-rays absolute h-[30rem] w-[30rem]" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[15rem] w-1 origin-top rounded-full opacity-70"
            style={{
              background: `linear-gradient(to bottom, ${COLORS[i % COLORS.length]}, transparent)`,
              transform: `rotate(${i * 30}deg)`,
            }}
          />
        ))}
      </div>

      {/* Partículas voando para fora */}
      <div className="absolute" aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            className="consensus-spark absolute font-black"
            style={
              {
                color: p.color,
                fontSize: p.size,
                animationDelay: `${p.delay}s`,
                '--dx': `${p.x}px`,
                '--dy': `${p.y}px`,
                '--turn': `${p.spin}deg`,
              } as React.CSSProperties
            }
          >
            {p.glyph}
          </span>
        ))}
      </div>

      {/* O número em que o time cravou */}
      <div className="consensus-core relative flex flex-col items-center gap-3" aria-hidden>
        <span
          className={
            'font-display font-black leading-none text-gradient drop-shadow-2xl ' +
            (value.length > 3 ? 'text-5xl' : 'text-[9rem]')
          }
        >
          {value}
        </span>
        <span className="rounded-full bg-[var(--surface-raised)] px-5 py-2 text-sm font-black uppercase tracking-[0.14em] text-ink shadow-xl">
          {cheer}
        </span>
      </div>
    </div>
  )
}

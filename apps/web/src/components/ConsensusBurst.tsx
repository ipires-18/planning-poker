import { useEffect, useState } from 'react'
import { randomCheer } from '@/lib/cheers'

/**
 * Comemoração de consenso.
 *
 * Movimento deliberadamente diferente do confete de fim de sprint: aquele cai,
 * este explode do centro para fora. Se os dois fossem iguais, o fim da planning
 * perderia o peso de ser o momento maior.
 */

const SPARKS = ['✦', '✧', '★', '◆', '●']

/**
 * A festa usa os papéis do time, não uma paleta paralela: são as mesmas cores
 * das pessoas que acabaram de concordar.
 */
const TONES = ['tech_lead', 'qa', 'po', 'backend', 'frontend'] as const

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

  // useState com inicializador preguiçoso, e não useMemo: o React pode
  // descartar um memo e recalcular, e aí as partículas saltariam de lugar no
  // meio do voo. O initializer do useState roda uma vez e pronto.
  const [particles] = useState(() =>
    Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * 360 + Math.random() * 12
      const distance = 140 + Math.random() * 220
      return {
        id: i,
        glyph: SPARKS[i % SPARKS.length],
        tone: TONES[i % TONES.length],
        x: Math.cos((angle * Math.PI) / 180) * distance,
        y: Math.sin((angle * Math.PI) / 180) * distance,
        size: 12 + Math.random() * 18,
        delay: Math.random() * 0.18,
        spin: (Math.random() - 0.5) * 540,
      }
    }),
  )

  const [cheer] = useState(randomCheer)

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
            data-role={TONES[i % TONES.length]}
            className={
              'absolute left-1/2 top-1/2 h-[15rem] w-1 origin-top rounded-full opacity-70 ' +
              'bg-[linear-gradient(to_bottom,var(--ds-accent),transparent)] ' +
              'rotate-[calc(var(--i)*30deg)]'
            }
            /* O ângulo é o índice vezes 30 graus. A variável entra por style —
               é o valor —, e quem a transforma em rotação é a classe. */
            style={{ '--i': i } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Partículas voando para fora */}
      <div className="absolute" aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            data-role={p.tone}
            className="consensus-spark absolute font-black text-(--ds-accent)"
            /* Cada partícula voa para um ângulo e uma distância sorteados. As
               variáveis alimentam o keyframe; a animação em si é CSS. */
            style={
              {
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
            'font-display font-black leading-none ds-text-gradient drop-shadow-2xl ' +
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
